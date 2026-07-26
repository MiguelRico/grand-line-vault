import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CatalogCriteria } from '../domain/models';
import { OnePieceApiRepository } from './OnePieceApiRepository';
import type { OnePieceApiCard } from './onePieceApi';

const baseCard: OnePieceApiCard = {
  id: 28839,
  name: 'Marshall.D.Teach',
  name_numbered: 'Marshall.D.Teach OP09-093',
  slug: 'marshalldteach',
  type: 'singles',
  card_number: 'OP09-093',
  rarity: 'LEADER',
  color: 'Black',
  version: null,
  cardmarket_id: 843038,
  tcgplayer_id: 646572,
  prices: {
    cardmarket: { currency: 'EUR', lowest_near_mint: 750 },
    tcgplayer: { currency: 'EUR', market_price: 720 },
  },
  episode: {
    id: 366,
    name: 'Emperors in the New World',
    slug: 'emperors-in-the-new-world',
    code: 'OP09',
  },
  image: 'https://images.example.test/teach.webp',
};

const variantCard: OnePieceApiCard = {
  ...baseCard,
  id: 28840,
  version: 'v2',
  image: 'https://images.example.test/teach-v2.webp',
};

const criteria: CatalogCriteria = {
  query: 'Teach',
  setCode: '366',
  color: '',
  type: '',
  rarity: '',
  variant: '',
  sort: 'price',
  direction: 'desc',
  page: 2,
  pageSize: 12,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('OnePieceApiRepository', () => {
  it('maps the paginated API response to the canonical card model', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        data: {
          data: [baseCard],
          paging: { current: 2, total: 5, per_page: 12 },
          results: 51,
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await new OnePieceApiRepository().search(criteria);

    expect(result).toMatchObject({
      page: 2,
      pageSize: 12,
      total: 51,
      meta: { provider: 'ONE_PIECE_API' },
    });
    expect(result.items[0]).toMatchObject({
      id: 'ONE_PIECE_API::28839',
      external_id: '28839',
      card_number: 'OP09-093',
      image: baseCard.image,
      episode: { id: '366', code: 'OP09' },
      source: { providerId: 'ONE_PIECE_API' },
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('episode_id=366');
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('sort=price_highest');
  });

  it('loads every artwork sharing the card number for the detail view', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ data: { data: baseCard } }))
      .mockResolvedValueOnce(
        Response.json({
          data: { data: [baseCard, variantCard], paging: { current: 1, total: 1, per_page: 100 } },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const card = await new OnePieceApiRepository().getById('ONE_PIECE_API::28839');

    expect(card?.artworks).toHaveLength(1);
    expect(card?.artworks[0]).toMatchObject({
      id: 'ONE_PIECE_API::28840',
      external_id: '28840',
      variant_type: 'PARALLEL',
      label: 'Versión v2',
    });
  });

  it('surfaces the server message when the API key is not configured', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json(
          {
            error: {
              code: 'CATALOG_PROVIDER_NOT_CONFIGURED',
              message: 'One Piece API todavía no está configurada.',
            },
          },
          { status: 503 },
        ),
      ),
    );

    await expect(new OnePieceApiRepository().search(criteria)).rejects.toThrow(
      'One Piece API todavía no está configurada.',
    );
  });
});
