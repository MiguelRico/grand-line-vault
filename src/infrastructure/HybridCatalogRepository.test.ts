import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HybridCatalogRepository } from './HybridCatalogRepository';
import type { CatalogCriteria } from '../domain/models';

const criteria: CatalogCriteria = {
  query: 'Luffy',
  setCode: 'OP01',
  color: 'RED',
  type: 'LEADER',
  rarity: 'L',
  variant: 'BASE',
  minCost: 1,
  maxCost: 5,
  minPower: 4000,
  maxPower: 6000,
  sort: 'code',
  direction: 'asc',
  page: 1,
  pageSize: 24,
};

const apiCard = {
  id: 10,
  name: 'Monkey D. Luffy',
  name_numbered: 'Monkey D. Luffy OP01-003',
  slug: 'monkey-d-luffy',
  type: 'card',
  card_number: 'OP01-003',
  rarity: 'L',
  color: 'Red',
  image: 'https://example.test/luffy.png',
  episode: { id: 1, name: 'Romance Dawn', slug: 'romance-dawn', code: 'OP01' },
};

describe('HybridCatalogRepository', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('queries only the Firestore index for catalog searches', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        data: {
          items: [],
          page: 1,
          pageSize: 24,
          total: 0,
          meta: {
            provider: 'FIRESTORE_INDEX',
            fallbackUsed: false,
            cached: false,
            partialData: true,
          },
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await new HybridCatalogRepository().search(criteria);

    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain('action=index');
    expect(url).toContain('resource=cards');
    expect(url).not.toContain('action=detail');
  });

  it('loads a TCGGO detail once and reuses the expiring local cache', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ data: { card: apiCard, variants: [apiCard] } }));
    vi.stubGlobal('fetch', fetchMock);
    const repository = new HybridCatalogRepository();

    const first = await repository.getById('10');
    const second = await repository.getById('10');

    expect(first?.source.providerId).toBe('TCGGO');
    expect(second?.id).toBe(first?.id);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('action=detail&id=10');
  });

  it('resolves an unenriched index card by number and catalog id', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ data: { card: apiCard, variants: [apiCard] } }));
    vi.stubGlobal('fetch', fetchMock);

    await new HybridCatalogRepository().getById(null, undefined, {
      cardNumber: 'OP01-003',
      catalogId: 'CARD::OP01-003',
    });

    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain('cardNumber=OP01-003');
    expect(url).toContain('catalogId=CARD%3A%3AOP01-003');
  });

  it('loads a selected variant without requesting related prints', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ data: { card: apiCard, variants: [] } }));
    vi.stubGlobal('fetch', fetchMock);

    await new HybridCatalogRepository().getVariantById('10');

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('action=detail&id=10&related=false');
  });
});
