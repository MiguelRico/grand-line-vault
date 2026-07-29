import { describe, expect, it } from 'vitest';
import type { CollectionEntry } from './models';
import {
  collectionItemIdentity,
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

  it('builds the collection identity from catalog references', () => {
    const item: CollectionEntry = {
      id: 'item',
      ownerId: 'user',
      catalogCardId: 'CARD::OP01-001',
      catalogVariantId: 'OP01-001',
      quantity: 1,
      language: 'EN',
      condition: 'NEAR_MINT',
      favorite: false,
      createdAt: '2026-07-25T00:00:00.000Z',
      updatedAt: '2026-07-25T00:00:00.000Z',
    };

    expect(collectionItemIdentity(item)).toBe(
      'CARD::OP01-001::OP01-001::EN::NEAR_MINT::UNASSIGNED::UNASSIGNED',
    );
  });
});
