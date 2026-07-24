import type { Card, CollectionItem, Deck } from '../domain/models';

const now = '2026-07-21T06:00:00.000Z';
const providerBase = 'https://optcg-api.arjunbansal-ai.workers.dev/images';

const seeds = [
  ['OP01-001', 'Roronoa Zoro', 'LEADER', 'RED', 5, 5000, 'L', 1.25],
  ['OP01-002', 'Trafalgar Law', 'LEADER', 'RED', 4, 5000, 'L', 2.7],
  ['OP01-003', 'Monkey D. Luffy', 'CHARACTER', 'RED', 2, 3000, 'UC', 0.19],
  ['OP01-004', 'Usopp', 'CHARACTER', 'RED', 2, 3000, 'C', 0.08],
  ['OP01-005', 'Nami', 'CHARACTER', 'RED', 1, 2000, 'R', 4.6],
  ['OP01-006', 'Otama', 'CHARACTER', 'RED', 1, 0, 'C', 0.32],
  ['OP01-007', 'Caribou', 'CHARACTER', 'RED', 3, 4000, 'C', 0.06],
  ['OP01-008', 'Cavendish', 'CHARACTER', 'RED', 4, 5000, 'UC', 0.11],
  ['OP01-009', 'Carrot', 'CHARACTER', 'RED', 2, 3000, 'C', 0.09],
  ['OP01-010', 'Komachiyo', 'CHARACTER', 'RED', 1, 3000, 'C', 0.07],
  ['OP01-011', 'Gordon', 'CHARACTER', 'RED', 1, 2000, 'UC', 0.1],
  ['OP01-012', 'Sai', 'CHARACTER', 'RED', 4, 5000, 'C', 0.08],
  ['OP01-013', 'Sanji', 'CHARACTER', 'RED', 2, 3000, 'C', 0.15],
  ['OP01-014', 'Jinbe', 'CHARACTER', 'RED', 4, 5000, 'UC', 0.13],
  ['OP01-015', 'Tony Tony Chopper', 'CHARACTER', 'RED', 1, 2000, 'C', 0.12],
  ['OP01-016', 'Nico Robin', 'CHARACTER', 'RED', 3, 4000, 'UC', 0.21],
  ['OP01-017', 'Franky', 'CHARACTER', 'RED', 4, 5000, 'C', 0.09],
  ['OP01-018', 'Marco', 'CHARACTER', 'RED', 3, 5000, 'R', 0.38],
  ['OP01-019', 'Bartolomeo', 'CHARACTER', 'RED', 2, 2000, 'C', 0.08],
  ['OP01-020', 'Hyogoro', 'CHARACTER', 'RED', 2, 3000, 'UC', 0.12],
] as const;

export const mockCards: Card[] = seeds.map(
  ([code, name, type, color, cost, power, rarity, amount], index) => {
    const id = `BASE::${code}`;
    const source = {
      providerId: 'MOCK' as const,
      providerCardId: code,
      fetchedAt: now,
    };
    const imageUrl = `${providerBase}/${code}`;
    const price = {
      amount,
      currency: 'USD',
      source: 'mock-tcgplayer',
      updatedAt: now,
      marketType: 'MARKET' as const,
    };
    return {
      id,
      code,
      name,
      type,
      colors: [color],
      rarity,
      set: { code: 'OP-01', name: 'Romance Dawn' },
      cost,
      power,
      counter: type === 'CHARACTER' ? 1000 : undefined,
      life: type === 'LEADER' ? 5 : undefined,
      attributes: index % 2 === 0 ? ['Strike'] : ['Slash'],
      traits: ['Straw Hat Crew'],
      effect:
        index < 4
          ? '[DON!! x1] [Your Turn] One of your Characters gains +1000 power this turn.'
          : undefined,
      language: 'EN',
      imageUrl,
      prices: [price],
      sources: [source],
      variants:
        index < 6
          ? [
              {
                id: `VARIANT::${code}::P1`,
                baseCardId: id,
                type: 'ALTERNATE_ART',
                label: 'Alternate Art',
                imageUrl: `${providerBase}/${code}_p1`,
                language: 'EN',
                prices: [{ ...price, amount: amount * 8.4 }],
                sources: [{ ...source, providerVariantId: `${code}_p1` }],
              },
            ]
          : [],
    };
  },
);

function toCollection(card: Card, quantity: number, index: number): CollectionItem {
  return {
    id: `collection-${index + 1}`,
    cardId: card.id,
    cardVariantId: card.id,
    cardSnapshot: {
      code: card.code,
      name: card.name,
      setCode: card.set.code,
      rarity: card.rarity,
      variantLabel: 'Normal',
      imageUrl: card.imageUrl,
      catalogPrice: card.prices[0],
      catalogProvider: 'MOCK',
      catalogFetchedAt: now,
    },
    quantity,
    language: 'EN',
    condition: 'NEAR_MINT',
    favorite: index === 0 || index === 4,
    tradeableQuantity: quantity > 2 ? 1 : 0,
    notes: index === 0 ? 'Carta de mi primer sobre.' : undefined,
    createdAt: now,
    updatedAt: now,
  };
}

export const initialCollection = mockCards
  .slice(0, 12)
  .map((card, index) => toCollection(card, [3, 2, 1, 2, 4, 2, 1, 2, 1, 3, 1, 2][index] ?? 1, index));

export const initialDecks: Deck[] = [
  {
    id: 'deck-1',
    name: 'Sombrero de Paja',
    description: 'Mazo rojo de prueba',
    leaderCardId: mockCards[0]?.id,
    cards: initialCollection.slice(0, 4).map((item, index) => ({
      id: `deck-card-${index + 1}`,
      collectionItemId: item.id,
      cardId: item.cardId,
      quantity: Math.min(2, item.quantity),
      snapshot: item.cardSnapshot,
    })),
    createdAt: now,
    updatedAt: now,
  },
];
