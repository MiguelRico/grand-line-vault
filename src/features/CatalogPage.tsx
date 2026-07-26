import { Filter, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import type { Card, CardColor, CardType, CardVariantType, CatalogCriteria } from '../domain/models';
import { useServices } from '../app/providers/ServicesProvider';
import { CardDetails } from './CardDetails';
import { PageHeader } from '../shared/AppShell';
import { Button, CardTile, EmptyState, ErrorState, Pagination, SearchInput } from '../shared/ui';
import { useDebouncedValue } from '../shared/hooks';
import { OnePieceLoader } from '../shared/OnePieceLoader';

const defaultCriteria: CatalogCriteria = {
  query: '',
  setCode: '',
  color: '',
  type: '',
  rarity: '',
  variant: '',
  sort: 'code',
  direction: 'asc',
  page: 1,
  pageSize: 12,
};

const rarityOptions = [
  ['L', 'Leader'],
  ['C', 'Common'],
  ['UC', 'Uncommon'],
  ['R', 'Rare'],
  ['SR', 'Super Rare'],
  ['SEC', 'Secret Rare'],
  ['PR', 'Promo'],
  ['TR', 'Treasure Rare'],
] as const;

function optionalNumberParam(value: string | null): number | undefined {
  if (value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function FilterFields({
  criteria,
  setCriteria,
  sets,
  setsLoading,
  remote,
}: {
  criteria: CatalogCriteria;
  setCriteria: (criteria: CatalogCriteria) => void;
  sets: Card['episode'][];
  setsLoading: boolean;
  remote: boolean;
}) {
  const update = (patch: Partial<CatalogCriteria>) => {
    if (remote && !Object.prototype.hasOwnProperty.call(patch, 'setCode')) return;
    setCriteria({ ...criteria, ...patch, page: 1 });
  };
  return (
    <div className="space-y-5">
      {remote && (
        <p className="rounded-lg bg-indigo-50 p-3 text-xs leading-5 text-indigo-800">
          One Piece API permite buscar y filtrar por expansión. Los filtros de juego no están
          disponibles en esta fuente.
        </p>
      )}
      <label className="block text-sm font-semibold">
        Expansión
        <select
          value={criteria.setCode}
          onChange={(event) => update({ setCode: event.target.value })}
          className="mt-2 h-11 w-full rounded-lg border-slate-300 text-sm focus:border-violet focus:ring-violet"
        >
          <option value="">Todas las expansiones</option>
          {sets.map((set) => (
            <option key={set.id} value={set.id}>
              {set.name} [{set.code}]
            </option>
          ))}
        </select>
        {setsLoading && (
          <span className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <OnePieceLoader size="xs" label="Cargando expansiones" />
            Cargando expansiones…
          </span>
        )}
      </label>
      <fieldset>
        <legend className="text-sm font-semibold">Color</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {[
            ['RED', 'Rojo', 'bg-red-500'],
            ['GREEN', 'Verde', 'bg-emerald-500'],
            ['BLUE', 'Azul', 'bg-blue-500'],
            ['PURPLE', 'Púrpura', 'bg-purple-500'],
            ['BLACK', 'Negro', 'bg-slate-900'],
            ['YELLOW', 'Amarillo', 'bg-amber-400'],
          ].map(([value, label, color]) => (
            <label key={value} className="flex min-h-9 items-center gap-2 text-sm">
              <input
                type="radio"
                name="color"
                disabled={remote}
                checked={criteria.color === value}
                onChange={() => update({ color: value as CardColor })}
                className="sr-only"
              />
              <span className={`size-3 rounded-full ${color}`} />
              <span className={criteria.color === value ? 'font-bold text-violet' : ''}>
                {label}
              </span>
            </label>
          ))}
        </div>
        {criteria.color && (
          <button
            disabled={remote}
            onClick={() => update({ color: '' })}
            className="mt-2 text-xs font-semibold text-violet"
          >
            Cualquier color
          </button>
        )}
      </fieldset>
      <label className="block text-sm font-semibold">
        Tipo de carta
        <select
          disabled={remote}
          value={criteria.type}
          onChange={(event) => update({ type: event.target.value as CardType | '' })}
          className="mt-2 h-11 w-full rounded-lg border-slate-300 text-sm"
        >
          <option value="">Todos los tipos</option>
          <option value="LEADER">Líder</option>
          <option value="CHARACTER">Personaje</option>
          <option value="EVENT">Evento</option>
          <option value="STAGE">Escenario</option>
        </select>
      </label>
      <label className="block text-sm font-semibold">
        Rareza
        <select
          disabled={remote}
          value={criteria.rarity}
          onChange={(event) => update({ rarity: event.target.value })}
          className="mt-2 h-11 w-full rounded-lg border-slate-300 text-sm"
        >
          <option value="">Todas las rarezas</option>
          {rarityOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label} [{value}]
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-semibold">
        Versión
        <select
          disabled={remote}
          value={criteria.variant}
          onChange={(event) => update({ variant: event.target.value as CardVariantType | '' })}
          className="mt-2 h-11 w-full rounded-lg border-slate-300 text-sm"
        >
          <option value="">Todas las versiones</option>
          <option value="BASE">Base</option>
          <option value="PARALLEL">Paralela / arte alternativo</option>
        </select>
      </label>
      <div>
        <p className="text-sm font-semibold">Coste</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input
            type="number"
            disabled={remote}
            min="0"
            max="10"
            placeholder="Mín."
            value={criteria.minCost ?? ''}
            onChange={(event) =>
              update({ minCost: event.target.value ? Number(event.target.value) : undefined })
            }
            className="h-11 rounded-lg border-slate-300 text-sm"
            aria-label="Coste mínimo"
          />
          <input
            type="number"
            disabled={remote}
            min="0"
            max="10"
            placeholder="Máx."
            value={criteria.maxCost ?? ''}
            onChange={(event) =>
              update({ maxCost: event.target.value ? Number(event.target.value) : undefined })
            }
            className="h-11 rounded-lg border-slate-300 text-sm"
            aria-label="Coste máximo"
          />
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold">Poder</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input
            type="number"
            disabled={remote}
            min="0"
            max="13000"
            step="1000"
            placeholder="Mín."
            value={criteria.minPower ?? ''}
            onChange={(event) =>
              update({ minPower: event.target.value ? Number(event.target.value) : undefined })
            }
            className="h-11 rounded-lg border-slate-300 text-sm"
            aria-label="Poder mínimo"
          />
          <input
            type="number"
            disabled={remote}
            min="0"
            max="13000"
            step="1000"
            placeholder="Máx."
            value={criteria.maxPower ?? ''}
            onChange={(event) =>
              update({ maxPower: event.target.value ? Number(event.target.value) : undefined })
            }
            className="h-11 rounded-lg border-slate-300 text-sm"
            aria-label="Poder máximo"
          />
        </div>
      </div>
    </div>
  );
}

export function CatalogPage() {
  const services = useServices();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('query') ?? '');
  const debouncedQuery = useDebouncedValue(query);
  const [selectedCard, setSelectedCard] = useState<string | null>(params.get('card'));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [criteria, setCriteria] = useState<CatalogCriteria>({
    ...defaultCriteria,
    query: params.get('query') ?? '',
    setCode: params.get('set') ?? '',
    color: (params.get('color') as CardColor | null) ?? '',
    type: (params.get('type') as CardType | null) ?? '',
    rarity: params.get('rarity') ?? '',
    variant: (params.get('variant') as CardVariantType | null) ?? '',
    minCost: optionalNumberParam(params.get('minCost')),
    maxCost: optionalNumberParam(params.get('maxCost')),
    minPower: optionalNumberParam(params.get('minPower')),
    maxPower: optionalNumberParam(params.get('maxPower')),
    page: Number(params.get('page') ?? 1),
    sort: (params.get('sort') as CatalogCriteria['sort']) ?? 'code',
  });
  const remote = services.catalogProvider === 'ONE_PIECE_API';

  useEffect(() => {
    if (!remote) return;
    setCriteria((current) => ({
      ...current,
      color: '',
      type: '',
      rarity: '',
      variant: '',
      minCost: undefined,
      maxCost: undefined,
      minPower: undefined,
      maxPower: undefined,
      sort: current.sort === 'price' ? 'price' : 'code',
    }));
  }, [remote]);

  useEffect(() => {
    setCriteria((current) => ({ ...current, query: debouncedQuery, page: 1 }));
  }, [debouncedQuery]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (criteria.query) next.set('query', criteria.query);
    if (criteria.page > 1) next.set('page', String(criteria.page));
    if (criteria.sort !== 'code') next.set('sort', criteria.sort);
    if (criteria.setCode) next.set('set', criteria.setCode);
    if (criteria.color) next.set('color', criteria.color);
    if (criteria.type) next.set('type', criteria.type);
    if (criteria.rarity) next.set('rarity', criteria.rarity);
    if (criteria.variant) next.set('variant', criteria.variant);
    if (criteria.minCost !== undefined) next.set('minCost', String(criteria.minCost));
    if (criteria.maxCost !== undefined) next.set('maxCost', String(criteria.maxCost));
    if (criteria.minPower !== undefined) next.set('minPower', String(criteria.minPower));
    if (criteria.maxPower !== undefined) next.set('maxPower', String(criteria.maxPower));
    if (selectedCard) next.set('card', selectedCard);
    setParams(next, { replace: true });
  }, [criteria, selectedCard, setParams]);

  const result = useQuery({
    queryKey: ['catalog', services.catalogProvider, criteria],
    queryFn: ({ signal }) => services.catalog.search(criteria, signal),
    staleTime: 5 * 60 * 1000,
  });
  const collection = useQuery({
    queryKey: ['collection'],
    queryFn: () => services.privateData.listCollection(),
  });
  const sets = useQuery({
    queryKey: ['catalog-sets', services.catalogProvider],
    queryFn: ({ signal }) => services.catalog.listSets(signal),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const ownedIds = useMemo(
    () => new Set(collection.data?.map((item) => item.cardId) ?? []),
    [collection.data],
  );
  const activeFilters = [
    criteria.color,
    criteria.type,
    criteria.rarity,
    criteria.setCode,
    criteria.variant,
    criteria.minCost,
    criteria.maxCost,
    criteria.minPower,
    criteria.maxPower,
  ].filter((value) => value !== '' && value !== undefined).length;

  return (
    <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
      <PageHeader title="Explorar cartas" subtitle="Catálogo global normalizado" />
      <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
        <SearchInput value={query} onChange={setQuery} />
        <Button variant="secondary" onClick={() => setFiltersOpen(true)} className="lg:hidden">
          <Filter className="size-4" /> Filtros {activeFilters > 0 && `(${activeFilters})`}
        </Button>
        <label className="flex items-center gap-2 rounded-lg bg-white pl-3 text-sm font-semibold">
          Ordenar:
          <select
            value={criteria.sort}
            onChange={(event) =>
              setCriteria({
                ...criteria,
                sort: event.target.value as CatalogCriteria['sort'],
                page: 1,
              })
            }
            className="h-11 min-w-40 rounded-lg border-slate-300 text-sm"
          >
            <option value="code">Código (A-Z)</option>
            <option value="name" disabled={remote}>
              Nombre (A-Z)
            </option>
            <option value="price">Precio</option>
            <option value="power" disabled={remote}>
              Poder
            </option>
            <option value="cost" disabled={remote}>
              Coste
            </option>
          </select>
        </label>
      </div>
      <div className="grid gap-5 lg:grid-cols-[230px_1fr]">
        <aside className="hidden self-start rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:block">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-bold">Filtros</h2>
            <button
              onClick={() => {
                setCriteria(defaultCriteria);
                setQuery('');
              }}
              className="text-xs font-semibold text-violet"
            >
              Limpiar todo
            </button>
          </div>
          <FilterFields
            criteria={criteria}
            setCriteria={setCriteria}
            sets={sets.data ?? []}
            setsLoading={sets.isPending}
            remote={remote}
          />
        </aside>
        <section>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-600" aria-live="polite">
              {result.data?.total ?? 0} cartas encontradas
            </p>
            {result.data?.meta.fallbackUsed && (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                Datos de respaldo
              </span>
            )}
          </div>
          {result.isPending ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
              {Array.from({ length: 10 }).map((_, index) => (
                <div
                  key={index}
                  className="relative grid aspect-[5/7] animate-pulse place-items-center rounded-xl bg-slate-200"
                >
                  <OnePieceLoader size="sm" label={`Cargando carta ${index + 1}`} />
                </div>
              ))}
            </div>
          ) : result.isError ? (
            <ErrorState message={result.error.message} retry={() => void result.refetch()} />
          ) : result.data.items.length === 0 ? (
            <EmptyState
              title="No hay cartas con estos filtros"
              description="Prueba a ampliar la búsqueda o limpiar los filtros."
              action={
                <Button
                  onClick={() => {
                    setCriteria(defaultCriteria);
                    setQuery('');
                  }}
                >
                  Limpiar filtros
                </Button>
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {result.data.items.map((card) => (
                  <CardTile
                    key={card.id}
                    card={card}
                    owned={ownedIds.has(card.id)}
                    onOpen={() => setSelectedCard(card.id)}
                  />
                ))}
              </div>
              <div className="mt-8">
                <Pagination
                  page={criteria.page}
                  pages={Math.ceil(result.data.total / criteria.pageSize)}
                  onChange={(page) => setCriteria({ ...criteria, page })}
                />
              </div>
            </>
          )}
        </section>
      </div>
      {filtersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            onClick={() => setFiltersOpen(false)}
            className="absolute inset-0 bg-slate-950/60"
            aria-label="Cerrar filtros"
          />
          <aside className="absolute inset-y-0 right-0 w-[min(90vw,360px)] overflow-y-auto bg-white p-5 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-black">
                <SlidersHorizontal className="size-5" /> Filtros
              </h2>
              <button
                onClick={() => setFiltersOpen(false)}
                className="grid size-11 place-items-center rounded-lg"
                aria-label="Cerrar"
              >
                <X className="size-5" />
              </button>
            </div>
            <FilterFields
              criteria={criteria}
              setCriteria={setCriteria}
              sets={sets.data ?? []}
              setsLoading={sets.isPending}
              remote={remote}
            />
            <Button onClick={() => setFiltersOpen(false)} className="mt-8 w-full">
              Ver {result.data?.total ?? 0} cartas
            </Button>
          </aside>
        </div>
      )}
      <CardDetails cardId={selectedCard} onClose={() => setSelectedCard(null)} />
    </div>
  );
}
