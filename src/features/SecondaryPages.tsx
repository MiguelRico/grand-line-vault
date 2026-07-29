import {
  Archive,
  BarChart3,
  Box,
  CheckCircle2,
  Heart,
  MapPin,
  PackagePlus,
  Plus,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useServices } from '../app/providers/ServicesProvider';
import {
  calculateCollectionStats,
  reservedQuantities,
  salesPackAvailabilityWarnings,
} from '../domain/services';
import type { CollectionItem, SalesPack, SalesPackStatus, StorageBox } from '../domain/models';
import { PageHeader, SimplePage } from '../shared/AppShell';
import {
  Button,
  CardImage,
  EmptyState,
  QuantitySelector,
  ResponsiveDialog,
  SearchInput,
} from '../shared/ui';

function BoxEditor({ box, onClose }: { box: StorageBox | null; onClose: () => void }) {
  const services = useServices();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(box);
  if (box && draft?.id !== box.id) setDraft(box);
  const save = useMutation({
    mutationFn: (value: StorageBox) => services.organization.saveBox(value),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['boxes'] });
      onClose();
    },
  });
  return (
    <ResponsiveDialog
      open={Boolean(box)}
      onOpenChange={(open) => !open && onClose()}
      title="Editar contenedor"
    >
      {draft && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-violet">Almacenamiento</p>
          <h2 className="mt-1 pr-10 text-2xl font-black">Configurar contenedor</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Nombre
              <input
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                className="mt-2 h-11 w-full rounded-lg border-slate-300"
              />
            </label>
            <label className="text-sm font-semibold">
              Ubicación física
              <input
                value={draft.location ?? ''}
                onChange={(event) => setDraft({ ...draft, location: event.target.value })}
                placeholder="Ej. Estantería A"
                className="mt-2 h-11 w-full rounded-lg border-slate-300"
              />
            </label>
          </div>
          <label className="mt-4 block text-sm font-semibold">
            Descripción
            <textarea
              value={draft.description ?? ''}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              rows={2}
              className="mt-2 w-full rounded-lg border-slate-300"
            />
          </label>
          <div className="mt-6 flex items-center justify-between">
            <h3 className="font-black">Secciones</h3>
            <Button
              variant="secondary"
              onClick={() =>
                setDraft({
                  ...draft,
                  sections: [
                    ...draft.sections,
                    {
                      id: crypto.randomUUID(),
                      code: String.fromCharCode(65 + draft.sections.length),
                      name: 'Nueva sección',
                    },
                  ],
                })
              }
            >
              <Plus className="size-4" /> Añadir
            </Button>
          </div>
          <div className="mt-3 space-y-3">
            {draft.sections.map((section, index) => (
              <div key={section.id} className="grid grid-cols-[64px_1fr_44px] gap-2">
                <input
                  value={section.code}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      sections: draft.sections.map((entry, itemIndex) =>
                        itemIndex === index ? { ...entry, code: event.target.value } : entry,
                      ),
                    })
                  }
                  aria-label="Código de sección"
                  className="h-11 rounded-lg border-slate-300 text-center font-bold"
                />
                <input
                  value={section.name}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      sections: draft.sections.map((entry, itemIndex) =>
                        itemIndex === index ? { ...entry, name: event.target.value } : entry,
                      ),
                    })
                  }
                  aria-label="Nombre de sección"
                  className="h-11 min-w-0 rounded-lg border-slate-300"
                />
                <button
                  onClick={() =>
                    setDraft({
                      ...draft,
                      sections: draft.sections.filter((entry) => entry.id !== section.id),
                    })
                  }
                  className="grid size-11 place-items-center rounded-lg text-red-600 hover:bg-red-50"
                  aria-label={`Eliminar sección ${section.name}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
          <Button
            className="mt-7 w-full"
            disabled={!draft.name.trim() || draft.sections.length === 0 || save.isPending}
            onClick={() => save.mutate({ ...draft, updatedAt: new Date().toISOString() })}
          >
            Guardar contenedor y secciones
          </Button>
        </div>
      )}
    </ResponsiveDialog>
  );
}
export function BoxesPage() {
  const services = useServices();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<StorageBox | null>(null);
  const boxes = useQuery({ queryKey: ['boxes'], queryFn: () => services.organization.listBoxes() });
  const collection = useQuery({
    queryKey: ['collection'],
    queryFn: () => services.collection.listCollection(),
  });
  const remove = useMutation({
    mutationFn: (id: string) => services.organization.removeBox(id),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['boxes'] }),
  });
  const createBox = () => {
    const now = new Date().toISOString();
    setSelected({
      id: crypto.randomUUID(),
      name: 'Nuevo contenedor',
      sections: [{ id: crypto.randomUUID(), code: 'A', name: 'Sección principal' }],
      createdAt: now,
      updatedAt: now,
    });
  };
  return (
    <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Organización"
        subtitle="Gestiona los contenedores y secciones de tu inventario"
        action={
          <Button onClick={createBox}>
            <Plus className="size-4" /> Nuevo contenedor
          </Button>
        }
      />
      {!boxes.data?.length ? (
        <EmptyState
          title="Aún no hay contenedores"
          description="Crea tu primer contenedor y divídelo en secciones para empezar a ubicar cartas."
          action={<Button onClick={createBox}>Crear primer contenedor</Button>}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {boxes.data.map((box) => {
            const boxItems = (collection.data ?? []).filter((item) => item.boxId === box.id);
            const copies = boxItems.reduce((sum, item) => sum + item.quantity, 0);
            return (
              <article
                key={box.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <div className="grid size-12 place-items-center rounded-xl bg-indigo-50 text-violet">
                      <Archive className="size-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black">{box.name}</h2>
                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="size-3" /> {box.location || 'Ubicación sin indicar'}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
                    {copies} copias
                  </span>
                </div>
                <p className="mt-4 text-sm text-slate-600">
                  {box.description || 'Sin descripción'}
                </p>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {box.sections.map((section) => {
                    const sectionCopies = boxItems
                      .filter((item) => item.sectionId === section.id)
                      .reduce((sum, item) => sum + item.quantity, 0);
                    return (
                      <div key={section.id} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-bold">
                            {section.code} · {section.name}
                          </p>
                          <span className="text-xs text-slate-500">{sectionCopies}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-5 flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => setSelected(box)}>
                    Gestionar secciones
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      const inUse = (collection.data ?? []).some((item) => item.boxId === box.id);
                      if (inUse) {
                        window.alert('Mueve primero las cartas asignadas a este contenedor.');
                      } else if (window.confirm(`¿Eliminar ${box.name}?`)) {
                        remove.mutate(box.id);
                      }
                    }}
                    aria-label={`Eliminar ${box.name}`}
                  >
                    <Trash2 className="size-4 text-red-600" />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <BoxEditor box={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function PackEditor({ pack, onClose }: { pack: SalesPack | null; onClose: () => void }) {
  const services = useServices();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(pack);
  const [query, setQuery] = useState('');
  if (pack && draft?.id !== pack.id) setDraft(pack);
  const collection = useQuery({
    queryKey: ['collection'],
    queryFn: () => services.collection.listCollection(),
  });
  const packs = useQuery({
    queryKey: ['sales-packs'],
    queryFn: () => services.organization.listSalesPacks(),
  });
  const save = useMutation({
    mutationFn: (value: SalesPack) => services.organization.saveSalesPack(value),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sales-packs'] });
      onClose();
    },
  });
  if (!draft) return null;
  const reserved = reservedQuantities((packs.data ?? []).filter((entry) => entry.id !== draft.id));
  const available = (collection.data ?? []).filter((item) => {
    const normalized = query.toLocaleLowerCase();
    return (
      (!normalized ||
        item.card.name.toLocaleLowerCase().includes(normalized) ||
        item.card.card_number.toLocaleLowerCase().includes(normalized)) &&
      item.quantity - (reserved.get(item.id) ?? 0) > 0
    );
  });
  const warnings = salesPackAvailabilityWarnings(draft, collection.data ?? [], packs.data ?? []);
  const addItem = (collectionItemId: string) => {
    const item = collection.data?.find((entry) => entry.id === collectionItemId);
    if (!item || draft.items.some((entry) => entry.collectionItemId === item.id)) return;
    setDraft({
      ...draft,
      items: [
        ...draft.items,
        {
          id: crypto.randomUUID(),
          collectionItemId: item.id,
          quantity: 1,
        },
      ],
    });
  };
  return (
    <ResponsiveDialog
      open={Boolean(pack)}
      onOpenChange={(open) => !open && onClose()}
      title="Pack de venta"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-violet">
          Preparación de venta
        </p>
        <h2 className="mt-1 pr-10 text-2xl font-black">Configurar pack</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_160px]">
          <label className="text-sm font-semibold">
            Nombre
            <input
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              className="mt-2 h-11 w-full rounded-lg border-slate-300"
            />
          </label>
          <label className="text-sm font-semibold">
            Estado
            <select
              value={draft.status}
              onChange={(event) =>
                setDraft({ ...draft, status: event.target.value as SalesPackStatus })
              }
              className="mt-2 h-11 w-full rounded-lg border-slate-300"
            >
              <option value="DRAFT">Borrador</option>
              <option value="READY">Listo para venta</option>
              <option value="SOLD">Vendido</option>
              <option value="ARCHIVED">Archivado</option>
            </select>
          </label>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_160px]">
          <label className="text-sm font-semibold">
            Descripción
            <input
              value={draft.description ?? ''}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              className="mt-2 h-11 w-full rounded-lg border-slate-300"
            />
          </label>
          <label className="text-sm font-semibold">
            Precio de venta
            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.salePrice?.amount ?? ''}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  salePrice: event.target.value
                    ? { amount: Number(event.target.value), currency: 'EUR' }
                    : undefined,
                })
              }
              className="mt-2 h-11 w-full rounded-lg border-slate-300"
            />
          </label>
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <section>
            <h3 className="mb-3 font-black">Cartas del pack ({draft.items.length})</h3>
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {draft.items.map((item) => {
                const collectionItem = collection.data?.find(
                  (entry) => entry.id === item.collectionItemId,
                );
                const total = collectionItem?.quantity ?? 0;
                const max = Math.max(1, total - (reserved.get(item.collectionItemId) ?? 0));
                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-[42px_1fr_auto_40px] items-center gap-2 rounded-lg border border-slate-200 p-2"
                  >
                    <CardImage
                      src={collectionItem?.variant?.image ?? collectionItem?.card.image ?? ''}
                      alt={collectionItem?.card.name ?? 'Carta'}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">
                        {collectionItem?.card.name ?? 'Carta no disponible'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {collectionItem?.card.card_number}
                      </p>
                    </div>
                    <QuantitySelector
                      value={item.quantity}
                      min={1}
                      max={max}
                      onChange={(quantity) =>
                        setDraft({
                          ...draft,
                          items: draft.items.map((entry) =>
                            entry.id === item.id ? { ...entry, quantity } : entry,
                          ),
                        })
                      }
                    />
                    <button
                      onClick={() =>
                        setDraft({
                          ...draft,
                          items: draft.items.filter((entry) => entry.id !== item.id),
                        })
                      }
                      className="grid size-10 place-items-center text-red-600"
                      aria-label={`Quitar ${collectionItem?.card.name ?? 'carta'}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                );
              })}
              {draft.items.length === 0 && (
                <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                  Selecciona cartas del inventario.
                </p>
              )}
            </div>
          </section>
          <section>
            <h3 className="mb-3 font-black">Inventario disponible</h3>
            <SearchInput value={query} onChange={setQuery} placeholder="Buscar carta..." />
            <div className="mt-2 max-h-60 space-y-1 overflow-y-auto">
              {available.slice(0, 30).map((item) => (
                <button
                  key={item.id}
                  onClick={() => addItem(item.id)}
                  disabled={draft.items.some((entry) => entry.collectionItemId === item.id)}
                  className="flex w-full items-center justify-between rounded-lg p-2 text-left text-sm hover:bg-slate-50 disabled:opacity-40"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{item.card.name}</span>
                    <span className="text-xs text-slate-500">{item.card.card_number}</span>
                  </span>
                  <span className="ml-2 shrink-0 text-xs font-bold">
                    {item.quantity - (reserved.get(item.id) ?? 0)} disp.
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
        {warnings.length > 0 && (
          <div role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {warnings.join(' ')}
          </div>
        )}
        <Button
          className="mt-6 w-full"
          disabled={!draft.name.trim() || draft.items.length === 0 || warnings.length > 0}
          onClick={() => save.mutate({ ...draft, updatedAt: new Date().toISOString() })}
        >
          Guardar pack de venta
        </Button>
      </div>
    </ResponsiveDialog>
  );
}

export function SalesPacksPage() {
  const services = useServices();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<SalesPack | null>(null);
  const packs = useQuery({
    queryKey: ['sales-packs'],
    queryFn: () => services.organization.listSalesPacks(),
  });
  const collection = useQuery({
    queryKey: ['collection'],
    queryFn: () => services.collection.listCollection(),
  });
  const remove = useMutation({
    mutationFn: (id: string) => services.organization.removeSalesPack(id),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['sales-packs'] }),
  });
  const newPack = () => {
    const now = new Date().toISOString();
    setSelected({
      id: crypto.randomUUID(),
      name: 'Nuevo pack',
      description: '',
      status: 'DRAFT',
      items: [],
      createdAt: now,
      updatedAt: now,
    });
  };
  const labels: Record<SalesPackStatus, string> = {
    DRAFT: 'Borrador',
    READY: 'Listo para venta',
    SOLD: 'Vendido',
    ARCHIVED: 'Archivado',
  };
  return (
    <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Packs de venta"
        subtitle="Agrupa copias disponibles y prepara lotes sin descuadrar el inventario"
        action={
          <Button onClick={newPack}>
            <PackagePlus className="size-4" /> Crear pack
          </Button>
        }
      />
      {!packs.data?.length ? (
        <EmptyState
          title="No hay packs de venta"
          description="Crea un pack seleccionando cartas y cantidades de tu inventario."
          action={<Button onClick={newPack}>Crear primer pack</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {packs.data.map((pack) => {
            const warnings = salesPackAvailabilityWarnings(
              pack,
              collection.data ?? [],
              packs.data ?? [],
            );
            const copies = pack.items.reduce((sum, item) => sum + item.quantity, 0);
            return (
              <article
                key={pack.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="grid size-12 place-items-center rounded-xl bg-indigo-50 text-violet">
                    <ShoppingBag className="size-6" />
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      pack.status === 'READY'
                        ? 'bg-emerald-50 text-emerald-700'
                        : pack.status === 'SOLD'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {labels[pack.status]}
                  </span>
                </div>
                <h2 className="mt-5 text-lg font-black">{pack.name}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                  {pack.description || 'Sin descripción'}
                </p>
                <div className="mt-4 flex -space-x-3">
                  {pack.items.slice(0, 6).map((item) => {
                    const collectionItem = collection.data?.find(
                      (entry) => entry.id === item.collectionItemId,
                    );
                    return (
                      <CardImage
                        key={item.id}
                        src={collectionItem?.variant?.image ?? collectionItem?.card.image ?? ''}
                        alt={collectionItem?.card.name ?? 'Carta'}
                        className="w-12 border-2 border-white"
                      />
                    );
                  })}
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <p className="text-xs text-slate-500">{copies} copias</p>
                    <p className="mt-1 text-xl font-black">
                      {pack.salePrice
                        ? `${pack.salePrice.amount.toFixed(2)} ${pack.salePrice.currency}`
                        : 'Sin precio'}
                    </p>
                  </div>
                  {warnings.length === 0 ? (
                    <CheckCircle2 className="size-5 text-emerald-500" aria-label="Stock correcto" />
                  ) : (
                    <span className="text-xs font-bold text-red-600">Revisar stock</span>
                  )}
                </div>
                <div className="mt-5 flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => setSelected(pack)}>
                    Gestionar pack
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (window.confirm(`¿Eliminar ${pack.name}?`)) remove.mutate(pack.id);
                    }}
                    aria-label={`Eliminar ${pack.name}`}
                  >
                    <Trash2 className="size-4 text-red-600" />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <PackEditor pack={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

export function StatisticsPage() {
  const services = useServices();
  const collection = useQuery({
    queryKey: ['collection'],
    queryFn: () => services.collection.listCollection(),
  });
  const packs = useQuery({
    queryKey: ['sales-packs'],
    queryFn: () => services.organization.listSalesPacks(),
  });
  const stats = calculateCollectionStats(collection.data ?? []);
  const reserved = Array.from(reservedQuantities(packs.data ?? []).values()).reduce(
    (sum, quantity) => sum + quantity,
    0,
  );
  const rows = [
    ['Copias totales', stats.totalCopies, 'bg-indigo-500'],
    ['Copias ubicadas', stats.storedCopies, 'bg-emerald-500'],
    ['Sin ubicar', stats.unassignedCopies, 'bg-amber-500'],
    ['Reservadas en packs', reserved, 'bg-sky-500'],
    ['Cartas diferentes', stats.uniqueCards, 'bg-rose-500'],
  ] as const;
  const max = Math.max(...rows.map((row) => row[1]), 1);
  return (
    <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
      <PageHeader title="Estadísticas" subtitle="Inventario, ubicación y preparación de ventas" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl bg-gradient-to-br from-violet to-indigo-700 p-6 text-white shadow-soft sm:col-span-2">
          <BarChart3 className="size-7 opacity-80" />
          <p className="mt-5 text-sm font-medium text-indigo-100">
            Coste de adquisición registrado
          </p>
          <p className="mt-1 text-4xl font-black">
            {stats.acquisitionValue.amount.toFixed(2)} {stats.acquisitionValue.currency}
          </p>
          <p className="mt-4 max-w-xl text-xs leading-5 text-indigo-100">
            Solo utiliza importes introducidos por el usuario. Los precios de mercado no se
            almacenan en la colección.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <Box className="size-7 text-violet" />
          <p className="mt-5 text-sm text-slate-500">Copias sin ubicación</p>
          <p className="mt-1 text-4xl font-black">{stats.unassignedCopies}</p>
          <Link to="/collection" className="mt-3 inline-block text-sm font-bold text-violet">
            Asignar ubicaciones
          </Link>
        </div>
      </div>
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="font-black">Resumen operativo</h2>
        <div className="mt-6 space-y-5">
          {rows.map(([label, value, color]) => (
            <div key={label}>
              <div className="mb-2 flex justify-between text-sm">
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${color}`}
                  style={{ width: `${(value / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function FavoritesPage() {
  const services = useServices();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'favorites' | 'wishlist'>('favorites');
  const collection = useQuery({
    queryKey: ['collection'],
    queryFn: () => services.collection.listCollection(),
  });
  const wishlist = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => services.wishlist.listWishlist(),
  });
  const unfavorite = useMutation({
    mutationFn: (item: CollectionItem) =>
      services.collection.saveCollection({
        ...item,
        favorite: false,
        updatedAt: new Date().toISOString(),
      }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['collection'] }),
  });
  const removeWish = useMutation({
    mutationFn: (id: string) => services.wishlist.remove(id),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
  });
  const favorites = (collection.data ?? []).filter((item) => item.favorite);
  const activeItems = tab === 'favorites' ? favorites : (wishlist.data ?? []);

  return (
    <SimplePage title="Favoritos y lista de deseos">
      <div className="mb-6 flex overflow-x-auto border-b border-slate-200">
        <button
          onClick={() => setTab('favorites')}
          className={`min-h-11 border-b-2 px-4 text-sm font-semibold ${
            tab === 'favorites' ? 'border-violet text-violet' : 'border-transparent text-slate-600'
          }`}
        >
          Favoritos ({favorites.length})
        </button>
        <button
          onClick={() => setTab('wishlist')}
          className={`min-h-11 border-b-2 px-4 text-sm font-semibold ${
            tab === 'wishlist' ? 'border-violet text-violet' : 'border-transparent text-slate-600'
          }`}
        >
          Lista de deseos ({wishlist.data?.length ?? 0})
        </button>
      </div>
      {activeItems.length === 0 ? (
        <EmptyState
          title={tab === 'favorites' ? 'No hay favoritas' : 'Tu lista de deseos está vacía'}
          description={
            tab === 'favorites'
              ? 'Marca el corazón al gestionar cualquier lote de tu colección.'
              : 'Abre una carta o variante desde el catálogo y añádela a tu lista de deseos.'
          }
          action={
            tab === 'wishlist' ? (
              <Link to="/catalog">
                <Button>Explorar catálogo</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {tab === 'favorites'
            ? favorites.map((item) => (
                <article
                  key={item.id}
                  className="grid grid-cols-[72px_1fr_auto] items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
                >
                  <CardImage src={item.variant?.image ?? item.card.image} alt={item.card.name} />
                  <div className="min-w-0">
                    <h2 className="truncate font-bold">{item.card.name}</h2>
                    <p className="text-xs text-slate-500">{item.card.card_number}</p>
                    <p className="mt-1 truncate text-xs font-semibold text-violet">
                      {item.variant?.label ?? 'Arte principal'} · ×{item.quantity}
                    </p>
                  </div>
                  <button
                    onClick={() => unfavorite.mutate(item)}
                    disabled={unfavorite.isPending}
                    className="grid size-11 place-items-center rounded-lg hover:bg-red-50 disabled:opacity-50"
                    aria-label={`Quitar ${item.card.name} de favoritos`}
                  >
                    <Heart className="size-5 fill-red-500 text-red-500" />
                  </button>
                </article>
              ))
            : (wishlist.data ?? []).map((item) => (
                <article
                  key={item.id}
                  className="grid grid-cols-[72px_1fr_auto] items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
                >
                  <Link to={`/catalog?card=${encodeURIComponent(item.catalogCardId)}`}>
                    <CardImage
                      src={item.variant?.image ?? item.card.image}
                      alt={item.card.name}
                      showFailureText={false}
                    />
                  </Link>
                  <div className="min-w-0">
                    <Link
                      to={`/catalog?card=${encodeURIComponent(item.catalogCardId)}`}
                      className="block truncate font-bold hover:text-violet"
                    >
                      {item.card.name}
                    </Link>
                    <p className="text-xs text-slate-500">{item.card.card_number}</p>
                    <p className="mt-1 truncate text-xs font-semibold text-violet">
                      {item.variant?.label ?? 'Arte principal'}
                    </p>
                  </div>
                  <button
                    onClick={() => removeWish.mutate(item.id)}
                    disabled={removeWish.isPending}
                    className="grid size-11 place-items-center rounded-lg text-violet hover:bg-indigo-50 disabled:opacity-50"
                    aria-label={`Quitar ${item.card.name} de la lista de deseos`}
                  >
                    <Heart className="size-5 fill-current" />
                  </button>
                </article>
              ))}
        </div>
      )}
    </SimplePage>
  );
}
