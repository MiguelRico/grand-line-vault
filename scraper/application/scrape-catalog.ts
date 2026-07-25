import path from 'node:path';
import { SCRAPER_CONFIG } from '../config/scraper-config';
import type { CatalogManifest } from '../domain/catalog';
import { OfficialSiteClient } from '../infrastructure/official-site-client';
import { parseCards, parseSeries } from '../infrastructure/html-parser';
import { readPreviousManifest } from '../infrastructure/previous-catalog-reader';
import { writeCatalog } from '../infrastructure/file-catalog-writer';
import { mapWithConcurrency } from '../utils/concurrency';
import { normalizeCatalog } from './normalize-catalog';
import { validateCatalog } from './validate-catalog';

export async function scrapeCatalog(): Promise<CatalogManifest> {
  const startedAt = Date.now();
  const client = new OfficialSiteClient();
  const landingHtml = await client.getCatalogHtml();
  const sets = parseSeries(landingHtml);
  console.log(`Series descubiertas: ${sets.length}.`);
  const groups = await mapWithConcurrency(sets, SCRAPER_CONFIG.concurrency, async (set, index) => {
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, SCRAPER_CONFIG.requestDelayMs));
    const cards = parseCards(await client.getCatalogHtml(set.sourceSeriesId), set);
    console.log(`[${index + 1}/${sets.length}] ${set.name}: ${cards.length} cartas.`);
    return cards;
  });
  const data = normalizeCatalog(groups.flat(), sets);
  const outputDirectory = path.resolve(process.cwd(), SCRAPER_CONFIG.outputDirectory);
  const previous = await readPreviousManifest(outputDirectory);
  validateCatalog(data, { previousTotalCards: previous?.totalCards });
  const manifest = await writeCatalog(data, outputDirectory, startedAt, previous);
  console.log(
    `Catálogo ${manifest.catalogVersion}: ${manifest.totalCards} versiones, ` +
      `${manifest.totalBaseCards} cartas base y ${manifest.totalSets} series.`,
  );
  if (data.warnings.length) console.warn(`Warnings: ${data.warnings.length}.`);
  return manifest;
}
