// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseCards, parseSeries } from '../infrastructure/html-parser';

const fixture = readFile(path.resolve('scraper/test/fixtures/catalog.html'), 'utf8');

describe('official HTML parser', () => {
  it('discovers, normalizes and deduplicates valid series', async () => {
    const sets = parseSeries(await fixture);
    expect(sets).toHaveLength(2);
    expect(sets[0]).toEqual({
      sourceSeriesId: '569101',
      name: 'BOOSTER PACK -ROMANCE DAWN- [OP-01]',
    });
  });

  it('fails explicitly when no series exists', () => {
    expect(() => parseSeries('<html></html>')).toThrow(/ninguna serie/i);
  });

  it('parses base, parallel, reprint, multicolor and semantic text', async () => {
    const cards = parseCards(await fixture, {
      sourceSeriesId: '569101',
      name: 'BOOSTER PACK -ROMANCE DAWN- [OP-01]',
    });
    expect(cards).toHaveLength(3);
    expect(cards[0]).toMatchObject({
      id: 'OP01-001',
      life: 5,
      cost: null,
      colors: ['Green', 'Red'],
      variant: { type: 'base', number: null },
      effect: '[Once Per Turn]\nGain +1000 power.',
      trigger: null,
    });
    expect(cards[0]?.imageUrl).toBe(
      'https://en.onepiece-cardgame.com/images/cardlist/card/OP01-001.png?1',
    );
    expect(cards[1]?.variant).toEqual({ type: 'parallel', number: 1 });
    expect(cards[2]).toMatchObject({
      power: 2000,
      cost: null,
      variant: { type: 'reprint', number: 1 },
      trigger: 'Draw 1 card.',
    });
  });
});
