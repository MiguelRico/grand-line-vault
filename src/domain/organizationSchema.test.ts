import { describe, expect, it } from 'vitest';
import { salesPackSchema, storageBoxSchema } from './organizationSchema';

const timestamp = '2026-08-07T00:00:00.000Z';

describe('organization schemas', () => {
  it('accepts bounded boxes and strips fields outside the persisted model', () => {
    const parsed = storageBoxSchema.parse({
      id: 'box-1',
      name: 'Caja principal',
      sections: [{ id: 'section-1', name: 'Líderes', code: 'LEADERS' }],
      createdAt: timestamp,
      updatedAt: timestamp,
      externalData: 'not persisted',
    });

    expect(parsed).not.toHaveProperty('externalData');
  });

  it('rejects invalid sales pack quantities', () => {
    const parsed = salesPackSchema.safeParse({
      id: 'pack-1',
      name: 'Pack',
      status: 'READY',
      items: [{ id: 'item-1', collectionItemId: 'collection-1', quantity: 0 }],
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    expect(parsed.success).toBe(false);
  });
});
