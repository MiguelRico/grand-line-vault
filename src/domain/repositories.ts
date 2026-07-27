import type {
  CardDetail,
  CatalogCard,
  CatalogCriteria,
  CatalogEpisode,
  PaginatedResult,
} from './models';

export interface CatalogIndexRepository {
  search(
    criteria: CatalogCriteria,
    signal?: AbortSignal,
  ): Promise<PaginatedResult<CatalogCard>>;
  listSets(signal?: AbortSignal): Promise<CatalogEpisode[]>;
  getIndexCard(tcggoId: string, signal?: AbortSignal): Promise<CatalogCard | null>;
}

export interface CardDetailRepository {
  getById(tcggoId: string, signal?: AbortSignal): Promise<CardDetail | null>;
}

export interface CatalogRepository extends CatalogIndexRepository, CardDetailRepository {}
