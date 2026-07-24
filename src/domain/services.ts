import type {
  Card,
  CollectionItem,
  CollectionStats,
  Money,
  SalesPack,
  StorageBox,
} from './models';

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
    storedCopies: items.reduce((sum, item) => sum + (item.boxId && item.sectionId ? item.quantity : 0), 0),
    unassignedCopies: items.reduce(
      (sum, item) => sum + (!item.boxId || !item.sectionId ? item.quantity : 0),
      0,
    ),
    copiesInSalesPacks: 0,
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
  boxId = 'UNASSIGNED',
  sectionId = 'UNASSIGNED',
): string {
  return `${cardId}::${variantId}::${language}::${condition}::${boxId}::${sectionId}`;
}

export function sectionLabel(boxes: StorageBox[], boxId?: string, sectionId?: string): string {
  const box = boxes.find((entry) => entry.id === boxId);
  const section = box?.sections.find((entry) => entry.id === sectionId);
  return box && section ? `${box.name} · ${section.code} ${section.name}` : 'Sin ubicar';
}

export function reservedQuantities(packs: SalesPack[]): Map<string, number> {
  const result = new Map<string, number>();
  packs
    .filter((pack) => pack.status !== 'ARCHIVED')
    .flatMap((pack) => pack.items)
    .forEach((item) => {
      result.set(item.collectionItemId, (result.get(item.collectionItemId) ?? 0) + item.quantity);
    });
  return result;
}

export function salesPackAvailabilityWarnings(
  pack: SalesPack,
  items: CollectionItem[],
  otherPacks: SalesPack[] = [],
): string[] {
  const available = new Map(items.map((item) => [item.id, item.quantity]));
  const reserved = reservedQuantities(otherPacks.filter((entry) => entry.id !== pack.id));
  return pack.items
    .filter(
      (entry) =>
        entry.quantity >
        (available.get(entry.collectionItemId) ?? 0) - (reserved.get(entry.collectionItemId) ?? 0),
    )
    .map((entry) => `${entry.snapshot.name}: el pack supera las copias disponibles.`);
}

export function preferredPrice(card: Card): Money | undefined {
  const price = card.prices[0];
  return price ? { amount: price.amount, currency: price.currency } : undefined;
}
