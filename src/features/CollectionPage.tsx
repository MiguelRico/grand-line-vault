import {
  Archive,
  Grid2X2,
  Heart,
  List,
  Plus,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useServices } from '../app/providers/ServicesProvider';
import type {
  Card,
  CardCondition,
  CardLanguage,
  CollectionItem,
  StorageBox,
} from '../domain/models';
import { calculateCollectionStats, sectionLabel } from '../domain/services';
import { PageHeader } from '../shared/AppShell';
import {
  Button,
  CardImage,
  CardTile,
  EmptyState,
  FavoriteButton,
  QuantitySelector,
  ResponsiveDialog,
  SearchInput,
} from '../shared/ui';

function snapshotToCard(item: CollectionItem): Card {
  const source = {
    providerId: item.cardSnapshot.catalogProvider ?? ('MOCK' as const),
    fetchedAt: item.cardSnapshot.catalogFetchedAt ?? item.updatedAt,
  };
  return {
    id: item.cardId,
    code: item.cardSnapshot.code,
    name: item.cardSnapshot.name,
    type: 'CHARACTER',
    colors: [],
    rarity: item.cardSnapshot.rarity,
    set: { code: item.cardSnapshot.setCode, name: item.cardSnapshot.setCode },
    attributes: [],
    traits: [],
    language: item.language,
    imageUrl: item.cardSnapshot.imageUrl,
    variants: [],
    prices: item.cardSnapshot.catalogPrice ? [item.cardSnapshot.catalogPrice] : [],
    sources: [source],
  };
}

function Stat({
  value,
  label,
  accent,
}: {
  value: string | number;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0 border-r border-slate-200 px-3 last:border-0 sm:px-5">
      <p className={`truncate text-xl font-black sm:text-2xl ${accent ? 'text-violet' : 'text-slate-950'}`}>
        {value}
      </p>
      <p className="mt-1 truncate text-[10px] text-slate-500 sm:text-xs">{label}</p>
    </div>
  );
}

function CollectionEditor({
  item,
  onClose,
}: {
  item: CollectionItem | null;
  onClose: () => void;
}) {
  const services = useServices();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(item);
  if (item && draft?.id !== item.id) setDraft(item);
  const boxes = useQuery({
    queryKey: ['boxes'],
    queryFn: () => services.privateData.listBoxes(),
  });
  const save = useMutation({
    mutationFn: (value: CollectionItem) => services.privateData.saveCollection(value),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['collection'] });
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => services.privateData.removeCollection(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['collection'] });
      onClose();
    },
  });
  return (
    <ResponsiveDialog open={Boolean(item)} onOpenChange={(open) => !open && onClose()} title="Gestionar carta">
      {draft && (
        <div className="grid gap-6 md:grid-cols-[180px_1fr]">
          <CardImage src={draft.cardSnapshot.imageUrl} alt={`Carta ${draft.cardSnapshot.name}`} />
          <div>
            <p className="text-xs font-semibold text-slate-500">{draft.cardSnapshot.code}</p>
            <h2 className="mt-1 pr-10 text-2xl font-black">{draft.cardSnapshot.name}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {draft.cardSnapshot.variantLabel} · {draft.language} · {draft.condition.replace('_', ' ')}
            </p>
            <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-y border-slate-200 py-5">
              <div>
                <p className="mb-2 text-sm font-semibold">Cantidad total</p>
                <QuantitySelector
                  value={draft.quantity}
                  min={1}
                  onChange={(quantity) => setDraft({ ...draft, quantity })}
                />
              </div>
              <FavoriteButton
                active={draft.favorite}
                onClick={() => setDraft({ ...draft, favorite: !draft.favorite })}
              />
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold">
                Caja
                <select
                  value={draft.boxId ?? ''}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      boxId: event.target.value || undefined,
                      sectionId: undefined,
                    })
                  }
                  className="mt-2 h-11 w-full rounded-lg border-slate-300"
                >
                  <option value="">Sin ubicar</option>
                  {(boxes.data ?? []).map((box) => (
                    <option key={box.id} value={box.id}>
                      {box.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold">
                Sección
                <select
                  value={draft.sectionId ?? ''}
                  disabled={!draft.boxId}
                  onChange={(event) =>
                    setDraft({ ...draft, sectionId: event.target.value || undefined })
                  }
                  className="mt-2 h-11 w-full rounded-lg border-slate-300 disabled:bg-slate-100"
                >
                  <option value="">Selecciona una sección</option>
                  {(boxes.data ?? [])
                    .find((box) => box.id === draft.boxId)
                    ?.sections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.code} · {section.name}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <label className="mt-5 block text-sm font-semibold">
              Notas privadas
              <textarea
                value={draft.notes ?? ''}
                onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
                maxLength={500}
                rows={3}
                className="mt-2 w-full rounded-lg border-slate-300 text-sm focus:border-violet focus:ring-violet"
              />
            </label>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button
                className="flex-1"
                onClick={() => save.mutate({ ...draft, updatedAt: new Date().toISOString() })}
              >
                Guardar cambios
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (window.confirm('¿Eliminar esta carta de la colección?')) remove.mutate(draft.id);
                }}
              >
                <Trash2 className="size-4" /> Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}
    </ResponsiveDialog>
  );
}

interface CollectionFilters {
  boxId: string;
  sectionId: string;
  language: CardLanguage | '';
  condition: CardCondition | '';
  favoritesOnly: boolean;
  unassignedOnly: boolean;
  duplicatesOnly: boolean;
}

const emptyFilters: CollectionFilters = {
  boxId: '',
  sectionId: '',
  language: '',
  condition: '',
  favoritesOnly: false,
  unassignedOnly: false,
  duplicatesOnly: false,
};

function CollectionFilterDrawer({
  open,
  filters,
  boxes,
  resultCount,
  onChange,
  onClose,
  onClear,
}: {
  open: boolean;
  filters: CollectionFilters;
  boxes: StorageBox[];
  resultCount: number;
  onChange: (filters: CollectionFilters) => void;
  onClose: () => void;
  onClear: () => void;
}) {
  if (!open) return null;
  const selectedBox = boxes.find((box) => box.id === filters.boxId);
  return (
    <div className="fixed inset-0 z-50">
      <button
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Cerrar filtros"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="collection-filters-title"
        className="absolute inset-y-0 right-0 w-[min(90vw,380px)] overflow-y-auto bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-violet">Mi colección</p>
            <h2 id="collection-filters-title" className="mt-1 text-xl font-black">
              Filtros
            </h2>
          </div>
          <button
            onClick={onClose}
            className="grid size-11 place-items-center rounded-lg hover:bg-slate-100"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="mt-7 space-y-5">
          <label className="block text-sm font-semibold">
            Caja
            <select
              value={filters.boxId}
              onChange={(event) =>
                onChange({
                  ...filters,
                  boxId: event.target.value,
                  sectionId: '',
                  unassignedOnly: false,
                })
              }
              className="mt-2 h-11 w-full rounded-lg border-slate-300"
            >
              <option value="">Todas las cajas</option>
              {boxes.map((box) => (
                <option key={box.id} value={box.id}>
                  {box.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Sección
            <select
              value={filters.sectionId}
              disabled={!selectedBox}
              onChange={(event) => onChange({ ...filters, sectionId: event.target.value })}
              className="mt-2 h-11 w-full rounded-lg border-slate-300 disabled:bg-slate-100"
            >
              <option value="">Todas las secciones</option>
              {selectedBox?.sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.code} · {section.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-semibold">
              Idioma
              <select
                value={filters.language}
                onChange={(event) =>
                  onChange({ ...filters, language: event.target.value as CardLanguage | '' })
                }
                className="mt-2 h-11 w-full rounded-lg border-slate-300"
              >
                <option value="">Todos</option>
                {['EN', 'JP', 'ES', 'FR', 'IT', 'DE', 'UNKNOWN'].map((language) => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Estado
              <select
                value={filters.condition}
                onChange={(event) =>
                  onChange({ ...filters, condition: event.target.value as CardCondition | '' })
                }
                className="mt-2 h-11 w-full rounded-lg border-slate-300"
              >
                <option value="">Todos</option>
                <option value="MINT">Mint</option>
                <option value="NEAR_MINT">Near Mint</option>
                <option value="EXCELLENT">Excelente</option>
                <option value="GOOD">Bueno</option>
                <option value="PLAYED">Jugado</option>
                <option value="POOR">Deteriorado</option>
                <option value="UNKNOWN">Sin indicar</option>
              </select>
            </label>
          </div>
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-semibold">Mostrar solo</legend>
            {([
              ['favoritesOnly', 'Cartas favoritas'],
              ['unassignedOnly', 'Lotes sin ubicar'],
              ['duplicatesOnly', 'Lotes con varias copias'],
            ] as const).map(([key, label]) => (
              <label
                key={key}
                className="flex min-h-11 items-center justify-between rounded-lg border border-slate-200 px-3 text-sm"
              >
                {label}
                <input
                  type="checkbox"
                  checked={filters[key]}
                  onChange={(event) => {
                    const next = { ...filters, [key]: event.target.checked };
                    if (key === 'unassignedOnly' && event.target.checked) {
                      next.boxId = '';
                      next.sectionId = '';
                    }
                    onChange(next);
                  }}
                  className="rounded border-slate-300 text-violet focus:ring-violet"
                />
              </label>
            ))}
          </fieldset>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={onClear}>
            Limpiar
          </Button>
          <Button onClick={onClose}>Ver {resultCount} lotes</Button>
        </div>
      </aside>
    </div>
  );
}

export function CollectionPage() {
  const services = useServices();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'overview' | 'sets' | 'duplicates' | 'list'>('overview');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<CollectionFilters>(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [selected, setSelected] = useState<CollectionItem | null>(null);
  const result = useQuery({
    queryKey: ['collection'],
    queryFn: () => services.privateData.listCollection(),
  });
  const boxes = useQuery({
    queryKey: ['boxes'],
    queryFn: () => services.privateData.listBoxes(),
  });
  const items = useMemo(() => result.data ?? [], [result.data]);
  const stats = calculateCollectionStats(items);
  const filtered = useMemo(() => {
    const normalized = query.toLocaleLowerCase();
    return items.filter(
      (item) =>
        (!normalized ||
          item.cardSnapshot.name.toLocaleLowerCase().includes(normalized) ||
          item.cardSnapshot.code.toLocaleLowerCase().includes(normalized)) &&
        (tab !== 'duplicates' || item.quantity > 1) &&
        (!filters.duplicatesOnly || item.quantity > 1) &&
        (!filters.boxId || item.boxId === filters.boxId) &&
        (!filters.sectionId || item.sectionId === filters.sectionId) &&
        (!filters.language || item.language === filters.language) &&
        (!filters.condition || item.condition === filters.condition) &&
        (!filters.favoritesOnly || item.favorite) &&
        (!filters.unassignedOnly || !item.boxId || !item.sectionId),
    );
  }, [filters, items, query, tab]);
  const activeFilterCount = [
    filters.boxId,
    filters.sectionId,
    filters.language,
    filters.condition,
    filters.favoritesOnly,
    filters.unassignedOnly,
    filters.duplicatesOnly,
  ].filter(Boolean).length;
  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: keyof CollectionFilters; label: string }> = [];
    const selectedBox = boxes.data?.find((box) => box.id === filters.boxId);
    const selectedSection = selectedBox?.sections.find(
      (section) => section.id === filters.sectionId,
    );
    if (filters.boxId) chips.push({ key: 'boxId', label: selectedBox?.name ?? 'Caja' });
    if (filters.sectionId)
      chips.push({
        key: 'sectionId',
        label: selectedSection ? `${selectedSection.code} · ${selectedSection.name}` : 'Sección',
      });
    if (filters.language) chips.push({ key: 'language', label: filters.language });
    if (filters.condition)
      chips.push({ key: 'condition', label: filters.condition.replace('_', ' ') });
    if (filters.favoritesOnly) chips.push({ key: 'favoritesOnly', label: 'Favoritas' });
    if (filters.unassignedOnly) chips.push({ key: 'unassignedOnly', label: 'Sin ubicar' });
    if (filters.duplicatesOnly) chips.push({ key: 'duplicatesOnly', label: 'Varias copias' });
    return chips;
  }, [boxes.data, filters]);
  const effectiveView = tab === 'list' ? 'list' : view;

  const chooseView = (nextView: 'grid' | 'list') => {
    setView(nextView);
    if (nextView === 'grid' && tab === 'list') setTab('overview');
    if (nextView === 'list' && tab === 'overview') setTab('list');
    setViewMenuOpen(false);
  };

  return (
    <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Mi colección"
        subtitle="Tu archivo personal, siempre bajo control"
        action={
          <Link to="/catalog" className="hidden sm:block">
            <Button>
              <Plus className="size-4" />
              Añadir cartas
            </Button>
          </Link>
        }
      />
      <div className="mb-5 flex overflow-x-auto border-b border-slate-200">
        {[
          ['overview', 'Vista general'],
          ['sets', 'Por expansiones'],
          ['duplicates', 'Duplicadas'],
          ['list', 'Lista'],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => {
              const nextTab = value as typeof tab;
              setTab(nextTab);
              if (nextTab === 'list') setView('list');
              if (nextTab === 'overview') setView('grid');
            }}
            className={`min-h-11 shrink-0 border-b-2 px-4 text-sm font-semibold ${
              tab === value ? 'border-violet text-violet' : 'border-transparent text-slate-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <section className="mb-5 grid grid-cols-4 overflow-hidden rounded-xl border border-slate-200 bg-white py-4 shadow-sm lg:grid-cols-6">
        <Stat value={stats.totalCopies} label="Total" />
        <Stat value={stats.uniqueCards} label="Diferentes" accent />
        <Stat value={stats.setsRepresented} label="Expansiones" />
        <Stat value={stats.duplicateCopies} label="Duplicadas" />
        <div className="hidden lg:block">
          <Stat value={stats.storedCopies} label="Ubicadas" />
        </div>
        <div className="hidden lg:block">
          <Stat
            value={`${stats.estimatedValue.amount.toFixed(2)} ${stats.estimatedValue.currency}`}
            label="Valor estimado"
            accent
          />
        </div>
      </section>
      {tab === 'sets' ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-black">Romance Dawn [OP-01]</h2>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span>{stats.uniqueCards} propias de 121 conocidas</span>
            <span className="font-bold">{Math.round((stats.uniqueCards / 121) * 100)}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-violet"
              style={{ width: `${(stats.uniqueCards / 121) * 100}%` }}
            />
          </div>
          <p className="mt-4 text-sm text-slate-600">
            La completitud cuenta cartas base; las variantes se muestran por separado.
          </p>
        </section>
      ) : (
        <>
          <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <SearchInput value={query} onChange={setQuery} placeholder="Buscar en mi colección..." />
            <Button
              variant="secondary"
              onClick={() => setFiltersOpen(true)}
              aria-haspopup="dialog"
            >
              <SlidersHorizontal className="size-4" />
              Filtros
              {activeFilterCount > 0 && (
                <span className="grid size-5 place-items-center rounded-full bg-violet text-[11px] text-white">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            <div className="relative">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setViewMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={viewMenuOpen}
              >
                {effectiveView === 'list' ? (
                  <List className="size-4" />
                ) : (
                  <Grid2X2 className="size-4" />
                )}
                Vista
              </Button>
              {viewMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-20 mt-2 w-full min-w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-soft"
                >
                  <button
                    role="menuitemradio"
                    aria-checked={effectiveView === 'grid'}
                    onClick={() => chooseView('grid')}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold ${
                      effectiveView === 'grid' ? 'bg-indigo-50 text-violet' : 'hover:bg-slate-50'
                    }`}
                  >
                    <Grid2X2 className="size-4" /> Cuadrícula
                  </button>
                  <button
                    role="menuitemradio"
                    aria-checked={effectiveView === 'list'}
                    onClick={() => chooseView('list')}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold ${
                      effectiveView === 'list' ? 'bg-indigo-50 text-violet' : 'hover:bg-slate-50'
                    }`}
                  >
                    <List className="size-4" /> Lista
                  </button>
                </div>
              )}
            </div>
          </div>
          {activeFilterChips.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2" aria-label="Filtros activos">
              {activeFilterChips.map((chip) => (
                <button
                  key={chip.key}
                  onClick={() =>
                    setFilters({
                      ...filters,
                      [chip.key]:
                        typeof filters[chip.key] === 'boolean' ? false : '',
                      ...(chip.key === 'boxId' ? { sectionId: '' } : {}),
                    })
                  }
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-indigo-50 px-3 text-xs font-semibold text-violet hover:bg-indigo-100"
                  aria-label={`Quitar filtro ${chip.label}`}
                >
                  {chip.label} <X className="size-3.5" />
                </button>
              ))}
              <button
                onClick={() => setFilters(emptyFilters)}
                className="min-h-9 px-2 text-xs font-semibold text-slate-600 hover:text-violet"
              >
                Limpiar todo
              </button>
            </div>
          )}
          {filtered.length === 0 ? (
            <EmptyState
              title="No hay cartas aquí"
              description="Añade cartas desde el catálogo o ajusta la búsqueda."
              action={
                <Link to="/catalog">
                  <Button>Explorar catálogo</Button>
                </Link>
              }
            />
          ) : effectiveView === 'list' ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelected(item)}
                  className="grid w-full grid-cols-[52px_1fr_auto] items-center gap-3 border-b border-slate-100 p-3 text-left last:border-0 hover:bg-slate-50"
                >
                  <CardImage
                    src={item.cardSnapshot.imageUrl}
                    alt={item.cardSnapshot.name}
                    className="w-11"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{item.cardSnapshot.name}</span>
                    <span className="block text-xs text-slate-500">{item.cardSnapshot.code}</span>
                    <span className="mt-1 flex items-center gap-1 text-xs text-violet">
                      <Archive className="size-3" />
                      {sectionLabel(boxes.data ?? [], item.boxId, item.sectionId)}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    {item.favorite && <Heart className="size-4 fill-red-500 text-red-500" />}
                    <strong>×{item.quantity}</strong>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
              {filtered.map((item) => (
                <CardTile
                  key={item.id}
                  card={snapshotToCard(item)}
                  quantity={item.quantity}
                  onOpen={() => setSelected(item)}
                />
              ))}
            </div>
          )}
        </>
      )}
      <CollectionFilterDrawer
        open={filtersOpen}
        filters={filters}
        boxes={boxes.data ?? []}
        resultCount={filtered.length}
        onChange={setFilters}
        onClose={() => setFiltersOpen(false)}
        onClear={() => setFilters(emptyFilters)}
      />
      <CollectionEditor item={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
