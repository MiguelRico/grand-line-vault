import { describe, expect, it } from 'vitest';
import { appSettingsSchema, collectionItemSchema } from '../../api/_shared/schemas';
import { initialCollection } from '../infrastructure/mockData';

describe('private API validation', () => {
  it('persists appearance without a selectable catalog provider', () => {
    expect(appSettingsSchema.safeParse({ theme: 'DARK' }).success).toBe(true);
    expect(appSettingsSchema.safeParse({ theme: 'SYSTEM' }).success).toBe(false);
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

  it('rejects incomplete collection snapshots', () => {
    const fixture = initialCollection[0];
    expect(fixture).toBeDefined();
    if (!fixture) throw new Error('Fixture de colección incompleto.');
    const incomplete = {
      ...fixture,
      cardSnapshot: {
        code: 'OP-01-001',
        name: 'Monkey D. Luffy',
        setCode: 'OP-01',
        imageUrl: 'https://example.test/card.png',
      },
    };

    expect(collectionItemSchema.safeParse(incomplete).success).toBe(false);
  });

  it('rejects persisted collection records that cannot be normalized safely', () => {
    const fixture = initialCollection[0];
    expect(fixture).toBeDefined();
    if (!fixture) throw new Error('Fixture de colección incompleto.');
    expect(
      collectionItemSchema.safeParse({
        ...fixture,
        cardSnapshot: { ...fixture.cardSnapshot, code: '' },
      }).success,
    ).toBe(false);
  });
});
