export type CatalogVariantType = 'base' | 'parallel' | 'reprint' | 'unknown';

export interface OfficialSet {
  sourceSeriesId: string;
  name: string;
}

export interface CardSetReference {
  id: string;
  sourceSeriesId: string;
  name: string;
}

export interface CatalogSet extends CardSetReference {
  normalizedName: string;
  type: string | null;
  cardCount: number;
}

export interface CatalogCard {
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
  imageFingerprint?: string;
  variant: { type: CatalogVariantType; number: number | null };
  sets: CardSetReference[];
  contentFingerprint: string;
}

export interface ParsedCard extends Omit<CatalogCard, 'contentFingerprint' | 'sets'> {
  set: CardSetReference;
}

export interface CatalogManifest {
  schemaVersion: number;
  catalogVersion: string;
  generatedAt: string;
  source: 'official-one-piece-card-game';
  sourceUrl: string;
  totalCards: number;
  totalBaseCards: number;
  totalVariants: number;
  totalSets: number;
  totalColors: number;
  totalRarities: number;
  totalCategories: number;
  cardsUrl: string;
  setsUrl: string;
  filtersUrl: string;
}

export interface CatalogData {
  cards: CatalogCard[];
  sets: CatalogSet[];
  warnings: string[];
}
