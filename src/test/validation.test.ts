import { describe, expect, it } from 'vitest';
import { appSettingsSchema, collectionItemSchema } from '../../api/_shared/schemas';
import { initialCollection } from '../infrastructure/mockData';

describe('private API validation', () => {
  it('accepts only supported catalog providers and themes', () => {
    expect(
      appSettingsSchema.safeParse({ theme: 'DARK' }).success,
    ).toBe(true);
    expect(
      appSettingsSchema.safeParse({ theme: 'SYSTEM' }).success,
    ).toBe(false);
  });

  it('accepts a valid collection item', () => {
    expect(collectionItemSchema.safeParse(initialCollection[0]).success).toBe(true);
  });

  it('rejects a section without a box', () => {
    const fixture = initialCollection[0];
    expect(fixture).toBeDefined();
    if (!fixture) throw new Error('Fixture de colección incompleto.');
    const item = { ...fixture, boxId: undefined, sectionId: 'section-a' };
    expect(collectionItemSchema.safeParse(item).success).toBe(false);
  });
});
