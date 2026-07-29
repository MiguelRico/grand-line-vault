import type { CatalogUseCases } from './catalogUseCases';
import type { WishlistEntry, WishlistItem } from './models';
import type { WishlistRepository } from './repositories';

export function wishlistEntryId(catalogCardId: string, catalogVariantId: string | null): string {
  return `${catalogCardId}::${catalogVariantId ?? 'BASE'}`;
}

export class WishlistService {
  constructor(
    private readonly ownerId: string,
    private readonly repository: WishlistRepository,
    private readonly catalog: CatalogUseCases,
  ) {}

  async listWishlist(): Promise<WishlistItem[]> {
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

  async add(catalogCardId: string, catalogVariantId: string | null): Promise<WishlistItem> {
    const card = await this.catalog.getIndexCard(catalogCardId);
    if (!card) throw new Error('La carta ya no existe en el índice del catálogo.');
    const variant = catalogVariantId
      ? (card.variants.find((candidate) => candidate.id === catalogVariantId) ?? null)
      : null;
    if (catalogVariantId && !variant)
      throw new Error('La variante ya no existe en el índice del catálogo.');

    const now = new Date().toISOString();
    const entry: WishlistEntry = {
      id: wishlistEntryId(catalogCardId, catalogVariantId),
      ownerId: this.ownerId,
      catalogCardId,
      catalogVariantId,
      createdAt: now,
      updatedAt: now,
    };
    const saved = await this.repository.save(entry);
    return { ...saved, card, variant };
  }

  remove(id: string): Promise<void> {
    return this.repository.remove(this.ownerId, id);
  }
}
