import type { CardColor, CardType } from '../domain/models';

export const CATALOG_SCHEMA_VERSION = 1;

export interface StaticCatalogManifest {
  schemaVersion: number;
  catalogVersion: string;
  generatedAt: string;
  totalCards: number;
  totalBaseCards: number;
  totalVariants: number;
  totalSets: number;
  cardsUrl: string;
  setsUrl: string;
  filtersUrl: string;
  legacyIdMapUrl: string;
}

export interface StaticCatalogCard {
  id: string;
  sourceId: string;
  baseCardId: string;
  cardNumber: string;
  name: string;
  category: string;
  rarity: string;
  colors: string[];
  cost: number | null;
  life: number | null;
  power: number | null;
  counter: number | null;
  attributes: string[];
  traits: string[];
  effect: string | null;
  trigger: string | null;
  imageUrl: string | null;
  variant: { type: 'base' | 'parallel' | 'reprint' | 'unknown'; number: number | null };
  sets: Array<{ id: string; sourceSeriesId: string; name: string }>;
  contentFingerprint: string;
}

export interface StaticCatalogSet {
  id: string;
  sourceSeriesId: string;
  name: string;
  cardCount: number;
}

export interface LoadedStaticCatalog {
  manifest: StaticCatalogManifest;
  cards: StaticCatalogCard[];
  sets: StaticCatalogSet[];
  legacyIdMap: Record<string, string>;
}

export function resolveCatalogUrl(url = '/catalog/manifest.json'): string {
  const relative = url.replace(/^\/?(?:catalog\/)?/, '');
  return `${import.meta.env.BASE_URL}catalog/${relative}`.replace(/\/{2,}/g, '/');
}

const OFFICIAL_IMAGE_ORIGIN = 'https://en.onepiece-cardgame.com';
const OFFICIAL_IMAGE_PATH = '/images/cardlist/card/';
const SAFE_IMAGE_FILE = /^[A-Za-z0-9_-]+\.png$/;
const SAFE_IMAGE_VERSION = /^\d{1,16}$/;

export function resolveCatalogImageUrl(url: string | null): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (parsed.origin !== OFFICIAL_IMAGE_ORIGIN) return url;
    if (!parsed.pathname.startsWith(OFFICIAL_IMAGE_PATH)) return '';
    const file = parsed.pathname.slice(OFFICIAL_IMAGE_PATH.length);
    const version = parsed.search.slice(1);
    if (!SAFE_IMAGE_FILE.test(file) || (version && !SAFE_IMAGE_VERSION.test(version))) return '';
    const query = new URLSearchParams({ file });
    if (version) query.set('v', version);
    return `${import.meta.env.BASE_URL}api/catalog-image?${query.toString()}`.replace(/^\/{2,}/, '/');
  } catch {
    return '';
  }
}

function assertObject(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} no tiene el formato esperado.`);
  }
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(resolveCatalogUrl(url));
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  try {
    return await response.json();
  } catch (error) {
    throw new Error('JSON inválido.', { cause: error });
  }
}

function assertVersionedPayload(
  value: unknown,
  manifest: StaticCatalogManifest,
  collection: 'cards' | 'sets',
): asserts value is Record<string, unknown> {
  assertObject(value, collection);
  if (value.schemaVersion !== CATALOG_SCHEMA_VERSION) throw new Error('Schema incompatible.');
  if (value.catalogVersion !== manifest.catalogVersion) throw new Error('Versión incompatible.');
  if (!Array.isArray(value[collection])) throw new Error(`Colección ${collection} inválida.`);
}

let catalogPromise: Promise<LoadedStaticCatalog> | null = null;

export function resetStaticCatalogCache(): void {
  catalogPromise = null;
}

export function loadStaticCatalog(): Promise<LoadedStaticCatalog> {
  if (catalogPromise) return catalogPromise;
  catalogPromise = (async () => {
    const manifestValue = await fetchJson('/catalog/manifest.json');
    assertObject(manifestValue, 'manifest');
    if (manifestValue.schemaVersion !== CATALOG_SCHEMA_VERSION) throw new Error('Schema incompatible.');
    const manifest = manifestValue as unknown as StaticCatalogManifest;
    const [cardsValue, setsValue, legacyValue] = await Promise.all([
      fetchJson(manifest.cardsUrl),
      fetchJson(manifest.setsUrl),
      fetchJson(manifest.legacyIdMapUrl),
    ]);
    assertVersionedPayload(cardsValue, manifest, 'cards');
    assertVersionedPayload(setsValue, manifest, 'sets');
    assertObject(legacyValue, 'legacy-id-map');
    const cards = cardsValue.cards as StaticCatalogCard[];
    const sets = setsValue.sets as StaticCatalogSet[];
    if (!cards.length || cards.length !== manifest.totalCards || sets.length !== manifest.totalSets) {
      throw new Error('Totales de catálogo inconsistentes.');
    }
    if (import.meta.env.DEV) {
      console.info(
        `Grand Line Vault catalog:\nVersion: ${manifest.catalogVersion}\n` +
          `Generated at: ${manifest.generatedAt}\nCards: ${manifest.totalCards}\nSets: ${manifest.totalSets}`,
      );
    }
    return { manifest, cards, sets, legacyIdMap: legacyValue as Record<string, string> };
  })().catch((error: unknown) => {
    catalogPromise = null;
    if (import.meta.env.DEV) console.error('Static catalog load failed.', error);
    throw new Error('No se pudo cargar el catálogo de cartas.', { cause: error });
  });
  return catalogPromise;
}

export function toCardColor(value: string): CardColor | null {
  const normalized = value.toUpperCase();
  return ['RED', 'GREEN', 'BLUE', 'PURPLE', 'BLACK', 'YELLOW'].includes(normalized)
    ? (normalized as CardColor)
    : null;
}

export function toCardType(value: string): CardType {
  const normalized = value.toUpperCase();
  return ['LEADER', 'CHARACTER', 'EVENT', 'STAGE', 'DON'].includes(normalized)
    ? (normalized as CardType)
    : 'CHARACTER';
}
