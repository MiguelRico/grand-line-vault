import { describe, expect, it } from 'vitest';
import type { CatalogCriteria } from '../domain/models';
import { MockCatalogRepository } from './repositories';

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
});
