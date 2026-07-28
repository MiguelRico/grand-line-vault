import { describe, expect, it } from 'vitest';
import {
  buildCatalogDocuments,
  catalogDocumentId,
  type StaticCatalogCard,
} from './catalogBootstrap.js';

const base: StaticCatalogCard = {
  id: 'OP01-001',
  sourceId: 'OP01-001',
  baseCardId: 'OP01-001',
  cardNumber: 'OP01-001',
  name: 'Roronoa Zoro',
  rarity: 'L',
  category: 'LEADER',
  colors: ['Green', 'Red'],
  cost: null,
  life: 4,
  power: 5000,
  counter: null,
  attributes: ['Slash'],
  imageUrl: 'https://static.example/OP01-001.png',
  variant: { type: 'base', number: null },
  sets: [{ id: 'OP-01', sourceSeriesId: '1', name: 'Romance Dawn' }],
};

describe('catalog bootstrap projection', () => {
  it('groups all prints into one minimal logical-card document', () => {
    const documents = buildCatalogDocuments(
      [
        base,
        {
          ...base,
          id: 'OP01-001_P1',
          sourceId: 'OP01-001_P1',
          imageUrl: 'https://static.example/OP01-001_p1.png',
          variant: { type: 'parallel', number: 1 },
          sets: [{ id: 'PRB-01', sourceSeriesId: '2', name: 'The Best' }],
        },
      ],
      '2026-07-25T00:00:00.000Z',
    );

    expect(documents).toHaveLength(1);
    expect(documents[0]).toMatchObject({
      id: 'CARD::OP01-001',
      tcggoId: null,
      image: base.imageUrl,
      setCodes: ['OP-01', 'PRB-01'],
      variantTypes: ['BASE', 'PARALLEL'],
      variantCount: 1,
      totalVariants: 2,
    });
    expect(documents[0]?.searchPrefixes).toContain('ZOR');
  });

  it('creates stable identifiers independent of the TCGGO id', () => {
    expect(catalogDocumentId('op01-001')).toBe('CARD::OP01-001');
  });
});
