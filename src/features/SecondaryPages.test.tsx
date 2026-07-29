import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initialBoxes, initialCollection, initialSalesPacks } from '../infrastructure/mockData';
import { BoxesPage, SalesPacksPage } from './SecondaryPages';

const serviceMocks = vi.hoisted(() => ({
  listCollection: vi.fn(),
  listBoxes: vi.fn(),
  saveBox: vi.fn(),
  removeBox: vi.fn(),
  listSalesPacks: vi.fn(),
  saveSalesPack: vi.fn(),
  removeSalesPack: vi.fn(),
}));

vi.mock('../app/providers/ServicesProvider', () => ({
  useServices: () => ({
    collection: {
      listCollection: serviceMocks.listCollection,
    },
    organization: {
      listBoxes: serviceMocks.listBoxes,
      saveBox: serviceMocks.saveBox,
      removeBox: serviceMocks.removeBox,
      listSalesPacks: serviceMocks.listSalesPacks,
      saveSalesPack: serviceMocks.saveSalesPack,
      removeSalesPack: serviceMocks.removeSalesPack,
    },
  }),
}));

function renderPage(page: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{page}</QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  serviceMocks.listCollection.mockResolvedValue(initialCollection);
  serviceMocks.listBoxes.mockResolvedValue(initialBoxes);
  serviceMocks.listSalesPacks.mockResolvedValue(initialSalesPacks);
});

afterEach(cleanup);

describe('organization and sales cards', () => {
  it('shows index thumbnails and aligns the container description with its icon and title', async () => {
    renderPage(<BoxesPage />);
    const box = initialBoxes[0];
    const item = initialCollection[0];
    if (!box || !item) throw new Error('Fixtures incompletos.');

    const title = await screen.findByRole('heading', { name: box.name });
    const headingContent = title.parentElement?.parentElement;
    expect(headingContent).toHaveTextContent(box.description ?? '');
    expect(headingContent?.querySelector('svg')).toBeInTheDocument();

    const thumbnail = await screen.findByAltText(item.card.name);
    expect(thumbnail).toHaveAttribute(
      'src',
      expect.stringMatching(/^\/api\/catalog\?action=image/),
    );
    fireEvent.error(thumbnail);
    const article = title.closest('article');
    if (!article) throw new Error('Tarjeta de contenedor no encontrada.');
    expect(within(article).queryByText(/imagen no disponible/i)).toBeNull();
  });

  it('uses the Ventas title and the same compact card header and thumbnails', async () => {
    renderPage(<SalesPacksPage />);
    const pack = initialSalesPacks[0];
    const item = initialCollection[0];
    if (!pack || !item) throw new Error('Fixtures incompletos.');

    expect(await screen.findByRole('heading', { name: 'Ventas' })).toBeInTheDocument();
    const title = await screen.findByRole('heading', { name: pack.name });
    const headingContent = title.parentElement?.parentElement;
    expect(headingContent).toHaveTextContent(pack.description ?? '');
    expect(headingContent?.querySelector('svg')).toBeInTheDocument();

    const thumbnail = await screen.findByAltText(item.card.name);
    fireEvent.error(thumbnail);
    const article = title.closest('article');
    if (!article) throw new Error('Tarjeta de venta no encontrada.');
    expect(within(article).queryByText(/imagen no disponible/i)).toBeNull();
  });
});
