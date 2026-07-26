import type { VercelRequest, VercelResponse } from '@vercel/node';
import { apiError, json, methodNotAllowed } from './_shared/http.js';

const IMAGE_BASE = 'https://en.onepiece-cardgame.com/images/cardlist/card/';
const API_BASE = 'https://one-piece-tcg-prices.p.rapidapi.com';
const SAFE_FILE = /^[A-Za-z0-9_-]+\.png$/;
const SAFE_VERSION = /^\d{1,16}$/;
const FORWARDED = new Set([
  'search',
  'name',
  'card_number',
  'episode_id',
  'sort',
  'per_page',
  'page',
]);

function single(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

async function image(req: VercelRequest, res: VercelResponse): Promise<void> {
  const file = single(req.query.file);
  const version = single(req.query.v);
  if (!SAFE_FILE.test(file) || (version && !SAFE_VERSION.test(version))) {
    apiError(res, 400, 'INVALID_IMAGE', 'La referencia de imagen no es válida.');
    return;
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
      apiError(
        res,
        upstream.status === 404 ? 404 : 502,
        'IMAGE_UNAVAILABLE',
        'Imagen no disponible.',
      );
      return;
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

async function onePiece(req: VercelRequest, res: VercelResponse): Promise<void> {
  const apiKey = process.env.ONE_PIECE_API_KEY?.trim();
  if (!apiKey) {
    apiError(
      res,
      503,
      'CATALOG_PROVIDER_NOT_CONFIGURED',
      'One Piece API todavía no está configurada. Añade ONE_PIECE_API_KEY en el servidor.',
    );
    return;
  }

  const resource = single(req.query.resource);
  const id = single(req.query.id);
  let path = '';
  if (resource === 'cards') path = '/cards';
  else if (resource === 'episodes') path = '/episodes';
  else if (resource === 'card' && /^\d+$/.test(id)) path = `/cards/${id}`;
  if (!path) {
    apiError(res, 400, 'INVALID_CATALOG_RESOURCE', 'La consulta de catálogo no es válida.');
    return;
  }

  const upstreamUrl = new URL(path, process.env.ONE_PIECE_API_BASE_URL ?? API_BASE);
  for (const [key, rawValue] of Object.entries(req.query)) {
    if (!FORWARDED.has(key)) continue;
    const value = single(rawValue);
    if (value) upstreamUrl.searchParams.set(key, value.slice(0, 200));
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: {
        Accept: 'application/json',
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': upstreamUrl.host,
      },
    });
    const payload = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      apiError(
        res,
        upstream.status === 429 ? 429 : 502,
        upstream.status === 429 ? 'CATALOG_RATE_LIMITED' : 'CATALOG_UPSTREAM_ERROR',
        upstream.status === 429
          ? 'One Piece API ha alcanzado temporalmente su límite de consultas.'
          : 'One Piece API no ha podido completar la consulta.',
      );
      return;
    }
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=900');
    json(res, 200, payload);
  } catch {
    apiError(res, 502, 'CATALOG_CONNECTION_ERROR', 'No se pudo conectar con One Piece API.');
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    methodNotAllowed(req, res, ['GET']);
    return;
  }
  const action = single(req.query.action);
  if (action === 'image') return image(req, res);
  if (action === 'one-piece') return onePiece(req, res);
  apiError(res, 400, 'INVALID_CATALOG_ACTION', 'La operación de catálogo no es válida.');
}
