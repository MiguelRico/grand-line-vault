import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CatalogCriteria } from '../domain/models';
import { mockCards } from './mockData';
import { AppsScriptCatalogRepository, MockCatalogRepository } from './repositories';

const criteria: CatalogCriteria = {
  query: '',
  setCode: '',
  color: '',
  type: '',
  rarity: '',
  variant: '',
  sort: 'code',
  direction: 'asc',
  page: 1,
  pageSize: 12,
};

describe('MockCatalogRepository', () => {
  it('searches by name and code using the normalized contract', async () => {
    const repository = new MockCatalogRepository();
    const byName = await repository.search({ ...criteria, query: 'Zoro' });
    const byCode = await repository.search({ ...criteria, query: 'OP01-005' });
    expect(byName.items[0]?.name).toBe('Roronoa Zoro');
    expect(byCode.items[0]?.name).toBe('Nami');
    expect(byName.meta.provider).toBe('MOCK');
  });

  it('combines filters and pagination', async () => {
    const repository = new MockCatalogRepository();
    const result = await repository.search({
      ...criteria,
      type: 'CHARACTER',
      color: 'RED',
      pageSize: 3,
    });
    expect(result.items).toHaveLength(3);
    expect(result.total).toBeGreaterThan(3);
    expect(result.items.every((card) => card.type === 'CHARACTER')).toBe(true);
  });

  it('summarizes every filter exposed by the catalog', async () => {
    const [status] = await new MockCatalogRepository().getProviderStatuses();

    expect(status?.filterSummary?.sets.length).toBeGreaterThan(0);
    expect(status?.filterSummary?.colors.some((bucket) => bucket.value === 'RED')).toBe(true);
    expect(status?.filterSummary?.types.some((bucket) => bucket.value === 'CHARACTER')).toBe(true);
    expect(status?.filterSummary?.rarities.length).toBeGreaterThan(0);
    expect(status?.filterSummary?.variants.some((bucket) => bucket.value === 'BASE')).toBe(true);
    expect(status?.filterSummary?.costs.length).toBeGreaterThan(0);
    expect(status?.filterSummary?.powers.length).toBeGreaterThan(0);
  });
});

describe('AppsScriptCatalogRepository', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('combines Apps Script data and response metadata', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { items: [mockCards[0]], page: 1, pageSize: 12, total: 1 },
            meta: {
              provider: 'OPTCG_API',
              fallbackUsed: false,
              cached: false,
              partialData: false,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    const result = await new AppsScriptCatalogRepository(
      'https://example.test/exec',
      'ARJUNKAI_OPTCG',
    ).search(criteria);

    expect(result.items).toHaveLength(1);
    expect(result.meta.provider).toBe('OPTCG_API');
    expect(result.meta.fallbackUsed).toBe(false);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('provider=ARJUNKAI_OPTCG'), {
      signal: undefined,
    });
  });

  it('loads every set exposed by Apps Script', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: [
              { code: 'OP-01', name: 'Romance Dawn' },
              { code: 'OP-02', name: 'Paramount War' },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    const sets = await new AppsScriptCatalogRepository('https://example.test/exec').listSets();

    expect(sets).toEqual([
      { code: 'OP-01', name: 'Romance Dawn' },
      { code: 'OP-02', name: 'Paramount War' },
    ]);
  });

  it('loads provider availability from the dedicated resource', async () => {
    const providerStatuses = [
      {
        providerId: 'ARJUNKAI_OPTCG' as const,
        name: 'Arjunkai OPTCG',
        enabled: true,
        configured: true,
        available: true,
        totalCards: 4566,
        filterSummary: {
          sets: [{ value: 'OP-01', label: 'Romance Dawn', count: 121 }],
          colors: [{ value: 'RED', count: 700 }],
          types: [{ value: 'CHARACTER', count: 3000 }],
          rarities: [{ value: 'C', count: 1000 }],
          variants: [{ value: 'BASE', count: 3500 }],
          costs: [{ value: '1', count: 400 }],
          powers: [{ value: '5000', count: 800 }],
        },
        latencyMs: 120,
        checkedAt: '2026-07-25T10:00:00.000Z',
      },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: providerStatuses }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const result = await new AppsScriptCatalogRepository(
      'https://example.test/exec',
    ).getProviderStatuses();

    expect(result).toEqual(providerStatuses);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('resource=provider-statuses'), {
      signal: undefined,
    });
  });
});
