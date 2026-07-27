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

  getIndexCard(tcggoId: string, signal?: AbortSignal) {
    return this.repository.getIndexCard(tcggoId, signal);
  }

  getById(tcggoId: string, signal?: AbortSignal) {
    return this.repository.getById(tcggoId, signal);
  }
}
