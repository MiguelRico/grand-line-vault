import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
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
    catalog: { getById: serviceMocks.getById },
    privateData: {
      listCollection: serviceMocks.listCollection,
      saveCollection: serviceMocks.saveCollection,
    },
  }),
}));

const card: Card = {
  id: 'BASE::OP01-001',
  code: 'OP01-001',
  name: 'Monkey D. Luffy',
  type: 'LEADER',
  colors: ['RED'],
  rarity: 'L',
  set: { code: 'OP-01', name: 'Romance Dawn' },
  life: 5,
  power: 5000,
  attributes: ['Strike'],
  traits: ['Straw Hat Crew'],
  language: 'EN',
  imageUrl: '/base.png',
  prices: [{ amount: 1, currency: 'USD', source: 'base-price', marketType: 'MARKET' }],
  sources: [{ providerId: 'OFFICIAL_STATIC', fetchedAt: '2026-07-25T00:00:00.000Z' }],
  variants: [
    {
      id: 'VARIANT::OP01-001::p1',
      baseCardId: 'BASE::OP01-001',
      type: 'PARALLEL',
      label: 'Parallel 1',
      imageUrl: '/parallel.png',
      language: 'JP',
      prices: [{ amount: 12, currency: 'USD', source: 'variant-price', marketType: 'MARKET' }],
      sources: [{ providerId: 'MOCK', fetchedAt: '2026-07-25T00:00:00.000Z' }],
    },
  ],
};

beforeEach(() => {
  serviceMocks.getById.mockResolvedValue(card);
  serviceMocks.listCollection.mockResolvedValue([]);
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

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar Parallel 1' }));

    expect(screen.getByAltText(`Carta ${card.name} — Parallel 1`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mostrar Parallel 1' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText('Parallel 1')).toBeInTheDocument();
    expect(screen.getByText('12.00 USD')).toBeInTheDocument();
    expect(screen.getByText('variant-price')).toBeInTheDocument();
    expect(screen.getByText(/· JP$/)).toBeInTheDocument();
    expect(screen.getByText(/Fuente de datos:/).parentElement).toHaveTextContent('MOCK');
  });
});
