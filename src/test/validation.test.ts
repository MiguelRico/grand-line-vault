import { describe, expect, it } from 'vitest';
import { collectionEntrySchema } from '../domain/collectionSchema';
import { initialCollection } from '../infrastructure/mockData';

function persistentFixture() {
  const fixture = initialCollection[0];
  if (!fixture) throw new Error('Fixture de colección incompleto.');
  return {
    id: fixture.id,
    ownerId: fixture.ownerId,
    catalogCardId: fixture.catalogCardId,
    catalogVariantId: fixture.catalogVariantId,
    quantity: fixture.quantity,
    language: fixture.language,
    condition: fixture.condition,
    favorite: fixture.favorite,
    boxId: fixture.boxId,
    sectionId: fixture.sectionId,
    acquisitionPrice: fixture.acquisitionPrice,
    notes: fixture.notes,
    createdAt: fixture.createdAt,
    updatedAt: fixture.updatedAt,
  };
}

describe('collection persistence validation', () => {
  it('accepts a valid collection item', () => {
    expect(collectionEntrySchema.safeParse(persistentFixture()).success).toBe(true);
  });

  it('rejects a section without a box', () => {
    const fixture = persistentFixture();
    const item = { ...fixture, boxId: undefined, sectionId: 'section-a' };
    expect(collectionEntrySchema.safeParse(item).success).toBe(false);
  });

  it('rejects incomplete catalog references', () => {
    const fixture = persistentFixture();
    const incomplete = {
      ...fixture,
      catalogCardId: '',
    };

    expect(collectionEntrySchema.safeParse(incomplete).success).toBe(false);
  });

  it('rejects persisted collection records that cannot be normalized safely', () => {
    const fixture = persistentFixture();
    expect(
      collectionEntrySchema.safeParse({
        ...fixture,
        catalogVariantId: 42,
      }).success,
    ).toBe(false);
  });
});
