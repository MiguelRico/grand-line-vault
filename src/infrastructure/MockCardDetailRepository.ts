import type {
  CardDetail,
  CardVariant,
  CatalogCard,
  CatalogPrices,
  CatalogVariantRef,
  Printing,
} from '../domain/models';
import type { CardDetailRepository } from '../domain/repositories';

const MOCK_FETCHED_AT = '2026-01-01T00:00:00.000Z';
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

function mockSource(indexCard: CatalogCard, providerVariantId?: string) {
  return {
    providerId: 'MOCK' as const,
    providerCardId: `MOCK::${indexCard.id}`,
    providerVariantId,
    fetchedAt: MOCK_FETCHED_AT,
  };
}

function mockVariantExternalId(indexCard: CatalogCard, variant: CatalogVariantRef): string {
  return `MOCK::${indexCard.id}::${variant.id}`;
}

function mockVariants(indexCard: CatalogCard, baseId: string): CardVariant[] {
  return indexCard.variants
    .filter((variant) => variant.variant_type !== 'BASE')
    .map((variant, position) => {
      const offset = position + 1;
      const externalId = mockVariantExternalId(indexCard, variant);
      return {
        id: `${baseId}::VARIANT::${variant.id}`,
        external_id: externalId,
        base_card_id: baseId,
        variant_type: variant.variant_type,
        label: variant.label,
        version: variant.number == null ? variant.label : `V.${variant.number}`,
        image: variant.image,
        language: variant.language,
        prices: mockPrices(offset * 4),
        artist: {
          id: `mock-artist-${offset}`,
          name: offset === 1 ? 'Eiichiro Mock' : 'Grand Line Studio',
          slug: offset === 1 ? 'eiichiro-mock' : 'grand-line-studio',
        },
        cardmarket_id: 910_000 + offset,
        tcgplayer_id: 920_000 + offset,
        tcgid: `MOCK-TCG-${indexCard.id}-${offset}`,
        links: {
          cardmarket: `https://example.com/mock/cardmarket/${offset}`,
          tcgplayer: `https://example.com/mock/tcgplayer/${offset}`,
        },
        tcggo_url: `https://example.com/mock/tcggo/${offset}`,
        source: mockSource(indexCard, variant.id),
      };
    });
}

function mockDetail(indexCard: CatalogCard): CardDetail {
  const baseId = `MOCK::${indexCard.id}`;
  const baseVariant =
    indexCard.variants.find((variant) => variant.variant_type === 'BASE') ??
    indexCard.variants.find((variant) => variant.image === indexCard.image);
  const baseExternalId = `${baseId}::BASE`;
  const variants = mockVariants(indexCard, baseId);
  const basePrinting: Printing = {
    id: baseId,
    external_id: baseExternalId,
    variant_type: 'BASE',
    label: baseVariant?.label ?? 'Arte base',
    version: baseVariant?.number == null ? 'V.1' : `V.${baseVariant.number}`,
    image: indexCard.image,
    language: baseVariant?.language ?? 'EN',
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
    source: mockSource(indexCard, baseVariant?.id),
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
    external_id: baseExternalId,
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
      label: baseVariant?.label ?? 'Arte base',
      number: baseVariant?.number ?? 1,
      static_id: baseVariant?.id,
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
    source: mockSource(indexCard, baseVariant?.id),
    enrichment: {
      status: 'MATCHED',
      providers: ['MOCK', 'FIRESTORE_INDEX'],
      matchedExternalIds: indexCard.variants.map((variant) => variant.id),
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
