import { describe, expect, it } from 'vitest';
import { buildCatalogIndexEnrichment } from './catalogEnrichment.js';

describe('catalog index enrichment', () => {
  it('persists the marketplace and TCGGO navigation data', () => {
    expect(
      buildCatalogIndexEnrichment(
        {
          id: 48398,
          image: 'https://images.example.test/card.png',
          cardmarket_id: 100,
          tcgplayer_id: 200,
          tcgid: '300',
          links: {
            cardmarket: 'https://www.cardmarket.com/card',
            tcgplayer: 'https://www.tcgplayer.com/card',
          },
          tcggo_url: 'https://www.tcggo.com/card',
        },
        '2026-07-29T00:00:00.000Z',
      ),
    ).toMatchObject({
      tcggoId: '48398',
      cardmarket_id: 100,
      tcgplayer_id: 200,
      tcgid: '300',
      links: {
        cardmarket: 'https://www.cardmarket.com/card',
        tcgplayer: 'https://www.tcgplayer.com/card',
      },
      tcggo_url: 'https://www.tcggo.com/card',
    });
  });

  it('does not persist unsafe navigation URLs', () => {
    const result = buildCatalogIndexEnrichment(
      {
        id: 1,
        image: 'https://images.example.test/card.png',
        links: { cardmarket: 'javascript:alert(1)', tcgplayer: 'invalid' },
        tcggo_url: 'file:///tmp/card',
      },
      '2026-07-29T00:00:00.000Z',
    );

    expect(result.links).toEqual({ cardmarket: null, tcgplayer: null });
    expect(result.tcggo_url).toBeNull();
  });
});
