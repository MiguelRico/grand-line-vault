import {
  ArrowLeftRight,
  Grid2X2,
  Heart,
  List,
  Plus,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useServices } from '../app/providers/ServicesProvider';
import type { Card, CollectionItem } from '../domain/models';
import { calculateCollectionStats } from '../domain/services';
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
                  onChange={(quantity) =>
                    setDraft({
                      ...draft,
                      quantity,
                      tradeableQuantity: Math.min(quantity, draft.tradeableQuantity),
                    })
                  }
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold">Para intercambio</p>
                <QuantitySelector
                  value={draft.tradeableQuantity}
                  max={draft.quantity}
                  onChange={(tradeableQuantity) => setDraft({ ...draft, tradeableQuantity })}
                />
              </div>
              <FavoriteButton
                active={draft.favorite}
                onClick={() => setDraft({ ...draft, favorite: !draft.favorite })}
              />
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

export function CollectionPage() {
  const services = useServices();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'overview' | 'sets' | 'duplicates' | 'list'>('overview');
  const [selected, setSelected] = useState<CollectionItem | null>(null);
  const result = useQuery({
    queryKey: ['collection'],
    queryFn: () => services.privateData.listCollection(),
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
        (tab !== 'duplicates' || item.quantity > 1),
    );
  }, [items, query, tab]);

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
            onClick={() => setTab(value as typeof tab)}
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
          <Stat value={stats.favoriteCards} label="Favoritas" />
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
          <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <SearchInput value={query} onChange={setQuery} placeholder="Buscar en mi colección..." />
            <Button variant="secondary">
              <SlidersHorizontal className="size-4" /> Filtros
            </Button>
            <Button variant="secondary">
              {tab === 'list' ? <Grid2X2 className="size-4" /> : <List className="size-4" />}
              Vista
            </Button>
          </div>
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
          ) : tab === 'list' ? (
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
                  </span>
                  <span className="flex items-center gap-3">
                    {item.favorite && <Heart className="size-4 fill-red-500 text-red-500" />}
                    {item.tradeableQuantity > 0 && <ArrowLeftRight className="size-4 text-violet" />}
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
      <CollectionEditor item={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
