import type { Card, CollectionItem, CollectionStats, Deck, Money } from './models';

export function calculateCollectionStats(
  items: CollectionItem[],
  currency = 'EUR',
): CollectionStats {
  const totalCopies = items.reduce((sum, item) => sum + item.quantity, 0);
  const valuedCopies = items.reduce(
    (sum, item) => sum + (item.cardSnapshot.catalogPrice ? item.quantity : 0),
    0,
  );
  return {
    totalCopies,
    uniqueCards: new Set(items.map((item) => item.cardId)).size,
    setsRepresented: new Set(items.map((item) => item.cardSnapshot.setCode)).size,
    duplicateCopies: items.reduce((sum, item) => sum + Math.max(0, item.quantity - 1), 0),
    favoriteCards: items.filter((item) => item.favorite).length,
    tradeableCopies: items.reduce((sum, item) => sum + item.tradeableQuantity, 0),
    valuedCopies,
    unvaluedCopies: totalCopies - valuedCopies,
    estimatedValue: {
      amount: items.reduce(
        (sum, item) => sum + (item.cardSnapshot.catalogPrice?.amount ?? 0) * item.quantity,
        0,
      ),
      currency,
    },
  };
}

export function collectionKey(
  cardId: string,
  variantId: string,
  language: string,
  condition: string,
): string {
  return `${cardId}::${variantId}::${language}::${condition}`;
}

export function deckAvailabilityWarnings(deck: Deck, items: CollectionItem[]): string[] {
  const available = new Map(items.map((item) => [item.id, item.quantity]));
  return deck.cards
    .filter((entry) => entry.quantity > (available.get(entry.collectionItemId) ?? 0))
    .map((entry) => `${entry.snapshot.name}: el mazo usa más copias de las disponibles.`);
}

export function preferredPrice(card: Card): Money | undefined {
  const price = card.prices[0];
  return price ? { amount: price.amount, currency: price.currency } : undefined;
}
