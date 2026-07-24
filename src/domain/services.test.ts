import { describe, expect, it } from 'vitest';
import {
  calculateCollectionStats,
  collectionKey,
  reservedQuantities,
  salesPackAvailabilityWarnings,
  sectionLabel,
} from './services';
import { initialBoxes, initialCollection, initialSalesPacks } from '../infrastructure/mockData';

describe('collection domain', () => {
  it('calculates copies, unique cards, duplicates and value', () => {
    const stats = calculateCollectionStats(initialCollection, 'USD');
    expect(stats.totalCopies).toBe(24);
    expect(stats.uniqueCards).toBe(12);
    expect(stats.duplicateCopies).toBe(12);
    expect(stats.estimatedValue.currency).toBe('USD');
    expect(stats.estimatedValue.amount).toBeGreaterThan(0);
  });

  it('builds a stable grouping key', () => {
    expect(collectionKey('BASE::OP01-001', 'BASE::OP01-001', 'EN', 'NEAR_MINT')).toBe(
      'BASE::OP01-001::BASE::OP01-001::EN::NEAR_MINT::UNASSIGNED::UNASSIGNED',
    );
  });

  it('resolves physical locations', () => {
    expect(sectionLabel(initialBoxes, 'box-1', 'section-a')).toContain('Caja principal');
    expect(sectionLabel(initialBoxes)).toBe('Sin ubicar');
  });

  it('reserves stock and warns when a sales pack exceeds availability', () => {
    const initialPack = initialSalesPacks[0];
    const initialItem = initialPack?.items[0];
    expect(initialPack).toBeDefined();
    expect(initialItem).toBeDefined();
    if (!initialPack || !initialItem) throw new Error('Fixture de pack incompleto.');
    expect(reservedQuantities(initialSalesPacks).get(initialItem.collectionItemId)).toBe(1);
    const pack = {
      ...initialPack,
      items: [{ ...initialItem, quantity: 99 }],
    };
    expect(salesPackAvailabilityWarnings(pack, initialCollection)).toHaveLength(1);
  });
});
