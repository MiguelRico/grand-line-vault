import { describe, expect, it } from 'vitest';
import type { LoadedStaticCatalog, StaticCatalogCard } from '../infrastructure/staticCatalog';
import { calculateCatalogStatistics } from './CatalogStatisticsPage';

function card(
  id: string,
  variant: StaticCatalogCard['variant']['type'],
  overrides: Partial<StaticCatalogCard> = {},
): StaticCatalogCard {
  return {
    id,
    sourceId: id,
    baseCardId: 'OP01-001',
    cardNumber: 'OP01-001',
    name: 'Luffy',
    category: 'CHARACTER',
    rarity: 'SR',
    colors: ['Red'],
    cost: 3,
    life: null,
    power: 5000,
    counter: 1000,
    attributes: ['Strike'],
    traits: ['Straw Hat Crew'],
    effect: null,
    trigger: null,
    imageUrl: 'https://example.test/card.png',
    variant: { type: variant, number: variant === 'base' ? null : 1 },
    sets: [{ id: 'OP-01', sourceSeriesId: '1', name: 'Romance Dawn' }],
    contentFingerprint: id,
    ...overrides,
  };
}

describe('calculateCatalogStatistics', () => {
  it('separates base-card distributions from artwork totals', () => {
    const catalog: LoadedStaticCatalog = {
      manifest: {
        schemaVersion: 1,
        catalogVersion: 'test',
        generatedAt: '2026-07-25T00:00:00.000Z',
        totalCards: 3,
        totalBaseCards: 2,
        totalVariants: 1,
        totalSets: 2,
        cardsUrl: '',
        setsUrl: '',
        filtersUrl: '',
      },
      cards: [
        card('OP01-001', 'base'),
        card('OP01-001_p1', 'parallel'),
        card('OP01-002', 'base', {
          baseCardId: 'OP01-002',
          cardNumber: 'OP01-002',
          category: 'LEADER',
          rarity: 'L',
          colors: ['Red', 'Green'],
          imageUrl: null,
        }),
      ],
      sets: [
        { id: 'OP-01', sourceSeriesId: '1', name: 'Romance Dawn', cardCount: 2 },
        { id: 'OP-02', sourceSeriesId: '2', name: 'Paramount War', cardCount: 1 },
      ],
    };

    const stats = calculateCatalogStatistics(catalog);

    expect(stats).toMatchObject({
      totalRecords: 3,
      totalBaseCards: 2,
      totalVariants: 1,
      totalSets: 2,
      cardsWithImages: 2,
    });
    expect(stats.imageCoverage).toBeCloseTo(66.67, 1);
    expect(stats.categories).toEqual([
      { label: 'CHARACTER', value: 1 },
      { label: 'LEADER', value: 1 },
    ]);
    expect(stats.colors).toEqual([
      { label: 'Red', value: 2 },
      { label: 'Green', value: 1 },
    ]);
    expect(stats.topSets[0]).toEqual({ label: 'Romance Dawn', value: 2 });
  });
});
