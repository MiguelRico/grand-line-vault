import type {
  CardDetail,
  CardVariant,
  CatalogCard,
  CatalogPrices,
  Printing,
} from '../domain/models';
import type { CardDetailRepository } from '../domain/repositories';

const MOCK_FETCHED_AT = '2026-01-01T00:00:00.000Z';
const MOCK_VARIANT_COUNT = 2;

function slug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function mockPrices(offset = 0): CatalogPrices {
  return {
    cardmarket: {
      currency: 'EUR',
      lowest_near_mint: 12.5 + offset,
      lowest_near_mint_FR: 13.25 + offset,
      lowest_near_mint_EU_only: 12.95 + offset,
      lowest_near_mint_FR_EU_only: 13.75 + offset,
      average_30d: 14.4 + offset,
      average_7d: 15.1 + offset,
      available_items: 27 - offset,
      graded: [
        { grade: 'PSA 9', price: 48 + offset },
        { grade: 'PSA 10', price: 95 + offset },
      ],
    },
    tcgplayer: {
      currency: 'USD',
      market_price: 16.8 + offset,
    },
  };
}

function mockSource(providerVariantId?: string) {
  return {
    providerId: 'MOCK' as const,
    providerCardId: 'mock-card-detail',
    providerVariantId,
    fetchedAt: MOCK_FETCHED_AT,
  };
}

function mockVariants(indexCard: CatalogCard, baseId: string): CardVariant[] {
  return Array.from({ length: MOCK_VARIANT_COUNT }, (_, position) => {
    const number = position + 1;
    const externalId = `mock-variant-${number}`;
    return {
      id: `${baseId}::VARIANT::${number}`,
      external_id: externalId,
      base_card_id: baseId,
      variant_type: number === 1 ? 'PARALLEL' : 'ALTERNATE_ART',
      label: number === 1 ? 'Parallel mock' : 'Arte alternativo mock',
      version: `Mock V.${number + 1}`,
      image: indexCard.image,
      language: number === 1 ? 'JP' : 'EN',
      prices: mockPrices(number * 4),
      artist: {
        id: `mock-artist-${number}`,
        name: number === 1 ? 'Eiichiro Mock' : 'Grand Line Studio',
        slug: number === 1 ? 'eiichiro-mock' : 'grand-line-studio',
      },
      cardmarket_id: 910_000 + number,
      tcgplayer_id: 920_000 + number,
      tcgid: `MOCK-TCG-${number}`,
      links: {
        cardmarket: `https://example.com/mock/cardmarket/${number}`,
        tcgplayer: `https://example.com/mock/tcgplayer/${number}`,
      },
      tcggo_url: `https://example.com/mock/tcggo/${number}`,
      source: mockSource(externalId),
    };
  });
}

function mockDetail(indexCard: CatalogCard): CardDetail {
  const baseId = `MOCK::${indexCard.id}`;
  const variants = mockVariants(indexCard, baseId);
  const basePrinting: Printing = {
    id: baseId,
    external_id: 'mock-base',
    variant_type: 'BASE',
    label: 'Arte base',
    version: 'Mock V.1',
    image: indexCard.image,
    language: 'EN',
    prices: mockPrices(),
    artist: {
      id: 'mock-artist-base',
      name: 'Monkey D. Designer',
      slug: 'monkey-d-designer',
    },
    cardmarket_id: 900_001,
    tcgplayer_id: 900_002,
    tcgid: 'MOCK-TCG-BASE',
    links: {
      cardmarket: 'https://example.com/mock/cardmarket/base',
      tcgplayer: 'https://example.com/mock/tcgplayer/base',
    },
    tcggo_url: 'https://example.com/mock/tcggo/base',
    source: mockSource(),
  };
  const provenance = Object.fromEntries(
    [
      'artist',
      'prices',
      'episode',
      'marketplace_ids',
      'links',
      'game.effect',
      'game.trigger',
      'game.don',
      'game.traits',
    ].map((field) => [
      field,
      {
        providerId: 'MOCK' as const,
        sourceField: `mock.${field}`,
        confidence: 'EXACT' as const,
      },
    ]),
  );

  return {
    id: baseId,
    external_id: 'mock-base',
    name: indexCard.name,
    name_numbered: `${indexCard.name} ${indexCard.card_number}`,
    slug: slug(indexCard.name),
    type: 'mock-card-detail',
    card_number: indexCard.card_number,
    normalized_card_number: indexCard.normalized_card_number,
    card_code_number: `${indexCard.card_number}-MOCK`,
    rarity: indexCard.rarity,
    rarity_normalized: indexCard.rarity_normalized,
    color: indexCard.color,
    version: 'Mock V.1',
    print: {
      variant_type: 'BASE',
      label: 'Arte base',
      number: 1,
      static_id: indexCard.id,
      confidence: 'EXACT',
    },
    hp: 5,
    supertype: 'Mock Supertype',
    tcgid: 'MOCK-TCG-BASE',
    cardmarket_id: 900_001,
    tcgplayer_id: 900_002,
    flavor_text: 'Detalle simulado completo para validar visualmente todos los campos de la carta.',
    artist: basePrinting.artist,
    prices: basePrinting.prices,
    episode: {
      ...indexCard.episode,
      slug: slug(indexCard.episode.name),
      released_at: '2026-01-01',
      logo: '/one-piece.svg',
      cards_total: 121,
      cards_printed_total: 164,
      prices: {
        cardmarket: { total: 1_250.75, currency: 'EUR' },
        tcgplayer: { total: 1_480.5, currency: 'USD' },
      },
      game: { name: 'One Piece Card Game', slug: 'one-piece-card-game' },
      series: { id: 'mock-series', name: 'Mock Series', slug: 'mock-series' },
    },
    image: indexCard.image,
    tcggo_url: basePrinting.tcggo_url,
    links: basePrinting.links,
    game: {
      card_type: indexCard.game.card_type,
      colors: indexCard.game.colors,
      cost: indexCard.game.cost,
      life: indexCard.game.life,
      power: indexCard.game.power,
      counter: indexCard.game.counter,
      attributes: indexCard.game.attributes,
      traits: ['Straw Hat Crew', 'Mock Development'],
      effect:
        '[On Play] Este efecto simulado permite comprobar textos largos, estilos y saltos de línea.',
      trigger: '[Trigger] Añade esta carta simulada a tu mano.',
      don: '[DON!! x2] Esta carta gana +2000 de poder durante este turno.',
      language: 'EN',
    },
    artworks: variants,
    printings: [basePrinting, ...variants],
    source: mockSource(),
    enrichment: {
      status: 'MATCHED',
      providers: ['MOCK', 'FIRESTORE_INDEX'],
      matchedExternalIds: [indexCard.id],
      fields: Object.keys(provenance),
      provenance,
      conflicts: ['Datos de detalle simulados; estadísticas de juego conservadas desde el índice.'],
    },
  };
}

export class MockCardDetailRepository implements CardDetailRepository {
  private readonly details = new Map<string, CardDetail>();

  async getById(
    _tcggoId: string | null,
    signal?: AbortSignal,
    fallback?: {
      cardNumber: string;
      catalogId: string;
      indexCard?: CatalogCard;
    },
  ): Promise<CardDetail | null> {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const indexCard = fallback?.indexCard;
    if (!indexCard) return null;
    const detail = mockDetail(indexCard);
    this.details.set(detail.external_id, detail);
    for (const variant of detail.artworks) {
      const variantDetail: CardDetail = {
        ...detail,
        id: variant.id,
        external_id: variant.external_id,
        version: variant.version,
        print: {
          variant_type: variant.variant_type,
          label: variant.label,
          number: Number(variant.external_id.match(/\d+$/)?.[0] ?? 1),
          confidence: 'EXACT',
        },
        artist: variant.artist,
        prices: variant.prices,
        image: variant.image,
        tcggo_url: variant.tcggo_url,
        links: variant.links,
        tcgid: variant.tcgid,
        cardmarket_id: variant.cardmarket_id,
        tcgplayer_id: variant.tcgplayer_id,
        game: { ...detail.game, language: variant.language },
        artworks: [],
        printings: [variant],
        source: variant.source,
      };
      this.details.set(variant.external_id, variantDetail);
    }
    return detail;
  }

  async getVariantById(tcggoId: string, signal?: AbortSignal): Promise<CardDetail | null> {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    return this.details.get(tcggoId) ?? null;
  }
}
