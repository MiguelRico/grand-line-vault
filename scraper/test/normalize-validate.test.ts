// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { ParsedCard } from '../domain/catalog';
import { normalizeCatalog } from '../application/normalize-catalog';
import { validateCatalog } from '../application/validate-catalog';

const set = { sourceSeriesId: '1', name: 'Set [OP-01]' };
const base: ParsedCard = {
  id: 'OP01-001',
  sourceId: 'OP01-001',
  baseCardId: 'OP01-001',
  cardNumber: 'OP01-001',
  name: 'Luffy',
  category: 'LEADER',
  rarity: 'L',
  colors: ['Red'],
  cost: null,
  life: 5,
  power: 5000,
  counter: null,
  attributes: ['Strike'],
  traits: ['Straw Hat Crew'],
  effect: null,
  trigger: null,
  imageUrl: 'https://example.test/card.png',
  variant: { type: 'base', number: null },
  set: { id: 'OP-01', ...set },
};

describe('catalog normalization and validation', () => {
  it('merges set relations, orders deterministically and fingerprints content', () => {
    const other = { sourceSeriesId: '2', name: 'Other [PRB-01]' };
    const data = normalizeCatalog(
      [base, { ...base, set: { id: 'PRB-01', ...other } }],
      [set, other],
    );
    expect(data.cards).toHaveLength(1);
    expect(data.cards[0]?.sets).toHaveLength(2);
    expect(data.cards[0]?.contentFingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects duplicate IDs, missing names and empty sets', () => {
    const data = normalizeCatalog([base], [set]);
    const firstCard = data.cards[0];
    if (!firstCard) throw new Error('Fixture normalization failed.');
    data.cards.push({ ...firstCard, name: '' });
    data.sets.push({
      id: 'EMPTY',
      sourceSeriesId: '2',
      name: 'Empty',
      normalizedName: 'empty',
      type: null,
      cardCount: 0,
    });
    expect(() => validateCatalog(data, { allowSmallCatalog: true })).toThrow(/duplicado|sin nombre/i);
  });

  it('detects abnormal catalog drops', () => {
    const data = normalizeCatalog([base], [set]);
    expect(() => validateCatalog(data, { previousTotalCards: 100, allowSmallCatalog: true })).toThrow(
      /caída anormal/i,
    );
  });
});
