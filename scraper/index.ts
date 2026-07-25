import { scrapeCatalog } from './application/scrape-catalog';

scrapeCatalog().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
