import {
  Archive,
  AlertTriangle,
  BarChart3,
  Box,
  CheckCircle2,
  ChevronDown,
  Database,
  Gauge,
  Heart,
  Layers3,
  MapPin,
  Moon,
  PackagePlus,
  Palette,
  Plus,
  RefreshCw,
  Shapes,
  ShoppingBag,
  Sparkles,
  Sun,
  Trash2,
  WifiOff,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useServices } from '../app/providers/ServicesProvider';
import { useSettings } from '../app/providers/SettingsProvider';
import {
  calculateCollectionStats,
  reservedQuantities,
  salesPackAvailabilityWarnings,
} from '../domain/services';
import type {
  AppSettings,
  CatalogFilterBucket,
  CatalogFilterSummary,
  CatalogProviderStatus,
  SalesPack,
  SalesPackStatus,
  StorageBox,
} from '../domain/models';
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
    mutationFn: (value: StorageBox) => services.privateData.saveBox(value),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['boxes'] });
      onClose();
    },
  });
  return (
    <ResponsiveDialog
      open={Boolean(box)}
      onOpenChange={(open) => !open && onClose()}
      title="Editar caja"
    >
      {draft && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-violet">Almacenamiento</p>
          <h2 className="mt-1 pr-10 text-2xl font-black">Configurar caja</h2>
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
              <div key={section.id} className="grid grid-cols-[64px_1fr_90px_44px] gap-2">
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
                <input
                  type="number"
                  min="1"
                  value={section.capacity ?? ''}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      sections: draft.sections.map((entry, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...entry,
                              capacity: event.target.value ? Number(event.target.value) : undefined,
                            }
                          : entry,
                      ),
                    })
                  }
                  placeholder="Cap."
                  aria-label="Capacidad"
                  className="h-11 rounded-lg border-slate-300"
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
            Guardar caja y secciones
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
  const boxes = useQuery({ queryKey: ['boxes'], queryFn: () => services.privateData.listBoxes() });
  const collection = useQuery({
    queryKey: ['collection'],
    queryFn: () => services.privateData.listCollection(),
  });
  const remove = useMutation({
    mutationFn: (id: string) => services.privateData.removeBox(id),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['boxes'] }),
  });
  const createBox = () => {
    const now = new Date().toISOString();
    setSelected({
      id: crypto.randomUUID(),
      name: 'Nueva caja',
      sections: [{ id: crypto.randomUUID(), code: 'A', name: 'Sección principal' }],
      createdAt: now,
      updatedAt: now,
    });
  };
  return (
    <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Cajas y secciones"
        subtitle="El mapa físico de todo tu inventario"
        action={
          <Button onClick={createBox}>
            <Plus className="size-4" /> Nueva caja
          </Button>
        }
      />
      {!boxes.data?.length ? (
        <EmptyState
          title="Aún no hay cajas"
          description="Crea tu primera caja y divídela en secciones para empezar a ubicar cartas."
          action={<Button onClick={createBox}>Crear primera caja</Button>}
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
                    const percent = section.capacity
                      ? Math.min(100, (sectionCopies / section.capacity) * 100)
                      : 0;
                    return (
                      <div key={section.id} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-bold">
                            {section.code} · {section.name}
                          </p>
                          <span className="text-xs text-slate-500">
                            {sectionCopies}
                            {section.capacity ? `/${section.capacity}` : ''}
                          </span>
                        </div>
                        {section.capacity && (
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-violet"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        )}
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
                        window.alert('Mueve primero las cartas asignadas a esta caja.');
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
    queryFn: () => services.privateData.listCollection(),
  });
  const packs = useQuery({
    queryKey: ['sales-packs'],
    queryFn: () => services.privateData.listSalesPacks(),
  });
  const save = useMutation({
    mutationFn: (value: SalesPack) => services.privateData.saveSalesPack(value),
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
        item.cardSnapshot.name.toLocaleLowerCase().includes(normalized) ||
        item.cardSnapshot.code.toLocaleLowerCase().includes(normalized)) &&
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
          snapshot: item.cardSnapshot,
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
                const total =
                  collection.data?.find((entry) => entry.id === item.collectionItemId)?.quantity ??
                  0;
                const max = Math.max(1, total - (reserved.get(item.collectionItemId) ?? 0));
                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-[42px_1fr_auto_40px] items-center gap-2 rounded-lg border border-slate-200 p-2"
                  >
                    <CardImage src={item.snapshot.imageUrl} alt={item.snapshot.name} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{item.snapshot.name}</p>
                      <p className="text-[11px] text-slate-500">{item.snapshot.code}</p>
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
                      aria-label={`Quitar ${item.snapshot.name}`}
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
                    <span className="block truncate font-semibold">{item.cardSnapshot.name}</span>
                    <span className="text-xs text-slate-500">{item.cardSnapshot.code}</span>
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
    queryFn: () => services.privateData.listSalesPacks(),
  });
  const collection = useQuery({
    queryKey: ['collection'],
    queryFn: () => services.privateData.listCollection(),
  });
  const remove = useMutation({
    mutationFn: (id: string) => services.privateData.removeSalesPack(id),
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
                  {pack.items.slice(0, 6).map((item) => (
                    <CardImage
                      key={item.id}
                      src={item.snapshot.imageUrl}
                      alt={item.snapshot.name}
                      className="w-12 border-2 border-white"
                    />
                  ))}
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
    queryFn: () => services.privateData.listCollection(),
  });
  const packs = useQuery({
    queryKey: ['sales-packs'],
    queryFn: () => services.privateData.listSalesPacks(),
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
          <p className="mt-5 text-sm font-medium text-indigo-100">Valor estimado del inventario</p>
          <p className="mt-1 text-4xl font-black">
            {stats.estimatedValue.amount.toFixed(2)} {stats.estimatedValue.currency}
          </p>
          <p className="mt-4 max-w-xl text-xs leading-5 text-indigo-100">
            Estimación orientativa basada en precios de catálogo, separada del precio fijado para
            cada pack.
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
  const collection = useQuery({
    queryKey: ['collection'],
    queryFn: () => services.privateData.listCollection(),
  });
  const favorites = (collection.data ?? []).filter((item) => item.favorite);
  return (
    <SimplePage title="Favoritos">
      {favorites.length === 0 ? (
        <EmptyState
          title="No hay favoritas"
          description="Marca el corazón en cualquier carta del inventario."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {favorites.map((item) => (
            <article
              key={item.id}
              className="grid grid-cols-[72px_1fr_auto] items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
            >
              <CardImage src={item.cardSnapshot.imageUrl} alt={item.cardSnapshot.name} />
              <div className="min-w-0">
                <h2 className="truncate font-bold">{item.cardSnapshot.name}</h2>
                <p className="text-xs text-slate-500">{item.cardSnapshot.code}</p>
              </div>
              <Heart className="size-5 fill-red-500 text-red-500" />
            </article>
          ))}
        </div>
      )}
    </SimplePage>
  );
}

const catalogFilterLabels: Record<string, string> = {
  RED: 'Rojo',
  GREEN: 'Verde',
  BLUE: 'Azul',
  PURPLE: 'Púrpura',
  BLACK: 'Negro',
  YELLOW: 'Amarillo',
  LEADER: 'Líder',
  CHARACTER: 'Personaje',
  EVENT: 'Evento',
  STAGE: 'Escenario',
  DON: 'DON!!',
  L: 'Líder',
  C: 'Común',
  UC: 'Infrecuente',
  R: 'Rara',
  SR: 'Super Rare',
  SEC: 'Secret Rare',
  PR: 'Promo',
  TR: 'Treasure Rare',
  BASE: 'Base',
  PARALLEL: 'Paralela',
};

const catalogNumber = new Intl.NumberFormat('es-ES');

const filterGroupStyles = {
  violet: {
    icon: 'bg-violet/10 text-violet dark:bg-violet/20 dark:text-indigo-300',
    bar: 'bg-violet',
    count: 'text-violet dark:text-indigo-300',
  },
  blue: {
    icon: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300',
    bar: 'bg-blue-500',
    count: 'text-blue-700 dark:text-blue-300',
  },
  amber: {
    icon: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300',
    bar: 'bg-amber-500',
    count: 'text-amber-700 dark:text-amber-300',
  },
  emerald: {
    icon: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300',
    bar: 'bg-emerald-500',
    count: 'text-emerald-700 dark:text-emerald-300',
  },
} as const;

const cardColorStyles: Record<string, string> = {
  RED: 'bg-red-500',
  GREEN: 'bg-emerald-500',
  BLUE: 'bg-blue-500',
  PURPLE: 'bg-purple-500',
  BLACK: 'bg-slate-900 ring-1 ring-slate-300 dark:bg-slate-200',
  YELLOW: 'bg-amber-400',
};

function FilterTotalGroup({
  title,
  buckets,
  icon: Icon,
  tone,
  compact = false,
  showColor = false,
}: {
  title: string;
  buckets: CatalogFilterBucket[];
  icon: LucideIcon;
  tone: keyof typeof filterGroupStyles;
  compact?: boolean;
  showColor?: boolean;
}) {
  if (!buckets.length) return null;
  const styles = filterGroupStyles[tone];
  const maximum = Math.max(...buckets.map((bucket) => bucket.count));
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:bg-slate-900/40">
      <div className="flex items-center gap-2.5">
        <span className={`grid size-8 place-items-center rounded-lg ${styles.icon}`}>
          <Icon className="size-4" />
        </span>
        <div>
          <h4 className="text-sm font-black text-slate-900">{title}</h4>
          <p className="text-[11px] text-slate-500">
            {buckets.length} {buckets.length === 1 ? 'opción' : 'opciones'}
          </p>
        </div>
      </div>
      {compact ? (
        <div className="mt-3 grid grid-cols-4 gap-1.5 sm:grid-cols-6">
          {buckets.map((bucket) => (
            <div
              key={bucket.value}
              className="rounded-lg border border-slate-100 bg-slate-50 px-1.5 py-2 text-center"
            >
              <span className="block text-xs font-black text-slate-800">
                {catalogFilterLabels[bucket.value] ?? bucket.value}
              </span>
              <span className={`mt-0.5 block text-[11px] font-bold ${styles.count}`}>
                {catalogNumber.format(bucket.count)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {buckets.map((bucket) => (
            <div
              key={bucket.value}
              className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5 truncate text-xs font-semibold text-slate-700">
                  {showColor && (
                    <span
                      className={`size-2.5 shrink-0 rounded-full ${
                        cardColorStyles[bucket.value] ?? 'bg-slate-400'
                      }`}
                    />
                  )}
                  <span className="truncate">
                    {catalogFilterLabels[bucket.value] ?? bucket.label ?? bucket.value}
                  </span>
                </span>
                <strong className={`shrink-0 text-xs ${styles.count}`}>
                  {catalogNumber.format(bucket.count)}
                </strong>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full ${styles.bar}`}
                  style={{ width: `${Math.max(6, (bucket.count / maximum) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ProviderFilterSummary({
  summary,
  selected,
}: {
  summary: CatalogFilterSummary;
  selected: boolean;
}) {
  return (
    <details
      className="group border-t border-slate-200 bg-slate-50/80 dark:bg-slate-950/20"
      open={selected || undefined}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet text-white shadow-sm">
          <BarChart3 className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-slate-900">Distribución del catálogo</span>
          <span className="block text-xs text-slate-500">
            Totales aplicables a los filtros de Explorar cartas
          </span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-4 pb-4 sm:px-5 sm:pb-5">
        <div className="grid gap-3">
          <FilterTotalGroup
            title="Colores"
            buckets={summary.colors}
            icon={Palette}
            tone="violet"
            showColor
          />
          <FilterTotalGroup
            title="Tipos de carta"
            buckets={summary.types}
            icon={Shapes}
            tone="blue"
          />
          <FilterTotalGroup
            title="Rarezas"
            buckets={summary.rarities}
            icon={Sparkles}
            tone="amber"
          />
          <FilterTotalGroup
            title="Versiones"
            buckets={summary.variants}
            icon={Layers3}
            tone="emerald"
          />
          <FilterTotalGroup
            title="Coste"
            buckets={summary.costs}
            icon={Gauge}
            tone="violet"
            compact
          />
          <FilterTotalGroup
            title="Poder"
            buckets={summary.powers}
            icon={BarChart3}
            tone="blue"
            compact
          />
        </div>
        {summary.sets.length > 0 && (
          <section className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:bg-slate-900/40">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-lg bg-indigo-50 text-violet dark:bg-violet/20 dark:text-indigo-300">
                  <Database className="size-4" />
                </span>
                <div>
                  <h4 className="text-sm font-black text-slate-900">Expansiones</h4>
                  <p className="text-[11px] text-slate-500">Cobertura del proveedor</p>
                </div>
              </div>
              <span className="rounded-full bg-violet px-2.5 py-1 text-xs font-black text-white">
                {summary.sets.length}
              </span>
            </div>
            <div className="max-h-56 overflow-y-auto p-2">
              {summary.sets.map((set) => (
                <div
                  key={set.value}
                  className="group/set flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-xs transition hover:bg-indigo-50"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <strong className="shrink-0 rounded-md bg-indigo-50 px-2 py-1 text-violet">
                      {set.value}
                    </strong>
                    {set.label && <span className="truncate text-slate-600">{set.label}</span>}
                  </span>
                  <strong className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-slate-800">
                    {catalogNumber.format(set.count)}
                  </strong>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </details>
  );
}

export function SettingsPage() {
  const services = useServices();
  const { settings, loading, saving, error, updateSettings } = useSettings();
  const queryClient = useQueryClient();
  const statuses = useQuery({
    queryKey: ['provider-statuses'],
    queryFn: ({ signal }) => services.catalog.getProviderStatuses(signal),
    staleTime: 5 * 60 * 1000,
  });

  const selectProvider = async (status: CatalogProviderStatus) => {
    if (!status.configured || !status.enabled) return;
    try {
      await updateSettings({ ...settings, catalogProvider: status.providerId });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['catalog'] }),
        queryClient.invalidateQueries({ queryKey: ['catalog-sets'] }),
        queryClient.invalidateQueries({ queryKey: ['card'] }),
      ]);
    } catch {
      // SettingsProvider shows the error and restores the previous selection.
    }
  };

  const selectTheme = async (theme: AppSettings['theme']) => {
    try {
      await updateSettings({ ...settings, theme });
    } catch {
      // SettingsProvider shows the error and restores the previous theme.
    }
  };

  const statusLabel = (status: CatalogProviderStatus) => {
    if (!status.enabled) return 'Desactivada';
    if (!status.configured) return 'Pendiente de configurar';
    return status.available ? 'Operativa' : 'No disponible';
  };

  return (
    <div className="mx-auto max-w-[1100px] p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Ajustes"
        subtitle="Catálogo, disponibilidad de proveedores y apariencia"
        action={
          <Button
            variant="secondary"
            onClick={() => void statuses.refetch()}
            disabled={statuses.isFetching}
          >
            <RefreshCw className={`size-4 ${statuses.isFetching ? 'animate-spin' : ''}`} />
            Comprobar APIs
          </Button>
        }
      />

      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-violet">
              <Database className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-950">API del catálogo</h2>
              <p className="mt-1 text-sm text-slate-600">
                El proveedor seleccionado se utiliza en búsquedas, filtros, expansiones y detalles.
              </p>
            </div>
          </div>

          {statuses.isLoading ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {[0, 1].map((item) => (
                <div key={item} className="h-44 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : statuses.isError ? (
            <div className="mt-5 flex gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-800">
              <AlertTriangle className="mt-0.5 size-5 shrink-0" />
              No se ha podido consultar Apps Script. El catálogo seleccionado no se ha modificado.
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {statuses.data?.map((status) => {
                const selected = settings.catalogProvider === status.providerId;
                return (
                  <article
                    key={status.providerId}
                    className={`overflow-hidden rounded-xl border transition ${
                      selected
                        ? 'border-violet bg-indigo-50 ring-2 ring-violet/15'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <button
                      type="button"
                      disabled={!status.configured || !status.enabled || loading || saving}
                      onClick={() => void selectProvider(status)}
                      className="block w-full p-5 text-left transition hover:bg-indigo-50/50 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span>
                          <span className="block font-black text-slate-950">{status.name}</span>
                          <span className="mt-1 flex items-center gap-1.5 text-xs font-semibold">
                            {status.available ? (
                              <CheckCircle2 className="size-4 text-emerald-600" />
                            ) : (
                              <WifiOff className="size-4 text-amber-600" />
                            )}
                            <span
                              className={status.available ? 'text-emerald-700' : 'text-amber-700'}
                            >
                              {statusLabel(status)}
                            </span>
                          </span>
                        </span>
                        <span
                          className={`mt-0.5 grid size-5 place-items-center rounded-full border ${
                            selected ? 'border-violet' : 'border-slate-300'
                          }`}
                          aria-hidden
                        >
                          {selected && <span className="size-2.5 rounded-full bg-violet" />}
                        </span>
                      </span>
                      <span className="mt-5 grid grid-cols-3 gap-3">
                        <span>
                          <span className="block text-xs text-slate-500">Cartas</span>
                          <span className="mt-0.5 block text-xl font-black text-slate-950">
                            {status.totalCards === null
                              ? '—'
                              : catalogNumber.format(status.totalCards)}
                          </span>
                        </span>
                        <span>
                          <span className="block text-xs text-slate-500">Expansiones</span>
                          <span className="mt-0.5 block text-xl font-black text-slate-950">
                            {status.filterSummary
                              ? catalogNumber.format(status.filterSummary.sets.length)
                              : '—'}
                          </span>
                        </span>
                        <span>
                          <span className="block text-xs text-slate-500">Respuesta</span>
                          <span className="mt-0.5 block text-xl font-black text-slate-950">
                            {status.configured ? `${status.latencyMs} ms` : '—'}
                          </span>
                        </span>
                      </span>
                      {!status.configured && status.providerId === 'ARJUNKAI_OPTCG' && (
                        <span className="mt-4 block rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                          Añade la URL y la clave X-API-Key en las propiedades de Apps Script.
                        </span>
                      )}
                    </button>
                    {status.filterSummary && (
                      <ProviderFilterSummary summary={status.filterSummary} selected={selected} />
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-violet">
              {settings.theme === 'DARK' ? <Moon className="size-5" /> : <Sun className="size-5" />}
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-950">Apariencia</h2>
              <p className="mt-1 text-sm text-slate-600">
                El tema se aplica a todas las pantallas y se conserva para la próxima sesión.
              </p>
            </div>
          </div>
          <div className="mt-5 grid max-w-md grid-cols-2 gap-3" role="group" aria-label="Tema">
            {(
              [
                ['LIGHT', 'Claro', Sun],
                ['DARK', 'Oscuro', Moon],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                disabled={loading || saving}
                onClick={() => void selectTheme(value)}
                className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border font-bold transition ${
                  settings.theme === value
                    ? 'border-violet bg-violet text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'
                }`}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
        </section>

        {error && (
          <div className="flex gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-800">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            {error}
          </div>
        )}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600">
          La clave de Arjunkai nunca se envía al navegador: Apps Script realiza las peticiones y
          mantiene la credencial en sus propiedades privadas.
        </div>
      </div>
    </div>
  );
}
