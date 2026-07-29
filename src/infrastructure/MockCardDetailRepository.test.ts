import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CatalogCard } from '../domain/models';
import { MockCardDetailRepository } from './MockCardDetailRepository';

const indexCard: CatalogCard = {
  id: 'CARD::OP01-001',
  tcggoId: '48398',
  name: 'Monkey D. Luffy',
  normalizedName: 'MONKEY D. LUFFY',
  card_number: 'OP01-001',
  normalized_card_number: 'OP01-001',
  image: 'https://example.test/index-image.png',
  episode: {
    id: '1',
    name: 'Romance Dawn',
    code: 'OP-01',
    normalized_code: 'OP-01',
  },
  setCodes: ['OP-01', 'PRB-01'],
  rarity: 'L',
  rarity_normalized: 'LEADER',
  color: 'Red',
  artist: null,
  game: {
    card_type: 'LEADER',
    colors: ['RED'],
    cost: 7,
    life: 4,
    power: 9000,
    counter: 2000,
    attributes: ['Strike'],
  },
  variantTypes: ['BASE', 'PARALLEL'],
  variantCount: 5,
  totalVariants: 6,
  variants: [
    {
      id: 'OP01-001',
      variant_type: 'BASE',
      label: 'Arte base',
      image: 'https://example.test/index-image.png',
      language: 'EN',
    },
  ],
  source: {
    providerId: 'FIRESTORE_INDEX',
    providerCardId: 'OP01-001',
    fetchedAt: '2026-01-01T00:00:00.000Z',
  },
};

describe('MockCardDetailRepository', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('builds a complete detail from the index without HTTP or TCGGO identifiers', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const repository = new MockCardDetailRepository();

    const detail = await repository.getById('48398', undefined, {
      cardNumber: indexCard.card_number,
      catalogId: indexCard.id,
      indexCard,
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(detail).toMatchObject({
      external_id: 'mock-base',
      image: indexCard.image,
      card_number: indexCard.card_number,
      game: {
        cost: 7,
        life: 4,
        power: 9000,
        counter: 2000,
      },
      source: { providerId: 'MOCK', providerCardId: 'mock-card-detail' },
    });
    expect(detail?.external_id).not.toBe(indexCard.tcggoId);
    expect(detail?.artist?.name).toBeTruthy();
    expect(detail?.prices.cardmarket?.graded).toHaveLength(2);
    expect(detail?.episode.prices?.tcgplayer?.total).toBeGreaterThan(0);
    expect(detail?.game.effect).toBeTruthy();
    expect(detail?.game.trigger).toBeTruthy();
    expect(detail?.game.don).toBeTruthy();
    expect(detail?.artworks).toHaveLength(2);
    expect(detail?.printings).toHaveLength(3);
  });

  it('serves mock variant details from memory without HTTP', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const repository = new MockCardDetailRepository();
    const base = await repository.getById(null, undefined, {
      cardNumber: indexCard.card_number,
      catalogId: indexCard.id,
      indexCard,
    });
    const variant = await repository.getVariantById(base?.artworks[0]?.external_id ?? '');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(variant?.print?.label).toBe('Parallel mock');
    expect(variant?.image).toBe(indexCard.image);
    expect(variant?.game.cost).toBe(indexCard.game.cost);
  });
});
