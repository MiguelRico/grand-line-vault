import { describe, expect, it } from 'vitest';
import { initialCollection } from '../infrastructure/mockData';
import { groupCollectionItems } from './collectionGrouping';

describe('collection grouping', () => {
  it('groups lots and variants under their catalog card', () => {
    const base = initialCollection[0];
    if (!base) throw new Error('Fixture de colección incompleto.');
    const variant = {
      ...base,
      id: 'alternate-lot',
      catalogVariantId: 'alternate-art',
      quantity: 2,
      variant: {
        id: 'alternate-art',
        variant_type: 'ALTERNATE_ART' as const,
        label: 'Arte alternativo',
        number: 1,
        image: '/alternate.png',
        language: 'EN' as const,
      },
    };
    const secondBaseLot = { ...base, id: 'second-base-lot', quantity: 1 };

    const [group] = groupCollectionItems([variant, secondBaseLot, base]);

    expect(group?.quantity).toBe(base.quantity + 3);
    expect(group?.variants).toHaveLength(2);
    expect(group?.variants[0]?.id).toBeNull();
    expect(group?.variants[0]?.items).toHaveLength(2);
    expect(group?.variants[1]?.variant?.image).toBe('/alternate.png');
  });
});
