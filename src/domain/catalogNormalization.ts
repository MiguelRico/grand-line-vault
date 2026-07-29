import type {
  CanonicalRarity,
  CardDetail,
  CardVariant,
  CardMarketPrices,
  CatalogArtist,
  CatalogPrices,
  CatalogCard,
  CatalogVariantRef,
  CollectionEntry,
} from './models';

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

export function resolveCatalogVariant(
  catalogCard: CatalogCard,
  detail: CardDetail,
  artwork: CardVariant | null,
): CatalogVariantRef | null {
  if (!artwork && (!detail.print || detail.print.variant_type === 'BASE')) return null;
  const staticId = artwork?.source.providerVariantId ?? detail.print?.static_id;
  const version = artwork?.version ?? detail.version;
  const versionMatch = version?.match(/\d+/);
  const variantNumber = detail.print?.number ?? (versionMatch ? Number(versionMatch[0]) : null);
  return (
    catalogCard.variants.find((variant) => variant.id === staticId) ??
    (variantNumber === null
      ? undefined
      : catalogCard.variants.find(
          (variant) => variant.variant_type !== 'BASE' && variant.number === variantNumber,
        )) ??
    catalogCard.variants.find(
      (variant) =>
        variant.variant_type === (artwork?.variant_type ?? detail.print?.variant_type) &&
        variant.label === (artwork?.label ?? detail.print?.label),
    ) ??
    (artwork
      ? catalogCard.variants.find((variant) => variant.image === artwork.image) ?? null
      : catalogCard.variants.find((variant) => variant.variant_type === 'BASE') ?? null)
  );
}

export function collectionItemIdentity(
  item: Pick<
    CollectionEntry,
    'catalogCardId' | 'catalogVariantId' | 'language' | 'condition' | 'boxId' | 'sectionId'
  >,
): string {
  return [
    item.catalogCardId,
    item.catalogVariantId ?? 'BASE',
    item.language,
    item.condition,
    item.boxId ?? 'UNASSIGNED',
    item.sectionId ?? 'UNASSIGNED',
  ].join('::');
}
