import type { VercelRequest, VercelResponse } from '@vercel/node';
import { timingSafeEqual } from 'node:crypto';
import { FieldPath, type Query, type WhereFilterOp } from 'firebase-admin/firestore';
import { db } from './_shared/firebase.js';
import { apiError, json, methodNotAllowed } from './_shared/http.js';
import { tcggoClient, TcggoError } from './_shared/tcggoClient.js';
import { withProxiedCatalogImage } from './_shared/catalogImage.js';
import { buildCatalogIndexEnrichment } from './_shared/catalogEnrichment.js';
import {
  buildCatalogDocuments,
  buildSetDocuments,
  type StaticCatalogCard,
  type StaticCatalogManifest,
  type StaticCatalogSet,
} from './_shared/catalogBootstrap.js';

export const maxDuration = 300;
const IMAGE_BASE = 'https://en.onepiece-cardgame.com/images/cardlist/card/';
const SAFE_FILE = /^[A-Za-z0-9_-]+\.png$/;
const SAFE_VERSION = /^\d{1,16}$/;
const SAFE_TCGGO_ID = /^\d+$/;
const SAFE_CATALOG_ID = /^[A-Za-z0-9:_-]{1,100}$/;
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

function fieldValue(source: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((value, segment) => {
    if (!value || typeof value !== 'object') return undefined;
    return (value as Record<string, unknown>)[segment];
  }, source);
}

function sortableText(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value)
    : '';
}

async function image(req: VercelRequest, res: VercelResponse): Promise<void> {
  const file = single(req.query.file);
  const version = single(req.query.v);
  if (!SAFE_FILE.test(file) || (version && !SAFE_VERSION.test(version))) {
    return apiError(res, 400, 'INVALID_IMAGE', 'La referencia de imagen no es válida.');
  }
  try {
    const upstream = await fetch(`${IMAGE_BASE}${file}${version ? `?${version}` : ''}`, {
      headers: {
        Accept: 'image/png,image/*;q=0.8,*/*;q=0.5',
        'User-Agent': 'Grand-Line-Vault/1.0',
      },
    });
    const contentType = upstream.headers.get('content-type') ?? '';
    if (!upstream.ok || !contentType.toLowerCase().startsWith('image/')) {
      return apiError(
        res,
        upstream.status === 404 ? 404 : 502,
        'IMAGE_UNAVAILABLE',
        'Imagen no disponible.',
      );
    }
    const body = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', String(body.byteLength));
    res.setHeader(
      'Cache-Control',
      'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000',
    );
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
  const collection = db().collection('catalogIndex');

  const search = normalized(single(req.query.query));
  const set = normalized(single(req.query.set));
  const color = normalized(single(req.query.color));
  const type = normalized(single(req.query.type));
  const rarity = normalized(single(req.query.rarity));
  const variant = normalized(single(req.query.variant));
  const filters: { field: string; operator: WhereFilterOp; value: unknown }[] = [];
  if (search) filters.push({ field: 'searchPrefixes', operator: 'array-contains', value: search });
  if (set) filters.push({ field: 'setCodes', operator: 'array-contains', value: set });
  if (type) filters.push({ field: 'game.card_type', operator: '==', value: type });
  if (rarity) filters.push({ field: 'rarity_normalized', operator: '==', value: rarity });
  if (variant) filters.push({ field: 'variantTypes', operator: 'array-contains', value: variant });
  if (color) filters.push({ field: 'game.colors', operator: 'array-contains', value: color });

  const minCost = numberParam(single(req.query.minCost));
  const maxCost = numberParam(single(req.query.maxCost));
  const minPower = numberParam(single(req.query.minPower));
  const maxPower = numberParam(single(req.query.maxPower));
  if (minCost !== undefined) filters.push({ field: 'game.cost', operator: '>=', value: minCost });
  if (maxCost !== undefined) filters.push({ field: 'game.cost', operator: '<=', value: maxCost });
  if (minPower !== undefined)
    filters.push({ field: 'game.power', operator: '>=', value: minPower });
  if (maxPower !== undefined)
    filters.push({ field: 'game.power', operator: '<=', value: maxPower });

  const cursor = decodeCursor(single(req.query.cursor));
  if (filters.length > 0) {
    const [anchor, ...remaining] = filters;
    if (!anchor) throw new Error('CATALOG_FILTER_ERROR');
    const snapshot = await collection.where(anchor.field, anchor.operator, anchor.value).get();
    const matches = snapshot.docs
      .filter((document) =>
        remaining.every((filter) => {
          const value = fieldValue(document.data(), filter.field);
          if (filter.operator === 'array-contains')
            return Array.isArray(value) && value.includes(filter.value);
          if (filter.operator === '>=')
            return typeof value === 'number' && value >= Number(filter.value);
          if (filter.operator === '<=')
            return typeof value === 'number' && value <= Number(filter.value);
          return value === filter.value;
        }),
      )
      .sort((left, right) => {
        const leftValue = fieldValue(left.data(), sortField);
        const rightValue = fieldValue(right.data(), sortField);
        const comparison =
          typeof leftValue === 'number' && typeof rightValue === 'number'
            ? leftValue - rightValue
            : sortableText(leftValue).localeCompare(sortableText(rightValue));
        const stableComparison = comparison || left.id.localeCompare(right.id);
        return direction === 'asc' ? stableComparison : -stableComparison;
      });
    const offset =
      cursor?.[1] === 'OFFSET' && typeof cursor[0] === 'number' ? Math.max(0, cursor[0]) : 0;
    const documents = matches.slice(offset, offset + pageSize);
    const nextOffset = offset + documents.length;
    res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=300');
    return json(res, 200, {
      items: documents.map((document) => withProxiedCatalogImage(document.data())),
      page: Math.floor(offset / pageSize) + 1,
      pageSize,
      total: matches.length,
      nextCursor: nextOffset < matches.length ? encodeCursor([nextOffset, 'OFFSET']) : undefined,
      meta: {
        provider: 'FIRESTORE_INDEX',
        fallbackUsed: false,
        cached: false,
        partialData: true,
      },
    });
  }

  let query: Query = collection
    .orderBy(sortField, direction)
    .orderBy(FieldPath.documentId(), direction);
  const total = cursor ? 0 : (await collection.count().get()).data().count;
  if (cursor) query = query.startAfter(...cursor);
  const snapshot = await query.limit(pageSize + 1).get();
  const documents = snapshot.docs.slice(0, pageSize);
  const last = documents[documents.length - 1];
  const hasMore = snapshot.size > pageSize;
  res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=300');
  json(res, 200, {
    items: documents.map((document) => withProxiedCatalogImage(document.data())),
    page: 1,
    pageSize,
    total,
    nextCursor: hasMore && last ? encodeCursor([last.get(sortField) ?? null, last.id]) : undefined,
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
  json(
    res,
    200,
    snapshot.docs.map((document) => document.data()),
  );
}

async function indexCard(req: VercelRequest, res: VercelResponse): Promise<void> {
  const id = single(req.query.id);
  if (!SAFE_CATALOG_ID.test(id)) {
    return apiError(res, 400, 'INVALID_CATALOG_ID', 'El identificador de catálogo no es válido.');
  }
  const collection = db().collection('catalogIndex');
  const snapshot = await collection.doc(id).get();
  if (snapshot.exists) return json(res, 200, withProxiedCatalogImage(snapshot.data() ?? {}));
  json(res, 200, null);
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
  const cardNumber = single(req.query.cardNumber).trim();
  const catalogId = single(req.query.catalogId);
  const includeRelated = single(req.query.related) !== 'false';
  if (id && !SAFE_TCGGO_ID.test(id)) {
    return apiError(res, 400, 'INVALID_TCGGO_ID', 'El identificador TCGGO no es válido.');
  }
  if (catalogId && !SAFE_CATALOG_ID.test(catalogId)) {
    return apiError(res, 400, 'INVALID_CATALOG_ID', 'El identificador de catálogo no es válido.');
  }
  if (!id && !cardNumber) {
    return apiError(res, 400, 'MISSING_CARD_LOCATOR', 'Falta el identificador o número de carta.');
  }

  let resolvedId = id;
  let variants: unknown[] = [];
  if (!resolvedId) {
    variants = dataArray(await tcggoClient.cardsByNumber(cardNumber));
    const candidate =
      variants.find(
        (entry) =>
          entry && typeof entry === 'object' && !(entry as Record<string, unknown>).version,
      ) ?? variants[0];
    const rawCandidateId =
      candidate && typeof candidate === 'object'
        ? (candidate as Record<string, unknown>).id
        : undefined;
    const candidateId =
      typeof rawCandidateId === 'number' || typeof rawCandidateId === 'string'
        ? String(rawCandidateId)
        : '';
    if (!SAFE_TCGGO_ID.test(candidateId)) {
      return apiError(res, 404, 'TCGGO_CARD_NOT_FOUND', 'TCGGO no encontró la carta.');
    }
    resolvedId = candidateId;
  }

  const rawCard = cardData(await tcggoClient.card(resolvedId));
  if (!rawCard || typeof rawCard.card_number !== 'string') {
    return apiError(res, 502, 'INVALID_TCGGO_RESPONSE', 'TCGGO devolvió un detalle no válido.');
  }
  if (includeRelated && variants.length === 0) {
    variants = dataArray(await tcggoClient.cardsByNumber(rawCard.card_number));
  }
  if (
    includeRelated &&
    catalogId &&
    typeof rawCard.id === 'number' &&
    typeof rawCard.image === 'string' &&
    rawCard.image
  ) {
    const reference = db().collection('catalogIndex').doc(catalogId);
    const snapshot = await reference.get();
    if (snapshot.exists) {
      const fetchedAt = new Date().toISOString();
      await reference.set(buildCatalogIndexEnrichment(rawCard, fetchedAt), { merge: true });
    }
  }
  res.setHeader('Cache-Control', 'private, max-age=60');
  json(res, 200, { card: rawCard, variants: includeRelated ? variants : [] });
}

function secretMatches(actual: string, expected: string): boolean {
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function staticJson<T>(origin: string, path: string): Promise<T> {
  const response = await fetch(new URL(path, origin), {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`STATIC_CATALOG_${response.status}`);
  return (await response.json()) as T;
}

async function bootstrap(req: VercelRequest, res: VercelResponse): Promise<void> {
  const expected = process.env.CATALOG_BOOTSTRAP_TOKEN ?? '';
  const actual = single(req.headers['x-catalog-bootstrap-token']);
  if (!expected)
    return apiError(res, 503, 'BOOTSTRAP_DISABLED', 'El bootstrap manual no está habilitado.');
  if (!actual || !secretMatches(actual, expected))
    return apiError(res, 401, 'INVALID_BOOTSTRAP_TOKEN', 'Token de bootstrap no válido.');

  const hostname = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (!hostname) throw new Error('VERCEL_ORIGIN_NOT_CONFIGURED');
  const origin = hostname.startsWith('http') ? hostname : `https://${hostname}`;
  const manifest = await staticJson<StaticCatalogManifest>(origin, '/catalog/manifest.json');
  const cleanDatabase = single(req.query.clean) === 'true';
  const [cardsPayload, setsPayload] = await Promise.all([
    staticJson<{ cards: StaticCatalogCard[] }>(origin, manifest.cardsUrl),
    staticJson<{ sets: StaticCatalogSet[] }>(origin, manifest.setsUrl),
  ]);
  const catalogDocuments = buildCatalogDocuments(cardsPayload.cards, manifest.generatedAt);
  const setDocuments = buildSetDocuments(setsPayload.sets, manifest.generatedAt);
  const firestore = db();
  const collections = cleanDatabase
    ? await firestore.listCollections()
    : [firestore.collection('catalogIndex'), firestore.collection('catalogSets')];
  await Promise.all(collections.map((collection) => firestore.recursiveDelete(collection)));
  const writer = firestore.bulkWriter();
  const writes: Promise<unknown>[] = [];
  for (const document of catalogDocuments) {
    const reference = firestore.collection('catalogIndex').doc(document.id);
    writes.push(writer.set(reference, document));
  }
  for (const document of setDocuments) {
    const reference = firestore.collection('catalogSets').doc(document.id);
    writes.push(writer.set(reference, document));
  }
  await writer.close();
  await Promise.all(writes);
  json(res, 200, {
    catalogVersion: manifest.catalogVersion,
    cards: catalogDocuments.length,
    sets: setDocuments.length,
    cleanDatabase,
    deletedCollections: collections.map((collection) => collection.id),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const action = single(req.query.action);
  if (req.method === 'POST' && action === 'bootstrap') {
    try {
      return await bootstrap(req, res);
    } catch (error) {
      console.error('Catalog bootstrap failed.', error);
      return apiError(res, 500, 'CATALOG_BOOTSTRAP_ERROR', 'No se pudo crear el índice inicial.');
    }
  }
  if (req.method !== 'GET') return methodNotAllowed(req, res, ['GET', 'POST']);
  try {
    if (action === 'image') return await image(req, res);
    if (action === 'index' && single(req.query.resource) === 'cards')
      return await indexCards(req, res);
    if (action === 'index' && single(req.query.resource) === 'sets') return await indexSets(res);
    if (action === 'index' && single(req.query.resource) === 'card')
      return await indexCard(req, res);
    if (action === 'detail') return await detail(req, res);
    return apiError(res, 400, 'INVALID_CATALOG_ACTION', 'La operación de catálogo no es válida.');
  } catch (error) {
    console.error('Catalog API request failed.', error);
    if (error instanceof TcggoError) {
      return apiError(res, error.status, `TCGGO_${error.code}`, error.message);
    }
    if (error instanceof Error && error.message === 'FIREBASE_NOT_CONFIGURED') {
      return apiError(
        res,
        503,
        'CATALOG_INDEX_NOT_CONFIGURED',
        'El índice de catálogo no está configurado.',
      );
    }
    return apiError(
      res,
      500,
      'CATALOG_INDEX_ERROR',
      'No se pudo consultar el índice de catálogo. Comprueba los índices de Firestore.',
    );
  }
}
