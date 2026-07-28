import { mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { SCHEMA_VERSION, SCRAPER_CONFIG, SCRAPER_VERSION } from '../config/scraper-config';
import type { CatalogData, CatalogManifest } from '../domain/catalog';
import { fingerprint } from '../utils/hashing';
import { stableStrings } from '../utils/text-normalization';

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function versionPayload(data: CatalogData): object {
  return { schemaVersion: SCHEMA_VERSION, cards: data.cards, sets: data.sets };
}

export async function writeCatalog(
  data: CatalogData,
  outputDirectory: string,
  startedAt: number,
  previousManifest: CatalogManifest | null = null,
): Promise<CatalogManifest> {
  const catalogVersion = fingerprint(versionPayload(data)).slice(0, 16);
  const unchanged = previousManifest?.catalogVersion === catalogVersion;
  const generatedAt = unchanged ? previousManifest.generatedAt : new Date().toISOString();
  const prefix = `/catalog`;
  const filenames = {
    cards: `cards.${catalogVersion}.json`,
    sets: `sets.${catalogVersion}.json`,
    filters: `filters.${catalogVersion}.json`,
  };
  const filters = {
    schemaVersion: SCHEMA_VERSION,
    catalogVersion,
    colors: stableStrings(data.cards.flatMap((card) => card.colors)),
    rarities: stableStrings(data.cards.map((card) => card.rarity)),
    categories: stableStrings(data.cards.map((card) => card.category)),
    variantTypes: stableStrings(data.cards.map((card) => card.variant.type)),
    attributes: stableStrings(data.cards.flatMap((card) => card.attributes)),
    traits: stableStrings(data.cards.flatMap((card) => card.traits)),
  };
  const manifest: CatalogManifest = {
    schemaVersion: SCHEMA_VERSION,
    catalogVersion,
    generatedAt,
    source: 'official-one-piece-card-game',
    sourceUrl: SCRAPER_CONFIG.sourceUrl,
    totalCards: data.cards.length,
    totalBaseCards: new Set(data.cards.map((card) => card.baseCardId)).size,
    totalVariants: data.cards.filter((card) => card.variant.type !== 'base').length,
    totalSets: data.sets.length,
    totalColors: filters.colors.length,
    totalRarities: filters.rarities.length,
    totalCategories: filters.categories.length,
    cardsUrl: `${prefix}/${filenames.cards}`,
    setsUrl: `${prefix}/${filenames.sets}`,
    filtersUrl: `${prefix}/${filenames.filters}`,
  };
  const files = new Map<string, unknown>([
    [filenames.cards, { schemaVersion: SCHEMA_VERSION, catalogVersion, cards: data.cards }],
    [filenames.sets, { schemaVersion: SCHEMA_VERSION, catalogVersion, sets: data.sets }],
    [filenames.filters, filters],
  ]);
  if (!unchanged) {
    files.set('metadata.json', {
      scraperVersion: SCRAPER_VERSION,
      generatedAt,
      durationMs: Date.now() - startedAt,
      seriesProcessed: data.sets.length,
      cards: data.cards.length,
      variants: manifest.totalVariants,
      warnings: data.warnings,
    });
  }
  await mkdir(outputDirectory, { recursive: true });
  const temporaryFiles: string[] = [];
  try {
    for (const [filename, content] of files) {
      const temporary = path.join(outputDirectory, `.${filename}.${process.pid}.tmp`);
      await writeFile(temporary, json(content), 'utf8');
      JSON.parse(
        await import('node:fs/promises').then(({ readFile }) => readFile(temporary, 'utf8')),
      );
      temporaryFiles.push(temporary);
    }
    for (let index = 0; index < temporaryFiles.length; index += 1) {
      const target = [...files.keys()][index];
      const temporary = temporaryFiles[index];
      if (target && temporary) await rename(temporary, path.join(outputDirectory, target));
    }
    const temporaryManifest = path.join(outputDirectory, `.manifest.${process.pid}.tmp`);
    await writeFile(temporaryManifest, json(manifest), 'utf8');
    JSON.parse(
      await import('node:fs/promises').then(({ readFile }) => readFile(temporaryManifest, 'utf8')),
    );
    await rename(temporaryManifest, path.join(outputDirectory, 'manifest.json'));
  } finally {
    await Promise.all(temporaryFiles.map((file) => rm(file, { force: true })));
  }
  const keep = new Set([...files.keys(), 'manifest.json', 'metadata.json']);
  const generatedPattern = /^(cards|sets|filters)\.[a-f0-9]{16}\.json$/;
  for (const filename of await readdir(outputDirectory)) {
    if (generatedPattern.test(filename) && !keep.has(filename)) {
      await rm(path.join(outputDirectory, filename));
    }
  }
  return manifest;
}
