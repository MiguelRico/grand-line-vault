import type {
  Card,
  CardArtwork,
  CardColor,
  CardType,
  CardVariantType,
  CatalogEpisode,
} from '../domain/models';
import {
  normalizeArtist,
  normalizeCardNumber,
  normalizeCatalogPrices,
  normalizeExpansionCode,
  normalizeRarity,
} from '../domain/catalogNormalization';
import { toCardColor, toCardType, type StaticCatalogCard } from './staticCatalog';

export interface OnePieceApiCard {
  id: number;
  name: string;
  name_numbered: string;
  slug: string;
  card_code_number?: string | null;
  type: string;
  card_number: string;
  hp?: number | null;
  rarity?: string | null;
  color?: string | null;
  version?: string | null;
  supertype?: string | null;
  tcgid?: number | string | null;
  cardmarket_id?: number | null;
  tcgplayer_id?: number | null;
  flavor_text?: string | null;
  card_type?: string | null;
  cost?: number | null;
  power?: number | null;
  counter?: number | null;
  life?: number | null;
  attributes?: string[] | string | null;
  traits?: string[] | string | null;
  effect?: string | null;
  trigger?: string | null;
  don?: string | null;
  artist?: Record<string, unknown> | null;
  prices?: unknown;
  episode: OnePieceApiEpisode;
  image: string;
  tcggo_url?: string;
  links?: { cardmarket?: string; tcgplayer?: string };
}

export interface OnePieceApiEpisode {
  id: number;
  name: string;
  slug: string;
  released_at?: string;
  logo?: string;
  code: string;
  cards_total?: number;
  cards_printed_total?: number;
  prices?: Record<string, unknown>;
  game?: { name: string; slug: string };
  series?: { id: number; name: string; slug: string } | null;
}

export interface OnePieceApiList<T> {
  data: T[];
  paging?: { current?: number; total?: number; per_page?: number };
  results?: number;
}

function episodePrice(value: unknown): { total: number; currency: string } | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const price = value as Record<string, unknown>;
  if (typeof price.total !== 'number' || !Number.isFinite(price.total)) return undefined;
  return {
    total: price.total,
    currency: typeof price.currency === 'string' ? price.currency : 'EUR',
  };
}

const colorMap: Record<string, CardColor> = {
  red: 'RED',
  green: 'GREEN',
  blue: 'BLUE',
  purple: 'PURPLE',
  black: 'BLACK',
  yellow: 'YELLOW',
};

function gameColors(color?: string | null): CardColor[] {
  if (!color) return [];
  return color
    .split(/[/,&+-]/)
    .map((entry) => colorMap[entry.trim().toLocaleLowerCase()])
    .filter((entry): entry is CardColor => Boolean(entry));
}

function inferCardType(rarity?: string | null): CardType {
  return rarity?.toLocaleUpperCase().includes('LEADER') ? 'LEADER' : 'UNKNOWN';
}

function strings(value?: string[] | string | null): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return value
    ? value
        .split(/[,/]/)
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];
}

export function mapApiEpisode(episode: OnePieceApiEpisode): CatalogEpisode {
  const rawPrices = episode.prices ?? {};
  return {
    ...episode,
    id: String(episode.id),
    normalized_code: normalizeExpansionCode(episode.code),
    prices: episode.prices
      ? {
          cardmarket: episodePrice(rawPrices.cardmarket),
          tcgplayer: episodePrice(rawPrices.tcgplayer ?? rawPrices.tcg_player),
        }
      : undefined,
    series: episode.series ? { ...episode.series, id: String(episode.series.id) } : episode.series,
  };
}

function normalizedVariantType(card?: StaticCatalogCard): CardVariantType {
  if (!card) return 'UNKNOWN';
  if (card.variant.type === 'base') return 'BASE';
  if (card.variant.type === 'parallel') return 'PARALLEL';
  if (card.variant.type === 'reprint') return 'REPRINT';
  return 'UNKNOWN';
}

function normalizedVariantLabel(card: StaticCatalogCard): string {
  if (card.variant.type === 'base') return 'Arte base';
  if (card.variant.type === 'parallel') return `Parallel ${card.variant.number ?? ''}`.trim();
  if (card.variant.type === 'reprint') return `Reprint ${card.variant.number ?? ''}`.trim();
  return 'Versión desconocida';
}

function versionNumber(value?: string | null): number {
  const match = value?.match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}

function matchStaticPrints(
  apiPrints: OnePieceApiCard[],
  staticMatches: StaticCatalogCard[],
): Map<number, StaticCatalogCard> {
  const matches = new Map<number, StaticCatalogCard>();
  const apiBase = apiPrints.filter((card) => !card.version);
  const staticBase = staticMatches.filter((card) => card.variant.type === 'base');
  if (apiBase.length === 1 && staticBase.length === 1 && apiBase[0] && staticBase[0])
    matches.set(apiBase[0].id, staticBase[0]);

  const apiVariants = apiPrints
    .filter((card) => Boolean(card.version))
    .sort((left, right) => versionNumber(left.version) - versionNumber(right.version));
  const staticVariants = staticMatches
    .filter((card) => card.variant.type !== 'base')
    .sort(
      (left, right) =>
        (left.variant.number ?? Number.MAX_SAFE_INTEGER) -
          (right.variant.number ?? Number.MAX_SAFE_INTEGER) ||
        left.sourceId.localeCompare(right.sourceId),
    );
  if (
    apiVariants.length === 1 &&
    staticVariants.length === 1 &&
    apiVariants[0] &&
    staticVariants[0]
  )
    matches.set(apiVariants[0].id, staticVariants[0]);
  return matches;
}

function artworkFromApi(
  card: OnePieceApiCard,
  baseCardId: string,
  staticPrint?: StaticCatalogCard,
): CardArtwork {
  const normalizedType = normalizedVariantType(staticPrint);
  return {
    id: `ONE_PIECE_API::${card.id}`,
    external_id: String(card.id),
    base_card_id: baseCardId,
    variant_type: staticPrint ? normalizedType : card.version ? 'UNKNOWN' : 'BASE',
    label: staticPrint
      ? normalizedVariantLabel(staticPrint)
      : card.version
        ? `Versión ${card.version}`
        : 'Arte base',
    version: card.version,
    image: card.image,
    language: 'EN',
    prices: normalizeCatalogPrices(card.prices),
    artist: normalizeArtist(card.artist),
    cardmarket_id: card.cardmarket_id,
    tcgplayer_id: card.tcgplayer_id,
    tcgid: card.tcgid,
    links: card.links,
    tcggo_url: card.tcggo_url,
    source: {
      providerId: 'TCGGO',
      providerCardId: String(card.id),
      providerVariantId: card.version ? String(card.id) : undefined,
      fetchedAt: new Date().toISOString(),
    },
  };
}

export function mapApiCard(
  raw: OnePieceApiCard,
  related: OnePieceApiCard[] = [],
  staticMatches: StaticCatalogCard[] = [],
): Card {
  const id = `ONE_PIECE_API::${raw.id}`;
  const source = {
    providerId: 'TCGGO' as const,
    providerCardId: String(raw.id),
    fetchedAt: new Date().toISOString(),
  };
  const baseIds = new Set(staticMatches.map((card) => card.baseCardId));
  const staticBase =
    baseIds.size === 1
      ? (staticMatches.find((card) => card.variant.type === 'base') ?? staticMatches[0])
      : undefined;
  const enrichmentStatus = baseIds.size > 1 ? 'AMBIGUOUS' : staticBase ? 'MATCHED' : 'SOURCE';
  const staticColors = staticBase?.colors.map(toCardColor).filter((color) => color !== null) ?? [];
  const enrichedFields = staticBase
    ? [
        'game.card_type',
        'game.cost',
        'game.power',
        'game.counter',
        'game.life',
        'game.attributes',
        'game.traits',
        'game.effect',
        'game.trigger',
      ]
    : [];
  const apiProvenance = Object.fromEntries(
    [
      ['card_number', 'card_number'],
      ['name', 'name'],
      ['rarity', 'rarity'],
      ['color', 'color'],
      ['version', 'version'],
      ['artist', 'artist'],
      ['prices', 'prices'],
      ['episode', 'episode'],
      ['image', 'image'],
      ['marketplace_ids', 'cardmarket_id/tcgplayer_id/tcgid'],
      ['links', 'links/tcggo_url'],
    ].map(([field, sourceField]) => [
      field,
      {
        providerId: 'TCGGO' as const,
        sourceField,
        confidence: 'EXACT' as const,
      },
    ]),
  );
  const staticProvenance = Object.fromEntries(
    enrichedFields.map((field) => [
      field,
      {
        providerId: 'OFFICIAL_STATIC' as const,
        sourceField: field.slice(5),
        confidence: 'HIGH' as const,
      },
    ]),
  );
  const apiPrints = related.some((card) => card.id === raw.id) ? related : [raw, ...related];
  const printMatches = matchStaticPrints(apiPrints, staticMatches);
  const selectedStaticPrint = printMatches.get(raw.id);

  return {
    id,
    external_id: String(raw.id),
    name: raw.name,
    name_numbered: raw.name_numbered || `${raw.name} ${raw.card_number}`,
    slug: raw.slug,
    type: raw.type,
    card_number: raw.card_number,
    normalized_card_number: normalizeCardNumber(raw.card_number),
    card_code_number: raw.card_code_number,
    rarity: raw.rarity ?? undefined,
    rarity_normalized: normalizeRarity(raw.rarity),
    color: raw.color ?? null,
    version: raw.version,
    print: {
      variant_type: selectedStaticPrint
        ? normalizedVariantType(selectedStaticPrint)
        : raw.version
          ? 'UNKNOWN'
          : 'BASE',
      label: selectedStaticPrint
        ? normalizedVariantLabel(selectedStaticPrint)
        : raw.version
          ? `Versión ${raw.version}`
          : 'Arte base',
      number: selectedStaticPrint?.variant.number,
      static_id: selectedStaticPrint?.sourceId,
      confidence: selectedStaticPrint ? 'HIGH' : raw.version ? 'LOW' : 'HIGH',
    },
    hp: raw.hp,
    supertype: raw.supertype,
    tcgid: raw.tcgid,
    cardmarket_id: raw.cardmarket_id,
    tcgplayer_id: raw.tcgplayer_id,
    flavor_text: raw.flavor_text,
    prices: normalizeCatalogPrices(raw.prices),
    episode: mapApiEpisode(raw.episode),
    artist: normalizeArtist(raw.artist),
    image: raw.image,
    tcggo_url: raw.tcggo_url,
    links: raw.links,
    game: {
      card_type: staticBase
        ? toCardType(staticBase.category)
        : raw.card_type
          ? toCardType(raw.card_type)
          : inferCardType(raw.rarity),
      colors: staticColors.length > 0 ? staticColors : gameColors(raw.color),
      cost: staticBase?.cost ?? raw.cost ?? undefined,
      power: staticBase?.power ?? raw.power ?? undefined,
      counter: staticBase?.counter ?? raw.counter ?? undefined,
      life: staticBase?.life ?? raw.life ?? undefined,
      attributes: staticBase?.attributes ?? strings(raw.attributes),
      traits: staticBase?.traits ?? strings(raw.traits),
      effect: staticBase?.effect ?? raw.effect ?? undefined,
      trigger: staticBase?.trigger ?? raw.trigger ?? undefined,
      don: raw.don ?? undefined,
      language: 'EN',
    },
    artworks: related
      .filter((card) => card.id !== raw.id)
      .map((card) => artworkFromApi(card, id, printMatches.get(card.id))),
    printings: apiPrints.map((card) => artworkFromApi(card, id, printMatches.get(card.id))),
    source,
    enrichment: {
      status: enrichmentStatus,
      providers: staticBase ? ['TCGGO', 'OFFICIAL_STATIC'] : ['TCGGO'],
      matchedExternalIds: staticMatches.map((card) => card.sourceId),
      fields: enrichedFields,
      provenance: { ...apiProvenance, ...staticProvenance },
      conflicts:
        baseIds.size > 1 ? [`Varias cartas funcionales coinciden con ${raw.card_number}.`] : [],
    },
  };
}

export function isOnePieceApiCard(value: unknown): value is OnePieceApiCard {
  if (!value || typeof value !== 'object') return false;
  const card = value as Partial<OnePieceApiCard>;
  return (
    typeof card.id === 'number' &&
    typeof card.name === 'string' &&
    typeof card.card_number === 'string' &&
    typeof card.image === 'string' &&
    Boolean(card.episode) &&
    typeof card.episode?.id === 'number' &&
    typeof card.episode?.code === 'string'
  );
}

export function isOnePieceApiEpisode(value: unknown): value is OnePieceApiEpisode {
  if (!value || typeof value !== 'object') return false;
  const episode = value as Partial<OnePieceApiEpisode>;
  return (
    typeof episode.id === 'number' &&
    typeof episode.name === 'string' &&
    typeof episode.code === 'string'
  );
}
