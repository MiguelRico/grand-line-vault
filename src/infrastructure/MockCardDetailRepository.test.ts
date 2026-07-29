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
    {
      id: 'OP01-001_p1',
      variant_type: 'PARALLEL',
      label: 'Parallel 1',
      number: 1,
      image: 'https://example.test/parallel-1.png',
      language: 'EN',
    },
    {
      id: 'OP01-001_p2',
      variant_type: 'ALTERNATE_ART',
      label: 'Arte alternativo 2',
      number: 2,
      image: 'https://example.test/parallel-2.png',
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
      external_id: `MOCK::${indexCard.id}::BASE`,
      image: indexCard.image,
      card_number: indexCard.card_number,
      game: {
        cost: 7,
        life: 4,
        power: 9000,
        counter: 2000,
      },
      source: { providerId: 'MOCK', providerCardId: `MOCK::${indexCard.id}` },
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
    expect(detail?.artworks.map((variant) => variant.image)).toEqual([
      'https://example.test/parallel-1.png',
      'https://example.test/parallel-2.png',
    ]);
    expect(detail?.artworks.map((variant) => variant.label)).toEqual([
      'Parallel 1',
      'Arte alternativo 2',
    ]);
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
    expect(variant?.print?.label).toBe('Parallel 1');
    expect(variant?.image).toBe('https://example.test/parallel-1.png');
    expect(variant?.game.cost).toBe(indexCard.game.cost);
    expect(variant?.source.providerVariantId).toBe('OP01-001_p1');
  });

  it('namespaces mock variant identities and images by catalog card', async () => {
    const repository = new MockCardDetailRepository();
    const secondCard: CatalogCard = {
      ...indexCard,
      id: 'CARD::OP02-001',
      card_number: 'OP02-001',
      normalized_card_number: 'OP02-001',
      image: 'https://example.test/second-base.png',
      variants: [
        {
          id: 'OP02-001',
          variant_type: 'BASE',
          label: 'Arte base',
          image: 'https://example.test/second-base.png',
          language: 'EN',
        },
        {
          id: 'OP02-001_p1',
          variant_type: 'PARALLEL',
          label: 'Parallel 1',
          number: 1,
          image: 'https://example.test/second-parallel.png',
          language: 'EN',
        },
      ],
      variantCount: 1,
      totalVariants: 2,
    };

    const firstDetail = await repository.getById(null, undefined, {
      cardNumber: indexCard.card_number,
      catalogId: indexCard.id,
      indexCard,
    });
    const secondDetail = await repository.getById(null, undefined, {
      cardNumber: secondCard.card_number,
      catalogId: secondCard.id,
      indexCard: secondCard,
    });

    expect(firstDetail?.artworks[0]?.external_id).not.toBe(secondDetail?.artworks[0]?.external_id);
    expect(secondDetail?.artworks[0]?.image).toBe('https://example.test/second-parallel.png');
    expect(
      await repository.getVariantById(secondDetail?.artworks[0]?.external_id ?? ''),
    ).toMatchObject({
      image: 'https://example.test/second-parallel.png',
      print: { label: 'Parallel 1' },
    });
  });
});
