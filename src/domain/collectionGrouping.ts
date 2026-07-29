import type { CatalogVariantRef, CollectionItem } from './models';

export interface CollectionVariantGroup {
  id: string | null;
  variant: CatalogVariantRef | null;
  items: CollectionItem[];
  quantity: number;
}

export interface CollectionCardGroup {
  catalogCardId: string;
  card: CollectionItem['card'];
  items: CollectionItem[];
  variants: CollectionVariantGroup[];
  quantity: number;
  favorite: boolean;
}

function variantOrder(left: CollectionVariantGroup, right: CollectionVariantGroup): number {
  if (left.id === null) return -1;
  if (right.id === null) return 1;
  const numberDifference =
    (left.variant?.number ?? Number.MAX_SAFE_INTEGER) -
    (right.variant?.number ?? Number.MAX_SAFE_INTEGER);
  return numberDifference || (left.variant?.label ?? '').localeCompare(right.variant?.label ?? '');
}

export function groupCollectionItems(items: CollectionItem[]): CollectionCardGroup[] {
  const cardGroups = new Map<string, CollectionItem[]>();
  items.forEach((item) => {
    const group = cardGroups.get(item.catalogCardId);
    if (group) group.push(item);
    else cardGroups.set(item.catalogCardId, [item]);
  });

  return Array.from(cardGroups, ([catalogCardId, cardItems]) => {
    const firstItem = cardItems[0];
    if (!firstItem)
      throw new Error(`No se puede agrupar una carta sin ejemplares: ${catalogCardId}`);
    const variantItems = new Map<string, CollectionItem[]>();
    cardItems.forEach((item) => {
      const key = item.catalogVariantId ?? 'BASE';
      const group = variantItems.get(key);
      if (group) group.push(item);
      else variantItems.set(key, [item]);
    });

    const variants = Array.from(variantItems, ([key, groupedItems]) => ({
      id: key === 'BASE' ? null : key,
      variant: groupedItems[0]?.variant ?? null,
      items: groupedItems,
      quantity: groupedItems.reduce((sum, item) => sum + item.quantity, 0),
    })).sort(variantOrder);

    return {
      catalogCardId,
      card: firstItem.card,
      items: cardItems,
      variants,
      quantity: cardItems.reduce((sum, item) => sum + item.quantity, 0),
      favorite: cardItems.some((item) => item.favorite),
    };
  });
}
