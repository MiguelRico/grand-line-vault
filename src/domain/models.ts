export type CatalogProviderId = 'OFFICIAL_STATIC' | 'ONE_PIECE_API' | 'MOCK' | 'LEGACY_EXTERNAL';
export type CatalogDataSource = 'OFFICIAL_STATIC' | 'ONE_PIECE_API';
export type AppTheme = 'LIGHT' | 'DARK';

export interface AppSettings {
  theme: AppTheme;
  catalogDataSource: CatalogDataSource;
}
export type CardLanguage = 'EN' | 'JP' | 'FR' | 'ES' | 'IT' | 'DE' | 'UNKNOWN';
export type CardColor = 'RED' | 'GREEN' | 'BLUE' | 'PURPLE' | 'BLACK' | 'YELLOW';
export type CardType = 'LEADER' | 'CHARACTER' | 'EVENT' | 'STAGE' | 'DON' | 'UNKNOWN';
export type CardCondition =
  'MINT' | 'NEAR_MINT' | 'EXCELLENT' | 'GOOD' | 'PLAYED' | 'POOR' | 'UNKNOWN';
export type CardVariantType =
  | 'BASE'
  | 'ALTERNATE_ART'
  | 'PARALLEL'
  | 'MANGA'
  | 'PROMO'
  | 'WINNER'
  | 'PRERELEASE'
  | 'SERIAL'
  | 'REPRINT'
  | 'DON'
  | 'UNKNOWN';
export type CanonicalRarity =
  | 'COMMON'
  | 'UNCOMMON'
  | 'RARE'
  | 'SUPER_RARE'
  | 'SECRET_RARE'
  | 'LEADER'
  | 'PROMO'
  | 'TREASURE_RARE'
  | 'SPECIAL'
  | 'UNKNOWN';

export interface Money {
  amount: number;
  currency: string;
}

export interface CardPrice extends Money {
  source: string;
  sourceProductId?: string;
  updatedAt?: string;
  marketType: 'MARKET' | 'LOW' | 'MID' | 'LISTED' | 'UNKNOWN';
}

export interface CatalogSourceReference {
  providerId: CatalogProviderId;
  providerCardId?: string;
  providerVariantId?: string;
  fetchedAt: string;
}

export interface CatalogFieldProvenance {
  providerId: CatalogProviderId;
  sourceField: string;
  confidence: 'EXACT' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface CardMarketPrices {
  currency: string;
  lowest_near_mint?: number;
  lowest_near_mint_FR?: number;
  lowest_near_mint_EU_only?: number;
  lowest_near_mint_FR_EU_only?: number;
  average_30d?: number;
  average_7d?: number;
  available_items?: number;
  graded?: { grade: string; price: number }[];
}

export interface TcgPlayerPrices {
  currency: string;
  market_price?: number | null;
}

export interface CatalogPrices {
  cardmarket?: CardMarketPrices | null;
  tcgplayer?: TcgPlayerPrices | null;
}

export interface CatalogEpisode {
  id: string;
  name: string;
  slug: string;
  released_at?: string;
  logo?: string;
  code: string;
  normalized_code: string;
  cards_total?: number;
  cards_printed_total?: number;
  prices?: {
    cardmarket?: { total: number; currency: string };
    tcgplayer?: { total: number; currency: string };
  };
  game?: { name: string; slug: string };
  series?: { id: string; name: string; slug: string } | null;
}

export interface CatalogArtist {
  id: string;
  name: string;
  slug: string;
}

export interface CardGameDetails {
  card_type: CardType;
  colors: CardColor[];
  cost?: number;
  power?: number;
  counter?: number;
  life?: number;
  attributes: string[];
  traits: string[];
  effect?: string;
  trigger?: string;
  language: CardLanguage;
}

export interface CardArtwork {
  id: string;
  external_id: string;
  base_card_id: string;
  variant_type: CardVariantType;
  label: string;
  version?: string | null;
  image: string;
  language: CardLanguage;
  prices: CatalogPrices;
  artist?: CatalogArtist | null;
  cardmarket_id?: number | null;
  tcgplayer_id?: number | null;
  tcgid?: number | string | null;
  links?: { cardmarket?: string; tcgplayer?: string };
  tcggo_url?: string;
  source: CatalogSourceReference;
}

export type CardVariant = CardArtwork;

export interface Card {
  /** Identificador interno con namespace del proveedor. */
  id: string;
  /** Identificador original entregado por la fuente. */
  external_id: string;
  name: string;
  name_numbered: string;
  slug: string;
  type: string;
  card_number: string;
  normalized_card_number: string;
  card_code_number?: string | null;
  rarity?: string;
  rarity_normalized: CanonicalRarity;
  color: string | null;
  version?: string | null;
  hp?: number | null;
  supertype?: string | null;
  tcgid?: number | string | null;
  cardmarket_id?: number | null;
  tcgplayer_id?: number | null;
  flavor_text?: string | null;
  artist?: CatalogArtist | null;
  prices: CatalogPrices;
  episode: CatalogEpisode;
  image: string;
  tcggo_url?: string;
  links?: { cardmarket?: string; tcgplayer?: string };
  game: CardGameDetails;
  artworks: CardArtwork[];
  source: CatalogSourceReference;
  enrichment: {
    status: 'SOURCE' | 'MATCHED' | 'UNMATCHED' | 'AMBIGUOUS';
    providers: CatalogProviderId[];
    matchedExternalIds: string[];
    fields: string[];
    provenance: Record<string, CatalogFieldProvenance>;
    conflicts: string[];
  };
}

export interface CollectionItem {
  id: string;
  cardId: string;
  cardVariantId: string;
  cardSnapshot: {
    schemaVersion: 2;
    normalizedCardNumber: string;
    printKey: string;
    code: string;
    name: string;
    setCode: string;
    rarity?: string;
    variantLabel?: string;
    imageUrl: string;
    catalogPrice?: CardPrice;
    catalogProvider?: CatalogProviderId;
    sourceCardId?: string;
    sourceVariantId?: string;
    catalogFetchedAt?: string;
  };
  quantity: number;
  language: CardLanguage;
  condition: CardCondition;
  favorite: boolean;
  boxId?: string;
  sectionId?: string;
  acquisitionPrice?: Money;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StorageSection {
  id: string;
  name: string;
  code: string;
  capacity?: number;
  notes?: string;
}

export interface StorageBox {
  id: string;
  name: string;
  description?: string;
  location?: string;
  sections: StorageSection[];
  createdAt: string;
  updatedAt: string;
}

export type SalesPackStatus = 'DRAFT' | 'READY' | 'SOLD' | 'ARCHIVED';

export interface SalesPackItem {
  id: string;
  collectionItemId: string;
  quantity: number;
  snapshot: CollectionItem['cardSnapshot'];
}

export interface SalesPack {
  id: string;
  name: string;
  description?: string;
  status: SalesPackStatus;
  items: SalesPackItem[];
  salePrice?: Money;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionStats {
  totalCopies: number;
  uniqueCards: number;
  setsRepresented: number;
  duplicateCopies: number;
  favoriteCards: number;
  storedCopies: number;
  unassignedCopies: number;
  copiesInSalesPacks: number;
  valuedCopies: number;
  unvaluedCopies: number;
  estimatedValue: Money;
}

export interface CatalogCriteria {
  query: string;
  setCode: string;
  color: CardColor | '';
  type: CardType | '';
  rarity: string;
  variant: CardVariantType | '';
  minCost?: number;
  maxCost?: number;
  minPower?: number;
  maxPower?: number;
  sort: 'code' | 'name' | 'price' | 'power' | 'cost';
  direction: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  meta: {
    provider: CatalogProviderId;
    fallbackUsed: boolean;
    cached: boolean;
    partialData: boolean;
  };
}

export interface ProviderCapabilities {
  supportsPagination: boolean;
  supportsSearch: boolean;
  supportsSets: boolean;
  supportsVariants: boolean;
  supportsPrices: boolean;
  supportsPriceHistory: boolean;
  supportsLanguages: boolean;
  supportsDonCards: boolean;
  supportsPromos: boolean;
  supportsServerSideFilters: boolean;
  supportedFilters: string[];
}
