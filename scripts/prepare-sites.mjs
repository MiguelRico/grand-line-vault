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
    if (url.pathname === '/api/catalog-image') {
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
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;
    url.pathname = '/index.html';
    return env.ASSETS.fetch(new Request(url, request));
  }
};
`,
);
