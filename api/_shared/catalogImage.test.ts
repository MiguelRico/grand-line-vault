import { describe, expect, it } from 'vitest';
import { catalogImageProxyUrl, withProxiedCatalogImage } from './catalogImage.js';

describe('catalog image proxy', () => {
  it('routes official images through the application origin', () => {
    expect(
      catalogImageProxyUrl(
        'https://en.onepiece-cardgame.com/images/cardlist/card/EB01-036.png?260715',
      ),
    ).toBe('/api/catalog?action=image&file=EB01-036.png&v=260715');
  });

  it('keeps provider images from other origins unchanged', () => {
    expect(catalogImageProxyUrl('https://images.example.test/card.webp')).toBe(
      'https://images.example.test/card.webp',
    );
  });

  it('does not expose invalid official paths and preserves the persisted document', () => {
    const document = {
      id: 'CARD::EB01-036',
      image: 'https://en.onepiece-cardgame.com/images/cardlist/card/../../private.png',
    };
    expect(withProxiedCatalogImage(document)).toEqual({ ...document, image: '' });
    expect(document.image).toContain('../../private.png');
  });

  it('routes every persisted variant image without mutating Firestore data', () => {
    const document = {
      id: 'CARD::EB01-003',
      image: 'https://en.onepiece-cardgame.com/images/cardlist/card/EB01-003.png?260715',
      variants: [
        {
          id: 'EB01-003',
          image: 'https://en.onepiece-cardgame.com/images/cardlist/card/EB01-003.png?260715',
        },
        {
          id: 'EB01-003_p1',
          image: 'https://en.onepiece-cardgame.com/images/cardlist/card/EB01-003_p1.png?260715',
        },
      ],
    };

    expect(withProxiedCatalogImage(document)).toMatchObject({
      image: '/api/catalog?action=image&file=EB01-003.png&v=260715',
      variants: [
        { id: 'EB01-003', image: '/api/catalog?action=image&file=EB01-003.png&v=260715' },
        { id: 'EB01-003_p1', image: '/api/catalog?action=image&file=EB01-003_p1.png&v=260715' },
      ],
    });
    expect(document.variants[1]?.image).toBe(
      'https://en.onepiece-cardgame.com/images/cardlist/card/EB01-003_p1.png?260715',
    );
  });
});
