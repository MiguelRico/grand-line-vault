import type { CatalogCriteria } from './models';
import type { CatalogRepository } from './repositories';

export class CatalogUseCases {
  constructor(private readonly repository: CatalogRepository) {}

  search(criteria: CatalogCriteria, signal?: AbortSignal) {
    return this.repository.search(criteria, signal);
  }

  listSets(signal?: AbortSignal) {
    return this.repository.listSets(signal);
  }

  getIndexCard(catalogId: string, signal?: AbortSignal) {
    return this.repository.getIndexCard(catalogId, signal);
  }

  getById(
    tcggoId: string | null,
    signal?: AbortSignal,
    fallback?: { cardNumber: string; catalogId: string },
  ) {
    return this.repository.getById(tcggoId, signal, fallback);
  }

  getVariantById(tcggoId: string, signal?: AbortSignal) {
    return this.repository.getVariantById(tcggoId, signal);
  }
}
