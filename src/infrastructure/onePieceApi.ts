import type {
  Card,
  CardArtwork,
  CardColor,
  CardType,
  CatalogEpisode,
  CatalogPrices,
} from '../domain/models';

export interface OnePieceApiCard {
  id: number;
  name: string;
  name_numbered: string;
  slug: string;
  type: string;
  card_number: string;
  rarity?: string | null;
  color?: string | null;
  version?: string | null;
  cardmarket_id?: number | null;
  tcgplayer_id?: number | null;
  flavor_text?: string | null;
  artist?: Record<string, unknown> | null;
  prices?: CatalogPrices | null;
  episode: {
    id: number;
    name: string;
    slug: string;
    released_at?: string;
    logo?: string;
    code: string;
  };
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
}

export interface OnePieceApiList<T> {
  data: T[];
  paging?: { current?: number; total?: number; per_page?: number };
  results?: number;
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

export function mapApiEpisode(episode: OnePieceApiEpisode): CatalogEpisode {
  return {
    ...episode,
    id: String(episode.id),
  };
}

function artworkFromApi(card: OnePieceApiCard, baseCardId: string): CardArtwork {
  return {
    id: `ONE_PIECE_API::${card.id}`,
    external_id: String(card.id),
    base_card_id: baseCardId,
    variant_type: card.version ? 'PARALLEL' : 'BASE',
    label: card.version ? `Versión ${card.version}` : 'Base',
    image: card.image,
    language: 'EN',
    prices: card.prices ?? {},
    source: {
      providerId: 'ONE_PIECE_API',
      providerCardId: String(card.id),
      providerVariantId: card.version ? String(card.id) : undefined,
      fetchedAt: new Date().toISOString(),
    },
  };
}

export function mapApiCard(raw: OnePieceApiCard, related: OnePieceApiCard[] = []): Card {
  const id = `ONE_PIECE_API::${raw.id}`;
  const source = {
    providerId: 'ONE_PIECE_API' as const,
    providerCardId: String(raw.id),
    fetchedAt: new Date().toISOString(),
  };
  return {
    id,
    external_id: String(raw.id),
    name: raw.name,
    name_numbered: raw.name_numbered || `${raw.name} ${raw.card_number}`,
    slug: raw.slug,
    type: raw.type,
    card_number: raw.card_number,
    rarity: raw.rarity ?? undefined,
    color: raw.color ?? null,
    version: raw.version,
    cardmarket_id: raw.cardmarket_id,
    tcgplayer_id: raw.tcgplayer_id,
    flavor_text: raw.flavor_text,
    artist: raw.artist,
    prices: raw.prices ?? {},
    episode: mapApiEpisode(raw.episode),
    image: raw.image,
    tcggo_url: raw.tcggo_url,
    links: raw.links,
    game: {
      card_type: inferCardType(raw.rarity),
      colors: gameColors(raw.color),
      attributes: [],
      traits: [],
      language: 'EN',
    },
    artworks: related.filter((card) => card.id !== raw.id).map((card) => artworkFromApi(card, id)),
    source,
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
