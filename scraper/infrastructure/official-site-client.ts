import { SCRAPER_CONFIG } from '../config/scraper-config';
import { retry } from '../utils/retry';

export class OfficialSiteClient {
  async getCatalogHtml(seriesId?: string): Promise<string> {
    const url = new URL(SCRAPER_CONFIG.sourceUrl);
    if (seriesId) url.searchParams.set('series', seriesId);
    return retry(
      async () => {
        const response = await fetch(url, {
          headers: {
            Accept: 'text/html,application/xhtml+xml',
            'User-Agent': 'Grand-Line-Vault-Catalog/1.0 (+personal collection project)',
          },
          signal: AbortSignal.timeout(SCRAPER_CONFIG.requestTimeoutMs),
        });
        if (!response.ok) throw new Error(`Bandai respondió con HTTP ${response.status}.`);
        const html = await response.text();
        if (!html.includes('<html')) throw new Error('Bandai devolvió un documento HTML inválido.');
        return html;
      },
      SCRAPER_CONFIG.retries,
      750,
    );
  }
}
