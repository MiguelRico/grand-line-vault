import type { CatalogCriteria } from './models';
import type { CardDetailRepository, CatalogIndexRepository } from './repositories';

export class CatalogUseCases {
  constructor(
    private readonly indexRepository: CatalogIndexRepository,
    private readonly detailRepository: CardDetailRepository,
  ) {}

  search(criteria: CatalogCriteria, signal?: AbortSignal) {
    return this.indexRepository.search(criteria, signal);
  }

  listSets(signal?: AbortSignal) {
    return this.indexRepository.listSets(signal);
  }

  getIndexCard(catalogId: string, signal?: AbortSignal) {
    return this.indexRepository.getIndexCard(catalogId, signal);
  }

  getById(
    tcggoId: string | null,
    signal?: AbortSignal,
    fallback?: {
      cardNumber: string;
      catalogId: string;
      indexCard?: import('./models').CatalogCard;
    },
  ) {
    return this.detailRepository.getById(tcggoId, signal, fallback);
  }

  getVariantById(tcggoId: string, signal?: AbortSignal) {
    return this.detailRepository.getVariantById(tcggoId, signal);
  }
}
