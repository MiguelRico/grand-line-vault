import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { SCHEMA_VERSION, SCRAPER_CONFIG } from './config/scraper-config';
import type { CatalogCard, CatalogData, CatalogManifest, CatalogSet } from './domain/catalog';
import { validateCatalog } from './application/validate-catalog';

async function main(): Promise<void> {
  const output = path.resolve(process.cwd(), SCRAPER_CONFIG.outputDirectory);
  const manifest = JSON.parse(await readFile(path.join(output, 'manifest.json'), 'utf8')) as CatalogManifest;
  if (manifest.schemaVersion !== SCHEMA_VERSION) throw new Error('Schema del manifest incompatible.');
  const resolvePublic = (url: string) => path.join(process.cwd(), 'public', url.replace(/^\/+/, ''));
  const cardsFile = resolvePublic(manifest.cardsUrl);
  const setsFile = resolvePublic(manifest.setsUrl);
  await Promise.all([
    access(cardsFile),
    access(setsFile),
    access(resolvePublic(manifest.filtersUrl)),
    access(resolvePublic(manifest.legacyIdMapUrl)),
  ]);
  const cardsPayload = JSON.parse(await readFile(cardsFile, 'utf8')) as {
    schemaVersion: number;
    catalogVersion: string;
    cards: CatalogCard[];
  };
  const setsPayload = JSON.parse(await readFile(setsFile, 'utf8')) as {
    schemaVersion: number;
    catalogVersion: string;
    sets: CatalogSet[];
  };
  for (const payload of [cardsPayload, setsPayload]) {
    if (payload.schemaVersion !== SCHEMA_VERSION) throw new Error('Schema de datos incompatible.');
    if (payload.catalogVersion !== manifest.catalogVersion) throw new Error('Versiones inconsistentes.');
  }
  const data: CatalogData = { cards: cardsPayload.cards, sets: setsPayload.sets, warnings: [] };
  validateCatalog(data, { allowSmallCatalog: false });
  if (data.cards.length !== manifest.totalCards || data.sets.length !== manifest.totalSets) {
    throw new Error('Los totales del manifest no coinciden con los datos.');
  }
  console.log(`Catálogo ${manifest.catalogVersion} válido: ${data.cards.length} cartas, ${data.sets.length} series.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
