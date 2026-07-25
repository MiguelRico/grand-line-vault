import type { VercelRequest, VercelResponse } from '@vercel/node';
import { apiError, methodNotAllowed } from './_shared/http.js';

const OFFICIAL_IMAGE_BASE = 'https://en.onepiece-cardgame.com/images/cardlist/card/';
const SAFE_IMAGE_FILE = /^[A-Za-z0-9_-]+\.png$/;
const SAFE_IMAGE_VERSION = /^\d{1,16}$/;

function singleQueryValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    methodNotAllowed(req, res, ['GET']);
    return;
  }

  const file = singleQueryValue(req.query.file);
  const version = singleQueryValue(req.query.v);
  if (!SAFE_IMAGE_FILE.test(file) || (version && !SAFE_IMAGE_VERSION.test(version))) {
    apiError(res, 400, 'INVALID_IMAGE', 'La referencia de imagen no es válida.');
    return;
  }

  try {
    const upstreamUrl = `${OFFICIAL_IMAGE_BASE}${file}${version ? `?${version}` : ''}`;
    const upstream = await fetch(upstreamUrl, {
      headers: {
        Accept: 'image/png,image/*;q=0.8,*/*;q=0.5',
        'User-Agent': 'Grand-Line-Vault/1.0',
      },
    });
    if (!upstream.ok) {
      apiError(res, upstream.status === 404 ? 404 : 502, 'IMAGE_UNAVAILABLE', 'Imagen no disponible.');
      return;
    }

    const contentType = upstream.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().startsWith('image/')) {
      apiError(res, 502, 'INVALID_IMAGE_RESPONSE', 'El origen no devolvió una imagen.');
      return;
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
