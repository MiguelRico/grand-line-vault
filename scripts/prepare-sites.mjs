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
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;
    const url = new URL(request.url);
    url.pathname = '/index.html';
    return env.ASSETS.fetch(new Request(url, request));
  }
};
`,
);
