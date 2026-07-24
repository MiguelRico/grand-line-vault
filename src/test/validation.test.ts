import { describe, expect, it } from 'vitest';
import { collectionItemSchema } from '../../api/_shared/schemas';
import { initialCollection } from '../infrastructure/mockData';

describe('private API validation', () => {
  it('accepts a valid collection item', () => {
    expect(collectionItemSchema.safeParse(initialCollection[0]).success).toBe(true);
  });

  it('rejects a tradeable quantity above total quantity', () => {
    const fixture = initialCollection[0];
    expect(fixture).toBeDefined();
    if (!fixture) throw new Error('Fixture de colección incompleto.');
    const item = { ...fixture, quantity: 1, tradeableQuantity: 2 };
    expect(collectionItemSchema.safeParse(item).success).toBe(false);
  });
});
