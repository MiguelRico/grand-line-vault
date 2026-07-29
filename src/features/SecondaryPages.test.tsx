import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initialBoxes, initialCollection, initialSalesPacks } from '../infrastructure/mockData';
import { BoxesPage, SalesPacksPage } from './SecondaryPages';

const serviceMocks = vi.hoisted(() => ({
  listCollection: vi.fn(),
  saveCollection: vi.fn(),
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
      saveCollection: serviceMocks.saveCollection,
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
  serviceMocks.saveCollection.mockImplementation(async (value) => value);
  serviceMocks.saveBox.mockImplementation(async (value) => value);
  serviceMocks.saveSalesPack.mockImplementation(async (value) => value);
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
    expect(headingContent?.parentElement).toHaveClass('flex-col', 'sm:flex-row');

    const thumbnail = await screen.findByAltText(item.card.name);
    expect(thumbnail).toHaveAttribute(
      'src',
      expect.stringMatching(/^\/api\/catalog\?action=image/),
    );
    fireEvent.error(thumbnail);
    const article = title.closest('article');
    if (!article) throw new Error('Tarjeta de contenedor no encontrada.');
    expect(within(article).queryByText(/imagen no disponible/i)).toBeNull();
    expect(within(article).getAllByText(item.card.episode.name).length).toBeGreaterThan(0);
    expect(within(article).getAllByText('Arte base').length).toBeGreaterThan(0);
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
    expect(headingContent?.parentElement).toHaveClass('flex-col', 'sm:flex-row');

    const thumbnail = await screen.findByAltText(item.card.name);
    fireEvent.error(thumbnail);
    const article = title.closest('article');
    if (!article) throw new Error('Tarjeta de venta no encontrada.');
    expect(within(article).queryByText(/imagen no disponible/i)).toBeNull();
    expect(within(article).getAllByText(item.card.episode.name).length).toBeGreaterThan(0);
    expect(within(article).getAllByText('Arte base').length).toBeGreaterThan(0);
  });

  it('manages container contents from the same editor', async () => {
    renderPage(<BoxesPage />);
    const box = initialBoxes[0];
    const firstItem = initialCollection[0];
    const removedItem = initialCollection[1];
    const addedItem = initialCollection[8];
    if (!box || !firstItem || !removedItem || !addedItem) {
      throw new Error('Fixtures incompletos.');
    }

    const title = await screen.findByRole('heading', { name: box.name });
    const article = title.closest('article');
    if (!article) throw new Error('Tarjeta de contenedor no encontrada.');
    fireEvent.click(within(article).getByRole('button', { name: 'Gestionar secciones' }));

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByRole('heading', { name: 'Cartas del contenedor (4)' }),
    ).toBeInTheDocument();
    const sectionCode = within(dialog).getAllByLabelText('Código de sección')[0];
    expect(sectionCode?.parentElement).toHaveClass(
      'grid-cols-[minmax(0,1fr)_44px]',
      'sm:grid-cols-[64px_minmax(0,1fr)_44px]',
    );
    fireEvent.click(
      within(dialog).getByRole('button', {
        name: `Quitar ${removedItem.card.name} del contenedor`,
      }),
    );
    fireEvent.change(within(dialog).getByRole('searchbox', { name: 'Buscar' }), {
      target: { value: addedItem.card.name },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: new RegExp(addedItem.card.name) }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar contenedor y secciones' }));

    await vi.waitFor(() =>
      expect(serviceMocks.saveCollection).toHaveBeenCalledWith(
        expect.objectContaining({
          id: addedItem.id,
          boxId: box.id,
          sectionId: box.sections[0]?.id,
        }),
      ),
    );
    expect(serviceMocks.saveCollection).toHaveBeenCalledWith(
      expect.objectContaining({
        id: removedItem.id,
        boxId: undefined,
        sectionId: undefined,
      }),
    );
  });

  it('allows saving a container without cards', async () => {
    renderPage(<BoxesPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Nuevo contenedor' }));
    const dialog = await screen.findByRole('dialog');
    const saveButton = within(dialog).getByRole('button', {
      name: 'Guardar contenedor y secciones',
    });
    expect(within(dialog).getByText(/el contenedor está vacío/i)).toBeInTheDocument();
    expect(saveButton).toBeEnabled();
    fireEvent.click(saveButton);

    await vi.waitFor(() =>
      expect(serviceMocks.saveBox).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Nuevo contenedor' }),
      ),
    );
  });

  it('allows saving a sales pack without cards', async () => {
    renderPage(<SalesPacksPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Crear pack' }));
    const dialog = await screen.findByRole('dialog');
    const saveButton = within(dialog).getByRole('button', { name: 'Guardar pack de venta' });
    expect(saveButton).toBeEnabled();
    fireEvent.click(saveButton);

    await vi.waitFor(() =>
      expect(serviceMocks.saveSalesPack).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Nuevo pack',
          items: [],
        }),
      ),
    );
  });
});
