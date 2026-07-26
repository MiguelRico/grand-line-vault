import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CatalogCriteria } from '../domain/models';
import { StaticCatalogRepository } from './StaticCatalogRepository';
import {
  loadStaticCatalog,
  resolveCatalogImageUrl,
  resetStaticCatalogCache,
  type StaticCatalogManifest,
} from './staticCatalog';

const version = 'abc123';
const manifest: StaticCatalogManifest = {
  schemaVersion: 1,
  catalogVersion: version,
  generatedAt: '2026-07-25T00:00:00.000Z',
  totalCards: 2,
  totalBaseCards: 1,
  totalVariants: 1,
  totalSets: 1,
  cardsUrl: `/catalog/cards.${version}.json`,
  setsUrl: `/catalog/sets.${version}.json`,
  filtersUrl: `/catalog/filters.${version}.json`,
  legacyIdMapUrl: `/catalog/legacy-id-map.${version}.json`,
};
const baseCard = {
  id: 'OP01-001',
  sourceId: 'OP01-001',
  baseCardId: 'OP01-001',
  cardNumber: 'OP01-001',
  name: 'Luffy',
  category: 'LEADER',
  rarity: 'L',
  colors: ['Red'],
  cost: null,
  life: 5,
  power: 5000,
  counter: null,
  attributes: ['Strike'],
  traits: ['Straw Hat Crew'],
  effect: null,
  trigger: null,
  imageUrl: 'https://example.test/base.png',
  variant: { type: 'base', number: null },
  sets: [{ id: 'OP-01', sourceSeriesId: '1', name: 'Romance Dawn' }],
  contentFingerprint: 'base',
};
const variantCard = {
  ...baseCard,
  id: 'OP01-001_p1',
  sourceId: 'OP01-001_p1',
  imageUrl: 'https://example.test/p1.png',
  variant: { type: 'parallel', number: 1 },
  contentFingerprint: 'parallel',
};
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

function mockCatalog(overrides: Partial<StaticCatalogManifest> = {}): ReturnType<typeof vi.fn> {
  const nextManifest = { ...manifest, ...overrides };
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.endsWith('manifest.json')) return Response.json(nextManifest);
    if (url.includes('/cards.'))
      return Response.json({
        schemaVersion: 1,
        catalogVersion: version,
        cards: [baseCard, variantCard],
      });
    if (url.includes('/sets.'))
      return Response.json({
        schemaVersion: 1,
        catalogVersion: version,
        sets: [{ id: 'OP-01', sourceSeriesId: '1', name: 'Romance Dawn', cardCount: 2 }],
      });
    return Response.json({
      'legacy-provider-id': 'OP01-001',
      'BASE::OP01-001': 'OP01-001',
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  resetStaticCatalogCache();
  vi.unstubAllGlobals();
});

describe('StaticCatalogRepository', () => {
  it('routes official card images through the same-origin proxy', () => {
    expect(
      resolveCatalogImageUrl(
        'https://en.onepiece-cardgame.com/images/cardlist/card/EB01-012_p3.png?260715',
      ),
    ).toBe('/api/catalog?file=EB01-012_p3.png&v=260715&action=image');
    expect(resolveCatalogImageUrl('https://example.test/card.png')).toBe(
      'https://example.test/card.png',
    );
    expect(
      resolveCatalogImageUrl(
        'https://en.onepiece-cardgame.com/images/cardlist/card/../../secret.png',
      ),
    ).toBe('');
  });

  it('loads manifest and catalog once and builds base/variant indexes', async () => {
    const fetchMock = mockCatalog();
    const repository = new StaticCatalogRepository();
    const [result, card] = await Promise.all([
      repository.search(criteria),
      repository.getById('OP01-001_p1'),
    ]);
    expect(result.items[0]).toMatchObject({ id: 'BASE::OP01-001', name: 'Luffy' });
    expect(result.items[0]?.artworks[0]?.id).toBe('VARIANT::OP01-001::OP01-001_p1');
    expect(card?.id).toBe('BASE::OP01-001');
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('resolves legacy IDs', async () => {
    mockCatalog();
    expect((await new StaticCatalogRepository().getById('legacy-provider-id'))?.card_number).toBe(
      'OP01-001',
    );
  });

  it('rejects incompatible manifest schemas', async () => {
    mockCatalog({ schemaVersion: 2 });
    await expect(loadStaticCatalog()).rejects.toThrow('No se pudo cargar el catálogo');
  });

  it('rejects incompatible payload versions', async () => {
    mockCatalog({ catalogVersion: 'different' });
    await expect(loadStaticCatalog()).rejects.toThrow('No se pudo cargar el catálogo');
  });

  it('reports HTTP and invalid JSON errors without caching failures', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('down', { status: 503 }))
      .mockResolvedValueOnce(new Response('{', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(loadStaticCatalog()).rejects.toThrow('No se pudo cargar el catálogo');
    await expect(loadStaticCatalog()).rejects.toThrow('No se pudo cargar el catálogo');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
