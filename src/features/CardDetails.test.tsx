import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CardDetail, CatalogCard } from '../domain/models';
import { CardDetails } from './CardDetails';

const serviceMocks = vi.hoisted(() => ({
  getById: vi.fn(),
  getVariantById: vi.fn(),
  listCollection: vi.fn(),
  saveCollection: vi.fn(),
}));

vi.mock('../app/providers/ServicesProvider', () => ({
  useServices: () => ({
    catalogProvider: 'OFFICIAL_STATIC',
    catalog: {
      getById: serviceMocks.getById,
      getVariantById: serviceMocks.getVariantById,
    },
    privateData: {
      listCollection: serviceMocks.listCollection,
      saveCollection: serviceMocks.saveCollection,
    },
  }),
}));

const card: CardDetail = {
  id: 'BASE::OP01-001',
  external_id: 'OP01-001',
  name: 'Monkey D. Luffy',
  name_numbered: 'Monkey D. Luffy OP01-001',
  slug: 'monkey-d-luffy',
  type: 'singles',
  card_number: 'OP01-001',
  normalized_card_number: 'OP01-001',
  rarity: 'L',
  rarity_normalized: 'LEADER',
  color: 'Red',
  artist: { id: 'artist-base', name: 'Base Artist', slug: 'base-artist' },
  cardmarket_id: 100,
  tcgplayer_id: 200,
  episode: {
    id: 'OP-01',
    code: 'OP-01',
    normalized_code: 'OP01',
    name: 'Romance Dawn',
    slug: 'romance-dawn',
  },
  game: {
    card_type: 'LEADER',
    colors: ['RED'],
    life: 5,
    power: 5000,
    attributes: ['Strike'],
    traits: ['Straw Hat Crew'],
    language: 'EN',
  },
  image: '/base.png',
  prices: { tcgplayer: { currency: 'USD', market_price: 1 } },
  source: { providerId: 'OFFICIAL_STATIC', fetchedAt: '2026-07-25T00:00:00.000Z' },
  artworks: [
    {
      id: 'VARIANT::OP01-001::p1',
      external_id: 'p1',
      base_card_id: 'BASE::OP01-001',
      variant_type: 'PARALLEL',
      label: 'Parallel 1',
      version: 'V.2',
      image: '/parallel.png',
      language: 'JP',
      prices: {
        cardmarket: {
          currency: 'EUR',
          lowest_near_mint: 10,
          average_30d: 9,
          available_items: 8,
        },
        tcgplayer: { currency: 'USD', market_price: 12 },
      },
      artist: { id: 'artist-variant', name: 'Variant Artist', slug: 'variant-artist' },
      cardmarket_id: 101,
      tcgplayer_id: 201,
      tcgid: 301,
      links: {
        cardmarket: 'https://www.cardmarket.com/example',
        tcgplayer: 'https://www.tcgplayer.com/example',
      },
      source: { providerId: 'MOCK', fetchedAt: '2026-07-25T00:00:00.000Z' },
    },
  ],
  enrichment: {
    status: 'MATCHED',
    providers: ['ONE_PIECE_API', 'OFFICIAL_STATIC'],
    matchedExternalIds: ['OP01-001'],
    fields: ['game.power'],
    provenance: {},
    conflicts: [],
  },
};

const collectionItems = [
  {
    id: 'base-lot',
    cardId: card.id,
    cardVariantId: card.id,
    cardSnapshot: {
      schemaVersion: 2 as const,
      normalizedCardNumber: card.normalized_card_number,
      printKey: `MOCK::${card.external_id}`,
      code: card.card_number,
      name: card.name,
      setCode: card.episode.code,
      variantLabel: 'Normal',
      imageUrl: 'https://example.test/base.png',
      catalogProvider: 'MOCK' as const,
    },
    quantity: 2,
    language: 'EN' as const,
    condition: 'NEAR_MINT' as const,
    favorite: false,
    createdAt: '2026-07-25T00:00:00.000Z',
    updatedAt: '2026-07-25T00:00:00.000Z',
  },
  {
    id: 'variant-lot',
    cardId: card.id,
    cardVariantId: card.artworks[0]?.id ?? '',
    cardSnapshot: {
      schemaVersion: 2 as const,
      normalizedCardNumber: card.normalized_card_number,
      printKey: `MOCK::${card.artworks[0]?.external_id}`,
      code: card.card_number,
      name: card.name,
      setCode: card.episode.code,
      variantLabel: 'Parallel 1',
      imageUrl: 'https://example.test/parallel.png',
      catalogProvider: 'MOCK' as const,
    },
    quantity: 3,
    language: 'JP' as const,
    condition: 'NEAR_MINT' as const,
    favorite: false,
    createdAt: '2026-07-25T00:00:00.000Z',
    updatedAt: '2026-07-25T00:00:00.000Z',
  },
];

const indexCard: CatalogCard = {
  id: 'CARD::OP01-001',
  tcggoId: '10',
  name: card.name,
  normalizedName: 'MONKEY D. LUFFY',
  card_number: card.card_number,
  normalized_card_number: card.normalized_card_number,
  image: card.image,
  episode: {
    id: card.episode.id,
    name: card.episode.name,
    code: card.episode.code,
    normalized_code: card.episode.normalized_code,
  },
  setCodes: ['OP-01'],
  rarity: card.rarity,
  rarity_normalized: card.rarity_normalized,
  color: card.color,
  artist: card.artist,
  game: {
    card_type: card.game.card_type,
    colors: card.game.colors,
    cost: card.game.cost,
    life: card.game.life,
    power: card.game.power,
    counter: card.game.counter,
    attributes: card.game.attributes,
  },
  variantTypes: ['BASE', 'PARALLEL'],
  variantCount: 5,
  totalVariants: 6,
  source: card.source,
};

beforeEach(() => {
  vi.clearAllMocks();
  serviceMocks.getById.mockResolvedValue(card);
  serviceMocks.getVariantById.mockResolvedValue({
    ...card,
    id: card.artworks[0]?.id,
    external_id: card.artworks[0]?.external_id,
    version: card.artworks[0]?.version,
    print: {
      variant_type: 'PARALLEL',
      label: 'Parallel 1',
      confidence: 'HIGH',
    },
    image: card.artworks[0]?.image,
    prices: card.artworks[0]?.prices,
    artist: card.artworks[0]?.artist,
    cardmarket_id: card.artworks[0]?.cardmarket_id,
    tcgplayer_id: card.artworks[0]?.tcgplayer_id,
    tcgid: card.artworks[0]?.tcgid,
    links: card.artworks[0]?.links,
    source: card.artworks[0]?.source,
    game: { ...card.game, language: 'JP' },
    artworks: [],
  });
  serviceMocks.listCollection.mockResolvedValue(collectionItems);
  serviceMocks.saveCollection.mockImplementation(async (item: unknown) => item);
});

describe('CardDetails', () => {
  it('updates the displayed artwork and variant information when an artwork is selected', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <CardDetails card={indexCard} onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    await screen.findByRole('heading', { name: card.name });
    expect(screen.getAllByText('1.00 USD').length).toBeGreaterThan(0);
    expect(await screen.findByText('2 copias de Arte base')).toBeInTheDocument();
    expect(screen.getByText('Total entre todos los artes: 5')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar Parallel 1' }));

    await waitFor(() =>
      expect(serviceMocks.getVariantById).toHaveBeenCalledWith('p1', expect.any(AbortSignal)),
    );
    expect(screen.getByAltText(`Carta ${card.name} — Parallel 1`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mostrar Parallel 1' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText('Parallel 1')).toBeInTheDocument();
    expect(screen.getAllByText('12.00 USD').length).toBeGreaterThan(0);
    expect(screen.getAllByText('TCGPlayer').length).toBeGreaterThan(0);
    expect(screen.getByText('Variant Artist')).toBeInTheDocument();
    expect(screen.getByText('101')).toBeInTheDocument();
    const printDataHeading = screen.getByText('Datos de la impresión');
    expect(printDataHeading.nextElementSibling).toHaveClass('grid-cols-3');
    expect(screen.queryByText('Datos de la impresión seleccionada')).not.toBeInTheDocument();
    const marketHeading = screen.getByText('Mercado de la impresión');
    expect(marketHeading.nextElementSibling).toHaveClass('grid-cols-4');
    expect(screen.getByText('Disponibles')).toBeInTheDocument();
    expect(screen.getByText('Media 30 días')).toBeInTheDocument();
    expect(screen.getByText('9.00 EUR')).toBeInTheDocument();
    expect(screen.getByText(/· JP$/)).toBeInTheDocument();
    expect(screen.getByText(/Fuente de datos:/).parentElement).toHaveTextContent('MOCK');
    expect(screen.getByText('3 copias de Parallel 1')).toBeInTheDocument();
  });

  it('adds the selected variant and quantity to the collection', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <CardDetails card={indexCard} onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    await screen.findByRole('heading', { name: card.name });
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar Parallel 1' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /adir 1 copia de Parallel 1/ })).not.toBeDisabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar cantidad' }));
    fireEvent.click(screen.getByRole('button', { name: 'Añadir 2 copias de Parallel 1' }));

    await waitFor(() => expect(serviceMocks.saveCollection).toHaveBeenCalledOnce());
    expect(serviceMocks.saveCollection).toHaveBeenCalledWith(
      expect.objectContaining({
        cardId: indexCard.id,
        cardVariantId: card.artworks[0]?.id,
        quantity: 5,
        language: 'JP',
        cardSnapshot: expect.objectContaining({
          schemaVersion: 2,
          normalizedCardNumber: 'OP01-001',
          printKey: 'MOCK::p1',
          variantLabel: 'Parallel 1',
          imageUrl: new URL('/parallel.png', window.location.origin).href,
        }),
      }),
    );
    expect(await screen.findByText('Se han añadido 2 copias de Parallel 1.')).toBeInTheDocument();
  });

  it('warns when the index reports more prints than the detail provides', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <CardDetails card={indexCard} onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    expect(
      (await screen.findAllByText(/El índice registra 6 impresiones/)).at(-1),
    ).toHaveTextContent('Pueden faltar 4 variantes');
    expect(serviceMocks.getById).toHaveBeenCalledWith(
      '10',
      expect.any(AbortSignal),
      expect.objectContaining({ indexCard }),
    );
  });
});
