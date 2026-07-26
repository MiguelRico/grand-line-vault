import type { VercelRequest, VercelResponse } from '@vercel/node';
import { apiError, json, methodNotAllowed } from './_shared/http.js';

const DEFAULT_API_BASE = 'https://one-piece-tcg-prices.p.rapidapi.com';
const forwardedParameters = new Set([
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

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    methodNotAllowed(req, res, ['GET']);
    return;
  }

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
  let path: string;
  if (resource === 'cards') path = '/cards';
  else if (resource === 'episodes') path = '/episodes';
  else if (resource === 'card' && /^\d+$/.test(id)) path = `/cards/${id}`;
  else {
    apiError(res, 400, 'INVALID_CATALOG_RESOURCE', 'La consulta de catálogo no es válida.');
    return;
  }

  const upstreamUrl = new URL(path, process.env.ONE_PIECE_API_BASE_URL ?? DEFAULT_API_BASE);
  for (const [key, rawValue] of Object.entries(req.query)) {
    if (!forwardedParameters.has(key)) continue;
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
