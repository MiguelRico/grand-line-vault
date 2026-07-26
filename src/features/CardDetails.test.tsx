import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Card } from '../domain/models';
import { CardDetails } from './CardDetails';

const serviceMocks = vi.hoisted(() => ({
  getById: vi.fn(),
  listCollection: vi.fn(),
  saveCollection: vi.fn(),
}));

vi.mock('../app/providers/ServicesProvider', () => ({
  useServices: () => ({
    catalogProvider: 'OFFICIAL_STATIC',
    catalog: { getById: serviceMocks.getById },
    privateData: {
      listCollection: serviceMocks.listCollection,
      saveCollection: serviceMocks.saveCollection,
    },
  }),
}));

const card: Card = {
  id: 'BASE::OP01-001',
  external_id: 'OP01-001',
  name: 'Monkey D. Luffy',
  name_numbered: 'Monkey D. Luffy OP01-001',
  slug: 'monkey-d-luffy',
  type: 'singles',
  card_number: 'OP01-001',
  rarity: 'L',
  color: 'Red',
  episode: { id: 'OP-01', code: 'OP-01', name: 'Romance Dawn', slug: 'romance-dawn' },
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
      image: '/parallel.png',
      language: 'JP',
      prices: { tcgplayer: { currency: 'USD', market_price: 12 } },
      source: { providerId: 'MOCK', fetchedAt: '2026-07-25T00:00:00.000Z' },
    },
  ],
};

const collectionItems = [
  {
    id: 'base-lot',
    cardId: card.id,
    cardVariantId: card.id,
    cardSnapshot: {
      code: card.card_number,
      name: card.name,
      setCode: card.episode.code,
      variantLabel: 'Normal',
      imageUrl: 'https://example.test/base.png',
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
      code: card.card_number,
      name: card.name,
      setCode: card.episode.code,
      variantLabel: 'Parallel 1',
      imageUrl: 'https://example.test/parallel.png',
    },
    quantity: 3,
    language: 'JP' as const,
    condition: 'NEAR_MINT' as const,
    favorite: false,
    createdAt: '2026-07-25T00:00:00.000Z',
    updatedAt: '2026-07-25T00:00:00.000Z',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  serviceMocks.getById.mockResolvedValue(card);
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
        <CardDetails cardId={card.id} onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    await screen.findByRole('heading', { name: card.name });
    expect(screen.getByText('1.00 USD')).toBeInTheDocument();
    expect(await screen.findByText('2 copias de Arte base')).toBeInTheDocument();
    expect(screen.getByText('Total entre todos los artes: 5')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar Parallel 1' }));

    expect(screen.getByAltText(`Carta ${card.name} — Parallel 1`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mostrar Parallel 1' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText('Parallel 1')).toBeInTheDocument();
    expect(screen.getByText('12.00 USD')).toBeInTheDocument();
    expect(screen.getByText('TCGPlayer')).toBeInTheDocument();
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
        <CardDetails cardId={card.id} onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    await screen.findByRole('heading', { name: card.name });
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar Parallel 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar cantidad' }));
    fireEvent.click(screen.getByRole('button', { name: 'Añadir 2 copias de Parallel 1' }));

    await waitFor(() => expect(serviceMocks.saveCollection).toHaveBeenCalledOnce());
    expect(serviceMocks.saveCollection).toHaveBeenCalledWith(
      expect.objectContaining({
        cardId: card.id,
        cardVariantId: card.artworks[0]?.id,
        quantity: 2,
        language: 'JP',
        cardSnapshot: expect.objectContaining({
          variantLabel: 'Parallel 1',
          imageUrl: new URL('/parallel.png', window.location.origin).href,
        }),
      }),
    );
    expect(await screen.findByText('Se han añadido 2 copias de Parallel 1.')).toBeInTheDocument();
  });
});
