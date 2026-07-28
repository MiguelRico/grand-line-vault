export type CatalogProviderId =
  'FIRESTORE_INDEX' | 'TCGGO' | 'OFFICIAL_STATIC' | 'ONE_PIECE_API' | 'MOCK';
export type AppTheme = 'LIGHT' | 'DARK';

export interface AppSettings {
  theme: AppTheme;
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

export interface Price extends Money {
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
  don?: string;
  language: CardLanguage;
}

export interface Printing {
  id: string;
  external_id: string;
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

export interface CardVariant extends Printing {
  base_card_id: string;
}

/**
 * Proyección mínima persistida en Firestore. No contiene reglas, precios ni
 * datos detallados que pertenezcan a TCGGO.
 */
export interface CatalogCard {
  id: string;
  /** Se completa de forma progresiva al consultar el detalle en TCGGO. */
  tcggoId: string | null;
  name: string;
  normalizedName: string;
  card_number: string;
  normalized_card_number: string;
  image: string;
  episode: Pick<CatalogEpisode, 'id' | 'name' | 'code' | 'normalized_code'>;
  /** Expansiones en las que aparece cualquiera de sus impresiones. */
  setCodes: string[];
  rarity?: string;
  rarity_normalized: CanonicalRarity;
  color: string | null;
  artist?: CatalogArtist | null;
  game: Pick<
    CardGameDetails,
    'card_type' | 'colors' | 'cost' | 'life' | 'power' | 'counter' | 'attributes'
  >;
  variantTypes: CardVariantType[];
  /** Variantes adicionales a la impresión base. */
  variantCount: number;
  /** Número total de impresiones, incluida la base. */
  totalVariants: number;
  source: CatalogSourceReference;
}

export interface CardDetail {
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
  print?: {
    variant_type: CardVariantType;
    label: string;
    number?: number | null;
    static_id?: string;
    confidence: 'EXACT' | 'HIGH' | 'MEDIUM' | 'LOW';
  };
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
  artworks: CardVariant[];
  printings?: Printing[];
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
    catalogPrice?: Price;
    catalogProvider: CatalogProviderId;
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
  cursor?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  nextCursor?: string;
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
