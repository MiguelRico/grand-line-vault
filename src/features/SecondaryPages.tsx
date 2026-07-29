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
import { useEffect, useState } from 'react';
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

function collectionItemImage(item: CollectionItem | undefined): string {
  return item?.variant?.image || item?.card.image || '';
}

function CollectionThumbnails({
  entries,
}: {
  entries: { id: string; item: CollectionItem | undefined }[];
}) {
  if (entries.length === 0) return null;
  const visible = entries.slice(0, 6);
  const remaining = entries.length - visible.length;
  return (
    <div className="mt-4 min-w-0 max-w-full">
      <div
        className="flex max-w-full gap-3 overflow-x-auto pb-2"
        aria-label={`${entries.length} cartas diferentes`}
      >
        {visible.map(({ id, item }) => (
          <div key={id} className="w-20 shrink-0">
            <CardImage
              src={collectionItemImage(item)}
              alt={item?.card.name ?? 'Carta no disponible'}
              className="w-full border-2 border-white shadow-sm"
              showFailureText={false}
            />
            <p className="mt-1 truncate text-xs font-bold text-slate-900">
              {item?.card.name ?? 'No disponible'}
            </p>
            <p className="truncate text-[10px] text-slate-500">
              {item?.card.episode.name || item?.card.episode.code || 'Sin expansión'}
            </p>
            <p className="truncate text-[10px] font-semibold text-violet">
              {item?.variant?.label ?? 'Arte base'}
            </p>
          </div>
        ))}
        {remaining > 0 && (
          <span className="grid min-h-28 w-12 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
            +{remaining}
          </span>
        )}
      </div>
    </div>
  );
}

function BoxEditor({ box, onClose }: { box: StorageBox | null; onClose: () => void }) {
  const services = useServices();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(box);
  const [draftItems, setDraftItems] = useState<CollectionItem[]>([]);
  const [query, setQuery] = useState('');
  const [targetSectionId, setTargetSectionId] = useState('');
  const collection = useQuery({
    queryKey: ['collection'],
    queryFn: () => services.collection.listCollection(),
    enabled: Boolean(box),
  });
  const packs = useQuery({
    queryKey: ['sales-packs'],
    queryFn: () => services.organization.listSalesPacks(),
    enabled: Boolean(box),
  });

  useEffect(() => {
    setDraft(box);
    setQuery('');
    setTargetSectionId(box?.sections[0]?.id ?? '');
    if (box && collection.data) {
      setDraftItems(collection.data.filter((item) => item.boxId === box.id));
    } else {
      setDraftItems([]);
    }
  }, [box, collection.data]);

  const save = useMutation({
    mutationFn: async ({ value, items }: { value: StorageBox; items: CollectionItem[] }) => {
      const savedBox = await services.organization.saveBox(value);
      const now = new Date().toISOString();
      const itemIds = new Set(items.map((item) => item.id));
      const removedItems = (collection.data ?? []).filter(
        (item) => item.boxId === value.id && !itemIds.has(item.id),
      );
      await Promise.all([
        ...items.map((item) =>
          services.collection.saveCollection({
            ...item,
            boxId: value.id,
            sectionId: item.sectionId ?? value.sections[0]?.id,
            updatedAt: now,
          }),
        ),
        ...removedItems.map((item) =>
          services.collection.saveCollection({
            ...item,
            boxId: undefined,
            sectionId: undefined,
            updatedAt: now,
          }),
        ),
      ]);
      return savedBox;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['boxes'] }),
        queryClient.invalidateQueries({ queryKey: ['collection'] }),
      ]);
      onClose();
    },
  });
  const reserved = reservedQuantities(packs.data ?? []);
  const draftIds = new Set(draftItems.map((item) => item.id));
  const available = (collection.data ?? []).filter((item) => {
    const normalized = query.toLocaleLowerCase();
    return (
      !draftIds.has(item.id) &&
      (!normalized ||
        item.card.name.toLocaleLowerCase().includes(normalized) ||
        item.card.card_number.toLocaleLowerCase().includes(normalized))
    );
  });

  return (
    <ResponsiveDialog
      open={Boolean(box)}
      onOpenChange={(open) => !open && onClose()}
      title="Editar contenedor"
    >
      {draft && (
        <div className="min-w-0">
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
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
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
              <div
                key={section.id}
                className="grid grid-cols-[minmax(0,1fr)_44px] gap-2 sm:grid-cols-[64px_minmax(0,1fr)_44px]"
              >
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
                  className="col-start-1 row-start-1 h-11 min-w-0 rounded-lg border-slate-300 text-center font-bold"
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
                  className="col-span-2 row-start-2 h-11 min-w-0 rounded-lg border-slate-300 sm:col-span-1 sm:col-start-2 sm:row-start-1"
                />
                <button
                  onClick={() => {
                    const sections = draft.sections.filter((entry) => entry.id !== section.id);
                    const fallbackSectionId = sections[0]?.id;
                    setDraft({ ...draft, sections });
                    setDraftItems((items) =>
                      items.map((item) =>
                        item.sectionId === section.id
                          ? { ...item, sectionId: fallbackSectionId }
                          : item,
                      ),
                    );
                    if (targetSectionId === section.id) {
                      setTargetSectionId(fallbackSectionId ?? '');
                    }
                  }}
                  className="col-start-2 row-start-1 grid size-11 place-items-center rounded-lg text-red-600 hover:bg-red-50 sm:col-start-3"
                  aria-label={`Eliminar sección ${section.name}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-5 border-t border-slate-200 pt-6 md:grid-cols-2">
            <section className="min-w-0">
              <h3 className="mb-3 font-black">Cartas del contenedor ({draftItems.length})</h3>
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {draftItems.map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-200 p-2">
                    <div className="flex items-center gap-2">
                      <CardImage
                        src={collectionItemImage(item)}
                        alt={item.card.name}
                        className="w-[42px] shrink-0"
                        showFailureText={false}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{item.card.name}</p>
                        <p className="truncate text-[11px] text-slate-500">
                          {item.card.episode.name} · {item.variant?.label ?? 'Arte base'}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setDraftItems((items) => items.filter((entry) => entry.id !== item.id))
                        }
                        className="grid size-10 shrink-0 place-items-center text-red-600"
                        aria-label={`Quitar ${item.card.name} del contenedor`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <div className="mt-2 grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                      <label className="min-w-0 text-xs font-semibold">
                        Sección
                        <select
                          value={item.sectionId ?? ''}
                          onChange={(event) =>
                            setDraftItems((items) =>
                              items.map((entry) =>
                                entry.id === item.id
                                  ? { ...entry, sectionId: event.target.value }
                                  : entry,
                              ),
                            )
                          }
                          className="mt-1 h-10 w-full rounded-lg border-slate-300 text-sm"
                        >
                          {draft.sections.map((section) => (
                            <option key={section.id} value={section.id}>
                              {section.code} · {section.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="max-w-full overflow-x-auto">
                        <QuantitySelector
                          value={item.quantity}
                          min={Math.max(1, reserved.get(item.id) ?? 0)}
                          max={999}
                          onChange={(quantity) =>
                            setDraftItems((items) =>
                              items.map((entry) =>
                                entry.id === item.id ? { ...entry, quantity } : entry,
                              ),
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {draftItems.length === 0 && (
                  <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                    El contenedor está vacío. Puedes guardarlo y rellenarlo más tarde.
                  </p>
                )}
              </div>
            </section>
            <section className="min-w-0">
              <h3 className="mb-3 font-black">Inventario disponible</h3>
              <label className="mb-3 block text-sm font-semibold">
                Sección de destino
                <select
                  value={targetSectionId}
                  onChange={(event) => setTargetSectionId(event.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border-slate-300"
                >
                  {draft.sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.code} · {section.name}
                    </option>
                  ))}
                </select>
              </label>
              <SearchInput value={query} onChange={setQuery} placeholder="Buscar carta..." />
              <div className="mt-2 max-h-60 space-y-1 overflow-y-auto">
                {available.slice(0, 30).map((item) => (
                  <button
                    key={item.id}
                    onClick={() =>
                      setDraftItems((items) => [
                        ...items,
                        { ...item, boxId: draft.id, sectionId: targetSectionId },
                      ])
                    }
                    disabled={!targetSectionId}
                    className="flex w-full min-w-0 items-center justify-between gap-2 rounded-lg p-2 text-left text-sm hover:bg-slate-50 disabled:opacity-40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{item.card.name}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {item.card.episode.name} · {item.variant?.label ?? 'Arte base'}
                      </span>
                    </span>
                    <Plus className="ml-2 size-4 shrink-0 text-violet" />
                  </button>
                ))}
              </div>
            </section>
          </div>
          <Button
            className="mt-7 w-full"
            disabled={!draft.name.trim() || draft.sections.length === 0 || save.isPending}
            onClick={() =>
              save.mutate({
                value: { ...draft, updatedAt: new Date().toISOString() },
                items: draftItems,
              })
            }
          >
            {save.isPending ? 'Guardando…' : 'Guardar contenedor y secciones'}
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
                className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:justify-between sm:gap-4">
                  <div className="flex min-w-0 max-w-full items-center gap-3">
                    <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-indigo-50 text-violet">
                      <Archive className="size-6" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-black">{box.name}</h2>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                        {box.description || 'Sin descripción'}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 self-start rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
                    {copies} copias
                  </span>
                </div>
                <p className="mt-4 flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="size-3" /> {box.location || 'Ubicación sin indicar'}
                </p>
                <CollectionThumbnails entries={boxItems.map((item) => ({ id: item.id, item }))} />
                <div className="mt-5 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                  {box.sections.map((section) => {
                    const sectionCopies = boxItems
                      .filter((item) => item.sectionId === section.id)
                      .reduce((sum, item) => sum + item.quantity, 0);
                    return (
                      <div
                        key={section.id}
                        className="min-w-0 rounded-xl border border-slate-200 p-3"
                      >
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
                      src={collectionItemImage(collectionItem)}
                      alt={collectionItem?.card.name ?? 'Carta'}
                      showFailureText={false}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">
                        {collectionItem?.card.name ?? 'Carta no disponible'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {collectionItem?.card.episode.name ?? 'Sin expansión'} ·{' '}
                        {collectionItem?.variant?.label ?? 'Arte base'}
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
                  El pack está vacío. Puedes guardarlo y rellenarlo más tarde.
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
          disabled={!draft.name.trim() || warnings.length > 0 || save.isPending}
          onClick={() => save.mutate({ ...draft, updatedAt: new Date().toISOString() })}
        >
          {save.isPending ? 'Guardando…' : 'Guardar pack de venta'}
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
        title="Ventas"
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
                className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:justify-between sm:gap-4">
                  <div className="flex min-w-0 max-w-full items-center gap-3">
                    <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-indigo-50 text-violet">
                      <ShoppingBag className="size-6" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-black">{pack.name}</h2>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                        {pack.description || 'Sin descripción'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 self-start rounded-full px-3 py-1 text-xs font-bold ${
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
                <CollectionThumbnails
                  entries={pack.items.map((item) => ({
                    id: item.id,
                    item: collection.data?.find((entry) => entry.id === item.collectionItemId),
                  }))}
                />
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
