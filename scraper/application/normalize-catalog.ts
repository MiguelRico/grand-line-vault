import type { CatalogCard, CatalogData, CatalogSet, OfficialSet, ParsedCard } from '../domain/catalog';
import { fingerprint } from '../utils/hashing';
import { normalizeText, slug, stableStrings } from '../utils/text-normalization';

const comparableFields = [
  'cardNumber',
  'name',
  'category',
  'rarity',
  'cost',
  'life',
  'power',
  'counter',
  'effect',
  'trigger',
  'imageUrl',
] as const;

function withoutFingerprint(card: Omit<CatalogCard, 'contentFingerprint'>): object {
  const { imageFingerprint, ...content } = card;
  return imageFingerprint ? { ...content, imageFingerprint } : content;
}

export function normalizeCatalog(parsedCards: ParsedCard[], officialSets: OfficialSet[]): CatalogData {
  const warnings: string[] = [];
  const byId = new Map<string, Omit<CatalogCard, 'contentFingerprint'>>();
  for (const parsed of parsedCards) {
    const { set, ...card } = parsed;
    const current = byId.get(card.id);
    if (!current) {
      byId.set(card.id, { ...card, sets: [set] });
      continue;
    }
    for (const field of comparableFields) {
      const left = current[field];
      const right = card[field];
      if (left !== null && left !== '' && right !== null && right !== '' && left !== right) {
        warnings.push(`Conflicto ${card.id}.${field}: se conserva el primer valor oficial.`);
      } else if ((left === null || left === '') && right !== null && right !== '') {
        Object.assign(current, { [field]: right });
      }
    }
    current.colors = stableStrings([...current.colors, ...card.colors]);
    current.attributes = stableStrings([...current.attributes, ...card.attributes]);
    current.traits = stableStrings([...current.traits, ...card.traits]);
    current.sets = [...new Map([...current.sets, set].map((item) => [item.sourceSeriesId, item])).values()]
      .sort((left, right) => left.sourceSeriesId.localeCompare(right.sourceSeriesId));
  }

  const cards = [...byId.values()]
    .map((card): CatalogCard => ({ ...card, contentFingerprint: fingerprint(withoutFingerprint(card)) }))
    .sort(
      (left, right) =>
        left.cardNumber.localeCompare(right.cardNumber) ||
        left.variant.type.localeCompare(right.variant.type) ||
        (left.variant.number ?? -1) - (right.variant.number ?? -1) ||
        left.id.localeCompare(right.id),
    );
  const cardCounts = new Map<string, number>();
  cards.forEach((card) =>
    card.sets.forEach((set) => cardCounts.set(set.sourceSeriesId, (cardCounts.get(set.sourceSeriesId) ?? 0) + 1)),
  );
  const sets: CatalogSet[] = officialSets
    .map((set) => {
      const name = normalizeText(set.name);
      const productCode = name.match(/\[([A-Z0-9-]+)\]\s*$/i)?.[1];
      return {
        id: (productCode ?? slug(name) ?? set.sourceSeriesId).toUpperCase(),
        sourceSeriesId: set.sourceSeriesId,
        name,
        normalizedName: name.toLocaleLowerCase('en'),
        type: null,
        cardCount: cardCounts.get(set.sourceSeriesId) ?? 0,
      };
    })
    .sort((left, right) => left.sourceSeriesId.localeCompare(right.sourceSeriesId));
  return { cards, sets, warnings: [...new Set(warnings)].sort() };
}
