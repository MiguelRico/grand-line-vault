import { describe, expect, it } from 'vitest';
import { appSettingsSchema, collectionItemSchema } from '../../api/_shared/schemas';
import { initialCollection } from '../infrastructure/mockData';

describe('private API validation', () => {
  it('accepts only supported catalog providers and themes', () => {
    expect(
      appSettingsSchema.safeParse({ theme: 'DARK', catalogDataSource: 'ONE_PIECE_API' }).success,
    ).toBe(true);
    expect(appSettingsSchema.safeParse({ theme: 'SYSTEM' }).success).toBe(false);
    expect(
      appSettingsSchema.safeParse({ theme: 'LIGHT', catalogDataSource: 'UNTRUSTED_API' }).success,
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

  it('upgrades a legacy collection snapshot to schema version 2', () => {
    const fixture = initialCollection[0];
    expect(fixture).toBeDefined();
    if (!fixture) throw new Error('Fixture de colección incompleto.');
    const legacy = {
      ...fixture,
      cardSnapshot: {
        code: 'OP-01-001',
        name: 'Monkey D. Luffy',
        setCode: 'OP-01',
        imageUrl: 'https://example.test/card.png',
      },
    };

    const result = collectionItemSchema.safeParse(legacy);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.cardSnapshot).toMatchObject({
      schemaVersion: 2,
      normalizedCardNumber: 'OP01-001',
      printKey: 'LEGACY_EXTERNAL::OP01-001::BASE',
    });
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
