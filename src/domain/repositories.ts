import type {
  CardDetail,
  CatalogCard,
  CatalogCriteria,
  CatalogEpisode,
  PaginatedResult,
} from './models';

export interface CatalogIndexRepository {
  search(criteria: CatalogCriteria, signal?: AbortSignal): Promise<PaginatedResult<CatalogCard>>;
  listSets(signal?: AbortSignal): Promise<CatalogEpisode[]>;
  getIndexCard(catalogId: string, signal?: AbortSignal): Promise<CatalogCard | null>;
}

export interface CardDetailRepository {
  getById(
    tcggoId: string | null,
    signal?: AbortSignal,
    fallback?: {
      cardNumber: string;
      catalogId: string;
      indexCard?: CatalogCard;
    },
  ): Promise<CardDetail | null>;
  getVariantById(tcggoId: string, signal?: AbortSignal): Promise<CardDetail | null>;
}

export interface CatalogRepository extends CatalogIndexRepository, CardDetailRepository {}
