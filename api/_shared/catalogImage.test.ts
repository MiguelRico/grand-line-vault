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
});
