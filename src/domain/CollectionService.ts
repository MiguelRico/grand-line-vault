import type { CatalogUseCases } from './catalogUseCases';
import type { CollectionEntry, CollectionItem } from './models';
import type { CollectionRepository } from './repositories';

export class CollectionService {
  constructor(
    private readonly ownerId: string,
    private readonly repository: CollectionRepository,
    private readonly catalog: CatalogUseCases,
  ) {}

  async listCollection(): Promise<CollectionItem[]> {
    const entries = await this.repository.list(this.ownerId);
    const cards = new Map(
      (
        await Promise.all(
          [...new Set(entries.map((entry) => entry.catalogCardId))].map((id) =>
            this.catalog.getIndexCard(id),
          ),
        )
      )
        .filter((card) => card !== null)
        .map((card) => [card.id, card] as const),
    );

    return entries.flatMap((entry) => {
      const card = cards.get(entry.catalogCardId);
      if (!card) return [];
      const variant =
        card.variants.find((candidate) => candidate.id === entry.catalogVariantId) ?? null;
      return [{ ...entry, card, variant }];
    });
  }

  async saveCollection(
    entry: Omit<CollectionEntry, 'ownerId'> & { ownerId?: string },
  ): Promise<CollectionItem> {
    if (entry.ownerId && entry.ownerId !== this.ownerId)
      throw new Error('La colección pertenece a otro usuario.');
    const saved = await this.repository.save({ ...entry, ownerId: this.ownerId });
    const card = await this.catalog.getIndexCard(saved.catalogCardId);
    if (!card) throw new Error('La carta ya no existe en el índice del catálogo.');
    return {
      ...saved,
      card,
      variant: card.variants.find((candidate) => candidate.id === saved.catalogVariantId) ?? null,
    };
  }

  removeCollection(id: string): Promise<void> {
    return this.repository.remove(this.ownerId, id);
  }
}
