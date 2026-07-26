import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CatalogCriteria } from '../domain/models';
import { OnePieceApiRepository } from './OnePieceApiRepository';
import type { OnePieceApiCard } from './onePieceApi';
import type { LoadedStaticCatalog } from './staticCatalog';

const emptyStaticCatalog = async (): Promise<LoadedStaticCatalog> => ({
  manifest: {
    schemaVersion: 1,
    catalogVersion: 'test',
    generatedAt: '2026-07-25T00:00:00.000Z',
    totalCards: 0,
    totalBaseCards: 0,
    totalVariants: 0,
    totalSets: 0,
    cardsUrl: '',
    setsUrl: '',
    filtersUrl: '',
    legacyIdMapUrl: '',
  },
  cards: [],
  sets: [],
  legacyIdMap: {},
});

const enrichedStaticCatalog = async (): Promise<LoadedStaticCatalog> => {
  const catalog = await emptyStaticCatalog();
  return {
    ...catalog,
    cards: [
      {
        id: 'static-teach',
        sourceId: 'OP09-093',
        baseCardId: 'OP09-093',
        cardNumber: 'OP09-093',
        name: 'Marshall.D.Teach',
        category: 'Leader',
        rarity: 'L',
        colors: ['Black'],
        cost: 5,
        life: 5,
        power: 5000,
        counter: null,
        attributes: ['Special'],
        traits: ['Blackbeard Pirates'],
        effect: 'Static catalog effect',
        trigger: null,
        imageUrl: null,
        variant: { type: 'base', number: null },
        sets: [{ id: 'OP-09', sourceSeriesId: 'OP09', name: 'Emperors' }],
        contentFingerprint: 'test',
      },
    ],
  };
};

const variantStaticCatalog = async (): Promise<LoadedStaticCatalog> => {
  const catalog = await enrichedStaticCatalog();
  const base = catalog.cards[0];
  if (!base) throw new Error('Static fixture is incomplete.');
  return {
    ...catalog,
    cards: [
      base,
      {
        ...base,
        id: 'static-teach-p1',
        sourceId: 'OP09-093_P1',
        imageUrl: null,
        variant: { type: 'parallel', number: 1 },
      },
    ],
  };
};

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
  card_code_number: 'OP09-093 L',
  hp: 5,
  supertype: 'Leader',
  tcgid: 12345,
  cardmarket_id: 843038,
  tcgplayer_id: 646572,
  artist: { id: 9, name: 'API Artist', slug: 'api-artist' },
  prices: {
    cardmarket: {
      currency: 'EUR',
      lowest_near_mint: 750,
      '30d_average': 740,
      available_items: 3,
    },
    tcg_player: { currency: 'USD', market_price: 720 },
  },
  episode: {
    id: 366,
    name: 'Emperors in the New World',
    slug: 'emperors-in-the-new-world',
    code: 'OP09',
    cards_total: 126,
    cards_printed_total: 178,
    prices: { tcg_player: { total: 999, currency: 'USD' } },
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

    const result = await new OnePieceApiRepository(enrichedStaticCatalog).search(criteria);

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
      game: {
        card_type: 'LEADER',
        cost: 5,
        power: 5000,
        traits: ['Blackbeard Pirates'],
      },
      artist: { name: 'API Artist' },
      prices: {
        cardmarket: { average_30d: 740, available_items: 3 },
        tcgplayer: { currency: 'USD', market_price: 720 },
      },
      enrichment: {
        status: 'MATCHED',
        providers: ['ONE_PIECE_API', 'OFFICIAL_STATIC'],
      },
    });
    expect(result.items[0]?.episode.prices?.tcgplayer).toEqual({
      total: 999,
      currency: 'USD',
    });
    expect(result.items[0]?.enrichment.provenance['game.power']).toMatchObject({
      providerId: 'OFFICIAL_STATIC',
      confidence: 'HIGH',
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

    const card = await new OnePieceApiRepository(emptyStaticCatalog).getById(
      'ONE_PIECE_API::28839',
    );

    expect(card?.artworks).toHaveLength(1);
    expect(card?.artworks[0]).toMatchObject({
      id: 'ONE_PIECE_API::28840',
      external_id: '28840',
      variant_type: 'UNKNOWN',
      label: 'Versión v2',
    });
  });

  it('skips the related-print request when the static catalog confirms a single print', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: { data: baseCard } }));
    vi.stubGlobal('fetch', fetchMock);

    const card = await new OnePieceApiRepository(enrichedStaticCatalog).getById(
      'ONE_PIECE_API::28839',
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(card?.artworks).toEqual([]);
  });

  it('reuses related prints when another artwork of the same card is opened', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ data: { data: baseCard } }))
      .mockResolvedValueOnce(
        Response.json({
          data: { data: [baseCard, variantCard], paging: { current: 1, total: 1, per_page: 100 } },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const repository = new OnePieceApiRepository(variantStaticCatalog);

    const base = await repository.getById('ONE_PIECE_API::28839');
    const variant = await repository.getById('ONE_PIECE_API::28840');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(base?.artworks[0]).toMatchObject({
      id: 'ONE_PIECE_API::28840',
      variant_type: 'PARALLEL',
      label: 'Parallel 1',
    });
    expect(variant?.print).toMatchObject({
      variant_type: 'PARALLEL',
      label: 'Parallel 1',
      static_id: 'OP09-093_P1',
      confidence: 'HIGH',
    });
  });

  it('uses search results as detail cache while they remain fresh', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        data: {
          data: [baseCard],
          paging: { current: 2, total: 5, per_page: 12 },
          results: 1,
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const repository = new OnePieceApiRepository(enrichedStaticCatalog);

    await repository.search(criteria);
    await repository.getById('ONE_PIECE_API::28839');

    expect(fetchMock).toHaveBeenCalledOnce();
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

    await expect(new OnePieceApiRepository(emptyStaticCatalog).search(criteria)).rejects.toThrow(
      'One Piece API todavía no está configurada.',
    );
  });
});
