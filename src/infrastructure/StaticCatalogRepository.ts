import type {
  Card,
  CardVariantType,
  CatalogCriteria,
  PaginatedResult,
} from '../domain/models';
import type { CatalogRepository } from './repositories';
import {
  loadStaticCatalog,
  resolveCatalogImageUrl,
  toCardColor,
  toCardType,
  type LoadedStaticCatalog,
  type StaticCatalogCard,
} from './staticCatalog';

function variantType(card: StaticCatalogCard): CardVariantType {
  if (card.variant.type === 'reprint') return 'REPRINT';
  if (card.variant.type === 'parallel') return 'PARALLEL';
  return 'UNKNOWN';
}

function mapCards(catalog: LoadedStaticCatalog): Card[] {
  const groups = new Map<string, StaticCatalogCard[]>();
  catalog.cards.forEach((card) => {
    const group = groups.get(card.baseCardId) ?? [];
    group.push(card);
    groups.set(card.baseCardId, group);
  });
  return [...groups.entries()].flatMap(([code, versions]) => {
    const base = versions.find((version) => version.variant.type === 'base') ?? versions[0];
    if (!base) return [];
    const source = {
      providerId: 'OFFICIAL_STATIC' as const,
      providerCardId: base.sourceId,
      fetchedAt: catalog.manifest.generatedAt,
    };
    const primarySet = base.sets[0] ?? { id: 'UNKNOWN', name: 'Unknown' };
    return [{
      id: `BASE::${code}`,
      code,
      name: base.name,
      description: base.effect ?? undefined,
      type: toCardType(base.category),
      colors: base.colors.map(toCardColor).filter((color) => color !== null),
      rarity: base.rarity || undefined,
      set: { code: primarySet.id, name: primarySet.name },
      cost: base.cost ?? undefined,
      life: base.life ?? undefined,
      power: base.power ?? undefined,
      counter: base.counter ?? undefined,
      attributes: base.attributes,
      traits: base.traits,
      effect: base.effect ?? undefined,
      trigger: base.trigger ?? undefined,
      language: 'EN',
      imageUrl: resolveCatalogImageUrl(base.imageUrl),
      prices: [],
      sources: [source],
      variants: versions
        .filter((version) => version.id !== base.id)
        .map((version) => ({
          id: `VARIANT::${code}::${version.sourceId}`,
          baseCardId: `BASE::${code}`,
          type: variantType(version),
          label:
            version.variant.type === 'reprint'
              ? `Reprint ${version.variant.number ?? ''}`.trim()
              : `Parallel ${version.variant.number ?? ''}`.trim(),
          imageUrl: resolveCatalogImageUrl(version.imageUrl ?? base.imageUrl),
          language: 'EN' as const,
          prices: [],
          sources: [{ ...source, providerVariantId: version.sourceId }],
        })),
    }];
  });
}

function sortValue(card: Card, criteria: CatalogCriteria): string | number {
  if (criteria.sort === 'price') return card.prices[0]?.amount ?? Number.MAX_SAFE_INTEGER;
  if (criteria.sort === 'power') return card.power ?? 0;
  if (criteria.sort === 'cost') return card.cost ?? 0;
  return card[criteria.sort];
}

export class StaticCatalogRepository implements CatalogRepository {
  private cardsPromise: Promise<{ catalog: LoadedStaticCatalog; cards: Card[] }> | null = null;

  private load(): Promise<{ catalog: LoadedStaticCatalog; cards: Card[] }> {
    this.cardsPromise ??= loadStaticCatalog().then((catalog) => ({ catalog, cards: mapCards(catalog) }));
    return this.cardsPromise;
  }

  async search(criteria: CatalogCriteria, signal?: AbortSignal): Promise<PaginatedResult<Card>> {
    signal?.throwIfAborted();
    const { catalog, cards } = await this.load();
    signal?.throwIfAborted();
    const query = criteria.query.toLocaleLowerCase();
    const filtered = cards
      .filter(
        (card) =>
          (!query ||
            card.name.toLocaleLowerCase().includes(query) ||
            card.code.toLocaleLowerCase().includes(query)) &&
          (!criteria.setCode ||
            catalog.cards
              .filter((version) => version.baseCardId === card.code)
              .some((version) => version.sets.some((set) => set.id === criteria.setCode))) &&
          (!criteria.color || card.colors.includes(criteria.color)) &&
          (!criteria.type || card.type === criteria.type) &&
          (!criteria.rarity || card.rarity === criteria.rarity) &&
          (!criteria.variant ||
            (criteria.variant === 'BASE'
              ? true
              : card.variants.some((variant) => variant.type === criteria.variant))) &&
          (criteria.minCost === undefined || (card.cost ?? 0) >= criteria.minCost) &&
          (criteria.maxCost === undefined || (card.cost ?? 0) <= criteria.maxCost) &&
          (criteria.minPower === undefined || (card.power ?? 0) >= criteria.minPower) &&
          (criteria.maxPower === undefined || (card.power ?? 0) <= criteria.maxPower),
      )
      .sort((left, right) => {
        const leftValue = sortValue(left, criteria);
        const rightValue = sortValue(right, criteria);
        const comparison =
          typeof leftValue === 'number'
            ? leftValue - Number(rightValue)
            : String(leftValue).localeCompare(String(rightValue));
        return criteria.direction === 'asc' ? comparison : -comparison;
      });
    const offset = (criteria.page - 1) * criteria.pageSize;
    return {
      items: filtered.slice(offset, offset + criteria.pageSize),
      page: criteria.page,
      pageSize: criteria.pageSize,
      total: filtered.length,
      meta: {
        provider: 'OFFICIAL_STATIC',
        fallbackUsed: false,
        cached: true,
        partialData: false,
      },
    };
  }

  async getById(id: string, signal?: AbortSignal): Promise<Card | null> {
    signal?.throwIfAborted();
    const { catalog, cards } = await this.load();
    const sourceId = catalog.legacyIdMap[id] ?? id;
    const version = catalog.cards.find((card) => card.sourceId === sourceId);
    const baseId = version ? `BASE::${version.baseCardId}` : id;
    return cards.find((card) => card.id === baseId) ?? null;
  }

  async listSets(signal?: AbortSignal): Promise<Card['set'][]> {
    signal?.throwIfAborted();
    const { catalog } = await this.load();
    return catalog.sets.map((set) => ({ code: set.id, name: set.name }));
  }

}
