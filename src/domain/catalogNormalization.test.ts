import { describe, expect, it } from 'vitest';
import type { CollectionItem } from './models';
import {
  collectionItemIdentity,
  migrateCollectionItem,
  normalizeCardNumber,
  normalizeCatalogPrices,
  normalizeExpansionCode,
  normalizeRarity,
} from './catalogNormalization';

describe('catalog normalization', () => {
  it('normalizes identifiers and vocabularies shared by both providers', () => {
    expect(normalizeCardNumber(' op-01-001 ')).toBe('OP01-001');
    expect(normalizeExpansionCode('OP-09')).toBe('OP09');
    expect(normalizeRarity('Super Rare')).toBe('SUPER_RARE');
    expect(normalizeRarity('SP Card')).toBe('SPECIAL');
    expect(normalizeRarity('not documented')).toBe('UNKNOWN');
  });

  it('normalizes the real API price aliases without losing enriched market data', () => {
    expect(
      normalizeCatalogPrices({
        cardmarket: {
          currency: 'EUR',
          lowest_near_mint: 12.5,
          lowest_near_mint_EU_only: 13,
          '30d_average': 11.75,
          '7d_average': 12,
          available_items: 8,
          graded: [{ grade: 'PSA 10', price: 80 }],
        },
        tcg_player: { currency: 'USD', market_price: 14.25 },
      }),
    ).toEqual({
      cardmarket: {
        currency: 'EUR',
        lowest_near_mint: 12.5,
        lowest_near_mint_FR: undefined,
        lowest_near_mint_EU_only: 13,
        lowest_near_mint_FR_EU_only: undefined,
        average_30d: 11.75,
        average_7d: 12,
        available_items: 8,
        graded: [{ grade: 'PSA 10', price: 80 }],
      },
      tcgplayer: { currency: 'USD', market_price: 14.25 },
    });
  });

  it('migrates legacy collection snapshots and derives a stable print identity', () => {
    const legacy = {
      id: 'legacy-item',
      cardId: 'legacy-card',
      cardVariantId: 'legacy-print',
      cardSnapshot: {
        code: 'OP-01-001',
        name: 'Monkey D. Luffy',
        setCode: 'OP-01',
        imageUrl: 'https://example.test/card.png',
      },
      quantity: 1,
      language: 'EN',
      condition: 'NEAR_MINT',
      favorite: false,
      createdAt: '2026-07-25T00:00:00.000Z',
      updatedAt: '2026-07-25T00:00:00.000Z',
    } as unknown as CollectionItem;

    const migrated = migrateCollectionItem(legacy);

    expect(migrated.cardSnapshot).toMatchObject({
      schemaVersion: 2,
      normalizedCardNumber: 'OP01-001',
      printKey: 'LEGACY_EXTERNAL::OP01-001::BASE',
    });
    expect(collectionItemIdentity(migrated)).toBe(
      'LEGACY_EXTERNAL::OP01-001::BASE::EN::NEAR_MINT::UNASSIGNED::UNASSIGNED',
    );
  });
});
