import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldPath, type Query } from 'firebase-admin/firestore';
import { db } from './_shared/firebase.js';
import { apiError, json, methodNotAllowed } from './_shared/http.js';
import { tcggoClient, TcggoError } from './_shared/tcggoClient.js';

const IMAGE_BASE = 'https://en.onepiece-cardgame.com/images/cardlist/card/';
const SAFE_FILE = /^[A-Za-z0-9_-]+\.png$/;
const SAFE_VERSION = /^\d{1,16}$/;
const SAFE_ID = /^\d+$/;
const SORT_FIELDS = {
  code: 'sort.cardNumber',
  name: 'sort.name',
  power: 'sort.power',
  cost: 'sort.cost',
} as const;

function single(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function normalized(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .slice(0, 80);
}

function numberParam(value: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function encodeCursor(value: unknown[]): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function decodeCursor(value: string): unknown[] | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    return Array.isArray(parsed) && parsed.length === 2 ? parsed : null;
  } catch {
    return null;
  }
}

async function image(req: VercelRequest, res: VercelResponse): Promise<void> {
  const file = single(req.query.file);
  const version = single(req.query.v);
  if (!SAFE_FILE.test(file) || (version && !SAFE_VERSION.test(version))) {
    return apiError(res, 400, 'INVALID_IMAGE', 'La referencia de imagen no es válida.');
  }
  try {
    const upstream = await fetch(`${IMAGE_BASE}${file}${version ? `?${version}` : ''}`, {
      headers: { Accept: 'image/png,image/*;q=0.8,*/*;q=0.5', 'User-Agent': 'Grand-Line-Vault/1.0' },
    });
    const contentType = upstream.headers.get('content-type') ?? '';
    if (!upstream.ok || !contentType.toLowerCase().startsWith('image/')) {
      return apiError(res, upstream.status === 404 ? 404 : 502, 'IMAGE_UNAVAILABLE', 'Imagen no disponible.');
    }
    const body = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', String(body.byteLength));
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.status(200).send(body);
  } catch {
    apiError(res, 502, 'IMAGE_PROXY_ERROR', 'No se pudo recuperar la imagen.');
  }
}

async function indexCards(req: VercelRequest, res: VercelResponse): Promise<void> {
  const pageSize = Math.min(60, Math.max(8, numberParam(single(req.query.pageSize)) ?? 24));
  const sort = single(req.query.sort) as keyof typeof SORT_FIELDS;
  const sortField = SORT_FIELDS[sort] ?? SORT_FIELDS.code;
  const direction = single(req.query.direction) === 'desc' ? 'desc' : 'asc';
  let query: Query = db().collection('catalogIndex');

  const search = normalized(single(req.query.query));
  const set = normalized(single(req.query.set));
  const color = normalized(single(req.query.color));
  const type = normalized(single(req.query.type));
  const rarity = normalized(single(req.query.rarity));
  const variant = normalized(single(req.query.variant));
  if (search) query = query.where('searchPrefixes', 'array-contains', search);
  if (set) query = query.where('episode.normalized_code', '==', set);
  if (color) query = query.where(`filterColors.${color}`, '==', true);
  if (type) query = query.where('game.card_type', '==', type);
  if (rarity) query = query.where('rarity_normalized', '==', rarity);
  if (variant) query = query.where(`filterVariants.${variant}`, '==', true);

  const minCost = numberParam(single(req.query.minCost));
  const maxCost = numberParam(single(req.query.maxCost));
  const minPower = numberParam(single(req.query.minPower));
  const maxPower = numberParam(single(req.query.maxPower));
  if (minCost !== undefined || maxCost !== undefined) {
    const lower = Math.max(0, Math.floor(minCost ?? 0));
    const upper = Math.min(20, Math.ceil(maxCost ?? 20));
    query = query.where(`filterCostRanges.${lower}_${upper}`, '==', true);
  }
  if (minPower !== undefined || maxPower !== undefined) {
    const lower = Math.max(0, Math.floor((minPower ?? 0) / 1000) * 1000);
    const upper = Math.min(20_000, Math.ceil((maxPower ?? 20_000) / 1000) * 1000);
    query = query.where(`filterPowerRanges.${lower}_${upper}`, '==', true);
  }

  const cursor = decodeCursor(single(req.query.cursor));
  const total = cursor ? 0 : (await query.count().get()).data().count;
  query = query.orderBy(sortField, direction).orderBy(FieldPath.documentId(), direction);
  if (cursor) query = query.startAfter(...cursor);
  const snapshot = await query.limit(pageSize + 1).get();
  const documents = snapshot.docs.slice(0, pageSize);
  const last = documents[documents.length - 1];
  const hasMore = snapshot.size > pageSize;
  json(res, 200, {
    items: documents.map((document) => document.data()),
    page: 1,
    pageSize,
    total,
    nextCursor:
      hasMore && last ? encodeCursor([last.get(sortField) ?? null, last.id]) : undefined,
    meta: {
      provider: 'FIRESTORE_INDEX',
      fallbackUsed: false,
      cached: false,
      partialData: true,
    },
  });
}

async function indexSets(res: VercelResponse): Promise<void> {
  const snapshot = await db().collection('catalogSets').orderBy('released_at', 'desc').get();
  json(res, 200, snapshot.docs.map((document) => document.data()));
}

async function indexCard(req: VercelRequest, res: VercelResponse): Promise<void> {
  const id = single(req.query.id);
  if (!SAFE_ID.test(id)) {
    return apiError(res, 400, 'INVALID_TCGGO_ID', 'El identificador TCGGO no es válido.');
  }
  const snapshot = await db().collection('catalogIndex').doc(`TCGGO::${id}`).get();
  json(res, 200, snapshot.exists ? snapshot.data() : null);
}

function dataArray(payload: unknown): unknown[] {
  let current = payload;
  for (let depth = 0; depth < 3; depth += 1) {
    if (Array.isArray(current)) return current;
    if (!current || typeof current !== 'object') return [];
    current = (current as { data?: unknown }).data;
  }
  return [];
}

function cardData(payload: unknown): Record<string, unknown> | null {
  let current = payload;
  for (let depth = 0; depth < 3; depth += 1) {
    if (!current || Array.isArray(current) || typeof current !== 'object') return null;
    if ('card_number' in current) return current;
    current = (current as { data?: unknown }).data;
  }
  return null;
}

async function detail(req: VercelRequest, res: VercelResponse): Promise<void> {
  const id = single(req.query.id);
  if (!SAFE_ID.test(id)) {
    return apiError(res, 400, 'INVALID_TCGGO_ID', 'El identificador TCGGO no es válido.');
  }
  const rawCard = cardData(await tcggoClient.card(id));
  if (!rawCard || typeof rawCard.card_number !== 'string') {
    return apiError(res, 502, 'INVALID_TCGGO_RESPONSE', 'TCGGO devolvió un detalle no válido.');
  }
  const variantsPayload = await tcggoClient.cardsByNumber(rawCard.card_number);
  const variants = dataArray(variantsPayload);
  res.setHeader('Cache-Control', 'private, max-age=60');
  json(res, 200, { card: rawCard, variants });
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') return methodNotAllowed(req, res, ['GET']);
  const action = single(req.query.action);
  try {
    if (action === 'image') return await image(req, res);
    if (action === 'index' && single(req.query.resource) === 'cards')
      return await indexCards(req, res);
    if (action === 'index' && single(req.query.resource) === 'sets')
      return await indexSets(res);
    if (action === 'index' && single(req.query.resource) === 'card')
      return await indexCard(req, res);
    if (action === 'detail') return await detail(req, res);
    return apiError(res, 400, 'INVALID_CATALOG_ACTION', 'La operación de catálogo no es válida.');
  } catch (error) {
    if (error instanceof TcggoError) {
      return apiError(res, error.status, `TCGGO_${error.code}`, error.message);
    }
    if (error instanceof Error && error.message === 'FIREBASE_NOT_CONFIGURED') {
      return apiError(res, 503, 'CATALOG_INDEX_NOT_CONFIGURED', 'El índice de catálogo no está configurado.');
    }
    return apiError(
      res,
      500,
      'CATALOG_INDEX_ERROR',
      'No se pudo consultar el índice de catálogo. Comprueba los índices de Firestore.',
    );
  }
}
