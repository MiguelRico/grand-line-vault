import { describe, expect, it } from 'vitest';
import { calculateCollectionStats, collectionKey, deckAvailabilityWarnings } from './services';
import { initialCollection, initialDecks } from '../infrastructure/mockData';

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
      'BASE::OP01-001::BASE::OP01-001::EN::NEAR_MINT',
    );
  });

  it('warns when a deck uses unavailable copies', () => {
    const initialDeck = initialDecks[0];
    const initialCard = initialDeck?.cards[0];
    expect(initialDeck).toBeDefined();
    expect(initialCard).toBeDefined();
    if (!initialDeck || !initialCard) throw new Error('Fixture de mazo incompleto.');
    const deck = {
      ...initialDeck,
      cards: [{ ...initialCard, quantity: 99 }],
    };
    expect(deckAvailabilityWarnings(deck, initialCollection)).toHaveLength(1);
  });
});
