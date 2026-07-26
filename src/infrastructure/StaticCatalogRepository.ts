import type { Card, CardVariantType, CatalogCriteria, PaginatedResult } from '../domain/models';
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

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
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
    return [
      {
        id: `BASE::${code}`,
        external_id: base.sourceId,
        name: base.name,
        name_numbered: `${base.name} ${code}`,
        slug: slugify(base.name),
        type: 'singles',
        card_number: code,
        rarity: base.rarity || undefined,
        color: base.colors.join('/'),
        prices: {},
        episode: {
          id: primarySet.id,
          code: primarySet.id,
          name: primarySet.name,
          slug: slugify(primarySet.name),
        },
        image: resolveCatalogImageUrl(base.imageUrl),
        game: {
          card_type: toCardType(base.category),
          colors: base.colors.map(toCardColor).filter((color) => color !== null),
          cost: base.cost ?? undefined,
          life: base.life ?? undefined,
          power: base.power ?? undefined,
          counter: base.counter ?? undefined,
          attributes: base.attributes,
          traits: base.traits,
          effect: base.effect ?? undefined,
          trigger: base.trigger ?? undefined,
          language: 'EN',
        },
        source,
        artworks: versions
          .filter((version) => version.id !== base.id)
          .map((version) => ({
            id: `VARIANT::${code}::${version.sourceId}`,
            external_id: version.sourceId,
            base_card_id: `BASE::${code}`,
            variant_type: variantType(version),
            label:
              version.variant.type === 'reprint'
                ? `Reprint ${version.variant.number ?? ''}`.trim()
                : `Parallel ${version.variant.number ?? ''}`.trim(),
            image: resolveCatalogImageUrl(version.imageUrl ?? base.imageUrl),
            language: 'EN' as const,
            prices: {},
            source: { ...source, providerVariantId: version.sourceId },
          })),
      },
    ];
  });
}

function sortValue(card: Card, criteria: CatalogCriteria): string | number {
  if (criteria.sort === 'price')
    return (
      card.prices.cardmarket?.lowest_near_mint ??
      card.prices.tcgplayer?.market_price ??
      Number.MAX_SAFE_INTEGER
    );
  if (criteria.sort === 'power') return card.game.power ?? 0;
  if (criteria.sort === 'cost') return card.game.cost ?? 0;
  return criteria.sort === 'code' ? card.card_number : card.name;
}

export class StaticCatalogRepository implements CatalogRepository {
  private cardsPromise: Promise<{ catalog: LoadedStaticCatalog; cards: Card[] }> | null = null;

  private load(): Promise<{ catalog: LoadedStaticCatalog; cards: Card[] }> {
    this.cardsPromise ??= loadStaticCatalog().then((catalog) => ({
      catalog,
      cards: mapCards(catalog),
    }));
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
            card.card_number.toLocaleLowerCase().includes(query)) &&
          (!criteria.setCode ||
            catalog.cards
              .filter((version) => version.baseCardId === card.card_number)
              .some((version) => version.sets.some((set) => set.id === criteria.setCode))) &&
          (!criteria.color || card.game.colors.includes(criteria.color)) &&
          (!criteria.type || card.game.card_type === criteria.type) &&
          (!criteria.rarity || card.rarity === criteria.rarity) &&
          (!criteria.variant ||
            (criteria.variant === 'BASE'
              ? true
              : card.artworks.some((variant) => variant.variant_type === criteria.variant))) &&
          (criteria.minCost === undefined || (card.game.cost ?? 0) >= criteria.minCost) &&
          (criteria.maxCost === undefined || (card.game.cost ?? 0) <= criteria.maxCost) &&
          (criteria.minPower === undefined || (card.game.power ?? 0) >= criteria.minPower) &&
          (criteria.maxPower === undefined || (card.game.power ?? 0) <= criteria.maxPower),
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

  async listSets(signal?: AbortSignal): Promise<Card['episode'][]> {
    signal?.throwIfAborted();
    const { catalog } = await this.load();
    return catalog.sets.map((set) => ({
      id: set.id,
      code: set.id,
      name: set.name,
      slug: slugify(set.name),
    }));
  }
}
