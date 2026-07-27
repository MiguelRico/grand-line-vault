import { cp, mkdir, readdir, writeFile } from 'node:fs/promises';

await mkdir('dist/server', { recursive: true });
await mkdir('dist/.openai', { recursive: true });
await mkdir('dist/client', { recursive: true });
await cp('.openai/hosting.json', 'dist/.openai/hosting.json');

for (const entry of await readdir('dist', { withFileTypes: true })) {
  if (['.openai', 'client', 'server'].includes(entry.name)) continue;
  await cp(`dist/${entry.name}`, `dist/client/${entry.name}`, { recursive: true });
}

await writeFile(
  'dist/server/index.js',
  `export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (
      url.pathname === '/api/catalog-image' ||
      (url.pathname === '/api/catalog' && url.searchParams.get('action') === 'image')
    ) {
      if (request.method !== 'GET') {
        return Response.json(
          { error: { code: 'METHOD_NOT_ALLOWED', message: 'Método no permitido.' } },
          { status: 405, headers: { Allow: 'GET' } },
        );
      }
      const file = url.searchParams.get('file') ?? '';
      const version = url.searchParams.get('v') ?? '';
      if (!/^[A-Za-z0-9_-]+\\.png$/.test(file) || (version && !/^\\d{1,16}$/.test(version))) {
        return Response.json(
          { error: { code: 'INVALID_IMAGE', message: 'La referencia de imagen no es válida.' } },
          { status: 400 },
        );
      }
      try {
        const upstreamUrl =
          'https://en.onepiece-cardgame.com/images/cardlist/card/' +
          file +
          (version ? '?' + version : '');
        const upstream = await fetch(upstreamUrl, {
          headers: {
            Accept: 'image/png,image/*;q=0.8,*/*;q=0.5',
            'User-Agent': 'Grand-Line-Vault/1.0',
          },
        });
        const contentType = upstream.headers.get('content-type') ?? '';
        if (!upstream.ok || !contentType.toLowerCase().startsWith('image/')) {
          return Response.json(
            { error: { code: 'IMAGE_UNAVAILABLE', message: 'Imagen no disponible.' } },
            { status: upstream.status === 404 ? 404 : 502 },
          );
        }
        return new Response(upstream.body, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000',
            'Cross-Origin-Resource-Policy': 'same-origin',
          },
        });
      } catch {
        return Response.json(
          { error: { code: 'IMAGE_PROXY_ERROR', message: 'No se pudo recuperar la imagen.' } },
          { status: 502 },
        );
      }
    }
    if (
      url.pathname === '/api/one-piece-catalog' ||
      (url.pathname === '/api/catalog' && url.searchParams.get('action') === 'one-piece')
    ) {
      if (request.method !== 'GET') {
        return Response.json(
          { error: { code: 'METHOD_NOT_ALLOWED', message: 'Método no permitido.' } },
          { status: 405, headers: { Allow: 'GET' } },
        );
      }
      const apiKey = String(env.ONE_PIECE_API_KEY ?? '').trim();
      if (!apiKey) {
        return Response.json(
          {
            error: {
              code: 'CATALOG_PROVIDER_NOT_CONFIGURED',
              message: 'One Piece API todavía no está configurada. Añade ONE_PIECE_API_KEY en el servidor.',
            },
          },
          { status: 503 },
        );
      }
      const resource = url.searchParams.get('resource') ?? '';
      const id = url.searchParams.get('id') ?? '';
      let path = '';
      if (resource === 'cards') path = '/cards';
      else if (resource === 'episodes') path = '/episodes';
      else if (resource === 'card' && /^\\d+$/.test(id)) path = '/cards/' + id;
      if (!path) {
        return Response.json(
          { error: { code: 'INVALID_CATALOG_RESOURCE', message: 'La consulta de catálogo no es válida.' } },
          { status: 400 },
        );
      }
      const upstreamUrl = new URL(
        path,
        String(env.ONE_PIECE_API_BASE_URL ?? 'https://one-piece-tcg-prices.p.rapidapi.com'),
      );
      const allowed = new Set([
        'search',
        'name',
        'card_number',
        'episode_id',
        'sort',
        'per_page',
        'page',
      ]);
      for (const [key, value] of url.searchParams) {
        if (allowed.has(key) && value) upstreamUrl.searchParams.set(key, value.slice(0, 200));
      }
      try {
        const upstream = await fetch(upstreamUrl, {
          headers: {
            Accept: 'application/json',
            'x-rapidapi-key': apiKey,
            'x-rapidapi-host': upstreamUrl.host,
          },
        });
        if (!upstream.ok) {
          return Response.json(
            {
              error: {
                code: upstream.status === 429 ? 'CATALOG_RATE_LIMITED' : 'CATALOG_UPSTREAM_ERROR',
                message:
                  upstream.status === 429
                    ? 'One Piece API ha alcanzado temporalmente su límite de consultas.'
                    : 'One Piece API no ha podido completar la consulta.',
              },
            },
            { status: upstream.status === 429 ? 429 : 502 },
          );
        }
        return Response.json(
          { data: await upstream.json() },
          {
            headers: {
              'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=900',
            },
          },
        );
      } catch {
        return Response.json(
          { error: { code: 'CATALOG_CONNECTION_ERROR', message: 'No se pudo conectar con One Piece API.' } },
          { status: 502 },
        );
      }
    }
    if (url.pathname === '/api/catalog') {
      const apiOrigin = String(
        env.CATALOG_API_ORIGIN ?? 'https://grand-line-vault-zeta.vercel.app',
      ).replace(/\\/$/, '');
      try {
        const upstream = await fetch(apiOrigin + url.pathname + url.search, {
          method: request.method,
          headers: { Accept: request.headers.get('Accept') ?? 'application/json' },
        });
        return new Response(upstream.body, {
          status: upstream.status,
          headers: {
            'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
            'Cache-Control': upstream.headers.get('Cache-Control') ?? 'no-store',
          },
        });
      } catch {
        return Response.json(
          {
            error: {
              code: 'CATALOG_BACKEND_UNAVAILABLE',
              message: 'No se pudo conectar con el servicio de catálogo.',
            },
          },
          { status: 502 },
        );
      }
    }
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;
    url.pathname = '/index.html';
    return env.ASSETS.fetch(new Request(url, request));
  }
};
`,
);
