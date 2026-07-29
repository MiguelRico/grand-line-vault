import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initialBoxes, initialCollection } from '../infrastructure/mockData';
import { CollectionPage } from './CollectionPage';

const serviceMocks = vi.hoisted(() => ({
  listCollection: vi.fn(),
  saveCollection: vi.fn(),
  removeCollection: vi.fn(),
  listBoxes: vi.fn(),
  listSalesPacks: vi.fn(),
  saveSalesPack: vi.fn(),
}));

vi.mock('../app/providers/ServicesProvider', () => ({
  useServices: () => ({
    collection: {
      listCollection: serviceMocks.listCollection,
      saveCollection: serviceMocks.saveCollection,
      removeCollection: serviceMocks.removeCollection,
    },
    organization: {
      listBoxes: serviceMocks.listBoxes,
      listSalesPacks: serviceMocks.listSalesPacks,
      saveSalesPack: serviceMocks.saveSalesPack,
    },
  }),
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <CollectionPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  const item = initialCollection[0];
  if (!item) throw new Error('Fixture de colección incompleto.');
  serviceMocks.listCollection.mockResolvedValue([item]);
  serviceMocks.listBoxes.mockResolvedValue(initialBoxes);
  serviceMocks.listSalesPacks.mockResolvedValue([]);
  serviceMocks.saveCollection.mockImplementation(async (value) => value);
  serviceMocks.removeCollection.mockResolvedValue(undefined);
  serviceMocks.saveSalesPack.mockImplementation(async (value) => value);
});

describe('CollectionPage detail', () => {
  it('updates quantity and removes a lot from the active printing', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const item = initialCollection[0];
    if (!item) throw new Error('Fixture de colección incompleto.');
    renderPage();

    fireEvent.click(
      await screen.findByRole('button', {
        name: `Ver ${item.card.name}, 1 impresiones`,
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar cantidad' }));
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar cantidad' }));

    await waitFor(() =>
      expect(serviceMocks.saveCollection).toHaveBeenCalledWith(
        expect.objectContaining({ id: item.id, quantity: item.quantity + 1 }),
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar lote' }));
    await waitFor(() => expect(serviceMocks.removeCollection).toHaveBeenCalledWith(item.id));
  });

  it('limits the organization editor to container and section assignment', async () => {
    const item = initialCollection[0];
    if (!item) throw new Error('Fixture de colección incompleto.');
    renderPage();

    fireEvent.click(
      await screen.findByRole('button', {
        name: `Ver ${item.card.name}, 1 impresiones`,
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: /Ubicar lote/ }));

    const dialog = await screen.findByRole('dialog', { name: 'Ubicar carta' });
    expect(within(dialog).getByLabelText('Contenedor')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Sección')).toBeInTheDocument();
    expect(within(dialog).queryByText('Cantidad total')).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /Eliminar/ })).not.toBeInTheDocument();
  });
});
