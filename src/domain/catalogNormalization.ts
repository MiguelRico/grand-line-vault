import type {
  CanonicalRarity,
  Card,
  CardArtwork,
  CardMarketPrices,
  CatalogArtist,
  CatalogPrices,
  CollectionItem,
} from './models';
import { catalogPriceList } from './services';

export const COLLECTION_SNAPSHOT_VERSION = 2 as const;

export function normalizeCardNumber(value: string): string {
  return value
    .trim()
    .toLocaleUpperCase()
    .replace(/\s+/g, '')
    .replace(/^([A-Z]+)-(\d)/, '$1$2');
}

export function normalizeExpansionCode(value: string): string {
  return value
    .trim()
    .toLocaleUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

export function normalizeRarity(value?: string | null): CanonicalRarity {
  const rarity = (value ?? '').trim().toLocaleUpperCase().replace(/[_-]+/g, ' ');
  const values: Record<string, CanonicalRarity> = {
    C: 'COMMON',
    COMMON: 'COMMON',
    UC: 'UNCOMMON',
    UNCOMMON: 'UNCOMMON',
    R: 'RARE',
    RARE: 'RARE',
    SR: 'SUPER_RARE',
    'SUPER RARE': 'SUPER_RARE',
    SEC: 'SECRET_RARE',
    'SECRET RARE': 'SECRET_RARE',
    L: 'LEADER',
    LEADER: 'LEADER',
    P: 'PROMO',
    PR: 'PROMO',
    PROMO: 'PROMO',
    TR: 'TREASURE_RARE',
    'TREASURE RARE': 'TREASURE_RARE',
    'SP CARD': 'SPECIAL',
    SPECIAL: 'SPECIAL',
  };
  return values[rarity] ?? 'UNKNOWN';
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function normalizeCardmarket(value: unknown): CardMarketPrices | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as Record<string, unknown>;
  const currency = typeof source.currency === 'string' ? source.currency : 'EUR';
  const graded = Array.isArray(source.graded)
    ? source.graded
        .filter(
          (entry): entry is { grade: string; price: number } =>
            Boolean(entry) &&
            typeof entry === 'object' &&
            typeof (entry as { grade?: unknown }).grade === 'string' &&
            typeof (entry as { price?: unknown }).price === 'number',
        )
        .map(({ grade, price }) => ({ grade, price }))
    : undefined;
  return {
    currency,
    lowest_near_mint: optionalNumber(source.lowest_near_mint),
    lowest_near_mint_FR: optionalNumber(source.lowest_near_mint_FR),
    lowest_near_mint_EU_only: optionalNumber(source.lowest_near_mint_EU_only),
    lowest_near_mint_FR_EU_only: optionalNumber(source.lowest_near_mint_FR_EU_only),
    average_30d: optionalNumber(source['30d_average']),
    average_7d: optionalNumber(source['7d_average']),
    available_items: optionalNumber(source.available_items),
    graded,
  };
}

export function normalizeCatalogPrices(value: unknown): CatalogPrices {
  if (!value || typeof value !== 'object') return {};
  const source = value as Record<string, unknown>;
  const rawTcgplayer = source.tcgplayer ?? source.tcg_player;
  const tcgplayer =
    rawTcgplayer && typeof rawTcgplayer === 'object'
      ? {
          currency:
            typeof (rawTcgplayer as Record<string, unknown>).currency === 'string'
              ? String((rawTcgplayer as Record<string, unknown>).currency)
              : 'EUR',
          market_price:
            optionalNumber((rawTcgplayer as Record<string, unknown>).market_price) ?? null,
        }
      : undefined;
  return {
    cardmarket: normalizeCardmarket(source.cardmarket),
    tcgplayer,
  };
}

export function normalizeArtist(value: unknown): CatalogArtist | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  if (typeof source.name !== 'string') return null;
  const id =
    typeof source.id === 'string' || typeof source.id === 'number' ? String(source.id) : '';
  return {
    id,
    name: source.name,
    slug: typeof source.slug === 'string' ? source.slug : '',
  };
}

export function createCollectionSnapshot(
  card: Card,
  artwork: CardArtwork | null,
  absoluteImageUrl: string,
): CollectionItem['cardSnapshot'] {
  const source = artwork?.source ?? card.source;
  const prices = artwork?.prices ?? card.prices;
  const externalPrintId = artwork?.external_id ?? card.external_id;
  return {
    schemaVersion: COLLECTION_SNAPSHOT_VERSION,
    normalizedCardNumber: card.normalized_card_number,
    printKey: `${source.providerId}::${externalPrintId}`,
    code: card.card_number,
    name: card.name,
    setCode: card.episode.code,
    rarity: card.rarity,
    variantLabel: artwork?.label ?? (card.version ? `Versión ${card.version}` : 'Arte base'),
    imageUrl: absoluteImageUrl,
    catalogPrice: catalogPriceList(prices)[0],
    catalogProvider: source.providerId,
    sourceCardId: card.external_id,
    sourceVariantId: artwork?.external_id,
    catalogFetchedAt: source.fetchedAt,
  };
}

export function migrateCollectionItem(item: CollectionItem): CollectionItem {
  const snapshot = item.cardSnapshot as CollectionItem['cardSnapshot'] &
    Partial<{
      schemaVersion: number;
      normalizedCardNumber: string;
      printKey: string;
    }>;
  const provider = snapshot.catalogProvider ?? 'LEGACY_EXTERNAL';
  const sourcePrintId =
    snapshot.sourceVariantId ??
    snapshot.sourceCardId ??
    `${normalizeCardNumber(snapshot.code)}::${snapshot.variantLabel ?? 'BASE'}`;
  return {
    ...item,
    cardSnapshot: {
      ...snapshot,
      schemaVersion: COLLECTION_SNAPSHOT_VERSION,
      normalizedCardNumber: snapshot.normalizedCardNumber || normalizeCardNumber(snapshot.code),
      printKey: snapshot.printKey || `${provider}::${sourcePrintId}`,
    },
  };
}

export function collectionItemIdentity(item: CollectionItem): string {
  const migrated = migrateCollectionItem(item);
  return [
    migrated.cardSnapshot.printKey,
    migrated.language,
    migrated.condition,
    migrated.boxId ?? 'UNASSIGNED',
    migrated.sectionId ?? 'UNASSIGNED',
  ].join('::');
}
