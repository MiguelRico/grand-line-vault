export const SCRAPER_VERSION = '1.0.0';
export const SCHEMA_VERSION = 1;

export const SCRAPER_CONFIG = {
  sourceUrl: 'https://en.onepiece-cardgame.com/cardlist/',
  outputDirectory: 'public/catalog',
  concurrency: 3,
  requestDelayMs: 350,
  requestTimeoutMs: 20_000,
  retries: 3,
  minimumCards: 100,
  minimumRetainedRatio: 0.75,
} as const;

export const OFFICIAL_SITE_SELECTORS = {
  seriesOptions: [
    'select[name="series"] option',
    '#series option',
    '.seriesCol select option',
  ],
  cards: 'dl.modalCol',
  cardName: '.cardName',
  cardInfo: 'dt .infoCol span',
  image: 'dd .frontCol img',
  costOrLife: 'dd .cost',
  power: 'dd .power',
  counter: 'dd .counter',
  attribute: 'dd .attribute',
  color: 'dd .color',
  traits: 'dd .feature',
  effect: 'dd .text',
  trigger: 'dd .trigger',
  cardSets: 'dd .getInfo',
} as const;
