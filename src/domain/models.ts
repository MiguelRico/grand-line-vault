export type CatalogProviderId = 'ARJUNKAI_OPTCG' | 'OPTCG_API' | 'MOCK';
export type AppTheme = 'LIGHT' | 'DARK';

export interface AppSettings {
  catalogProvider: Exclude<CatalogProviderId, 'MOCK'>;
  theme: AppTheme;
}

export interface CatalogProviderStatus {
  providerId: Exclude<CatalogProviderId, 'MOCK'>;
  name: string;
  enabled: boolean;
  configured: boolean;
  available: boolean;
  totalCards: number | null;
  latencyMs: number;
  checkedAt: string;
  documentationUrl?: string;
  errorCode?: string;
}
export type CardLanguage = 'EN' | 'JP' | 'FR' | 'ES' | 'IT' | 'DE' | 'UNKNOWN';
export type CardColor = 'RED' | 'GREEN' | 'BLUE' | 'PURPLE' | 'BLACK' | 'YELLOW';
export type CardType = 'LEADER' | 'CHARACTER' | 'EVENT' | 'STAGE' | 'DON';
export type CardCondition =
  | 'MINT'
  | 'NEAR_MINT'
  | 'EXCELLENT'
  | 'GOOD'
  | 'PLAYED'
  | 'POOR'
  | 'UNKNOWN';
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

export interface CardVariant {
  id: string;
  baseCardId: string;
  type: CardVariantType;
  label: string;
  imageUrl: string;
  language: CardLanguage;
  prices: CardPrice[];
  sources: CatalogSourceReference[];
}

export interface Card {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: CardType;
  colors: CardColor[];
  rarity?: string;
  set: { code: string; name: string };
  cost?: number;
  power?: number;
  counter?: number;
  life?: number;
  attributes: string[];
  traits: string[];
  effect?: string;
  trigger?: string;
  language: CardLanguage;
  imageUrl: string;
  variants: CardVariant[];
  prices: CardPrice[];
  sources: CatalogSourceReference[];
}

export interface CollectionItem {
  id: string;
  cardId: string;
  cardVariantId: string;
  cardSnapshot: {
    code: string;
    name: string;
    setCode: string;
    rarity?: string;
    variantLabel?: string;
    imageUrl: string;
    catalogPrice?: CardPrice;
    catalogProvider?: CatalogProviderId;
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
