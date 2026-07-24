import {
  ArrowLeftRight,
  BarChart3,
  Copy,
  Download,
  Heart,
  Layers3,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useServices } from '../app/providers/ServicesProvider';
import { calculateCollectionStats, deckAvailabilityWarnings } from '../domain/services';
import type { Deck } from '../domain/models';
import { PageHeader, SimplePage } from '../shared/AppShell';
import { Button, CardImage, EmptyState, SearchInput } from '../shared/ui';

export function DecksPage() {
  const services = useServices();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const decks = useQuery({ queryKey: ['decks'], queryFn: () => services.privateData.listDecks() });
  const collection = useQuery({
    queryKey: ['collection'],
    queryFn: () => services.privateData.listCollection(),
  });
  const save = useMutation({
    mutationFn: (deck: Deck) => services.privateData.saveDeck(deck),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['decks'] }),
  });

  const createDeck = () => {
    if (!name.trim()) return;
    const now = new Date().toISOString();
    save.mutate({
      id: crypto.randomUUID(),
      name: name.trim(),
      cards: [],
      createdAt: now,
      updatedAt: now,
    });
    setName('');
  };

  return (
    <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
      <PageHeader title="Mis mazos" subtitle="Diseña y controla tus listas" />
      <div className="mb-6 flex gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && createDeck()}
          placeholder="Nombre del nuevo mazo"
          maxLength={80}
          className="h-11 min-w-0 flex-1 rounded-lg border-slate-300 text-sm"
          aria-label="Nombre del nuevo mazo"
        />
        <Button onClick={createDeck} disabled={!name.trim()}>
          <Plus className="size-4" /> <span className="hidden sm:inline">Crear mazo</span>
        </Button>
      </div>
      {!decks.data?.length ? (
        <EmptyState
          title="Todavía no tienes mazos"
          description="Crea uno y añade cartas desde tu colección."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {decks.data.map((deck) => {
            const warnings = deckAvailabilityWarnings(deck, collection.data ?? []);
            const total = deck.cards.reduce((sum, card) => sum + card.quantity, 0);
            return (
              <article key={deck.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="grid size-12 place-items-center rounded-xl bg-indigo-50 text-violet">
                    <ShieldCheck className="size-6" />
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{total} cartas</span>
                </div>
                <h2 className="mt-5 text-lg font-black">{deck.name}</h2>
                <p className="mt-1 text-sm text-slate-600">{deck.description ?? 'Sin descripción'}</p>
                <div className="mt-4 flex -space-x-3">
                  {deck.cards.slice(0, 5).map((card) => (
                    <CardImage
                      key={card.id}
                      src={card.snapshot.imageUrl}
                      alt={card.snapshot.name}
                      className="w-12 border-2 border-white"
                    />
                  ))}
                </div>
                {warnings.length > 0 && (
                  <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs font-medium text-amber-900">
                    {warnings[0]}
                  </p>
                )}
                <Button variant="secondary" className="mt-5 w-full">
                  Gestionar mazo
                </Button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function TradesPage() {
  const services = useServices();
  const [query, setQuery] = useState('');
  const collection = useQuery({
    queryKey: ['collection'],
    queryFn: () => services.privateData.listCollection(),
  });
  const items = useMemo(() => {
    const normalized = query.toLocaleLowerCase();
    return (collection.data ?? []).filter(
      (item) =>
        item.tradeableQuantity > 0 &&
        (!normalized ||
          item.cardSnapshot.name.toLocaleLowerCase().includes(normalized) ||
          item.cardSnapshot.code.toLocaleLowerCase().includes(normalized)),
    );
  }, [collection.data, query]);
  const text = items
    .map(
      (item) =>
        `${item.cardSnapshot.code} ${item.cardSnapshot.name} ×${item.tradeableQuantity} (${item.language}, ${item.condition})`,
    )
    .join('\n');
  const downloadCsv = () => {
    const rows = [
      'Código,Nombre,Cantidad,Idioma,Estado',
      ...items.map(
        (item) =>
          `${item.cardSnapshot.code},"${item.cardSnapshot.name}",${item.tradeableQuantity},${item.language},${item.condition}`,
      ),
    ];
    const url = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'intercambios.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
      <PageHeader title="Intercambios" subtitle="Copias disponibles para compartir con otros coleccionistas" />
      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <SearchInput value={query} onChange={setQuery} />
        <Button variant="secondary" onClick={() => void navigator.clipboard.writeText(text)}>
          <Copy className="size-4" /> Copiar listado
        </Button>
        <Button variant="secondary" onClick={downloadCsv}>
          <Download className="size-4" /> CSV
        </Button>
      </div>
      {items.length === 0 ? (
        <EmptyState
          title="No hay cartas para intercambio"
          description="Marca copias como intercambiables desde Mi colección."
          action={
            <Link to="/collection">
              <Button>Ir a mi colección</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="grid grid-cols-[72px_1fr_auto] items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
            >
              <CardImage src={item.cardSnapshot.imageUrl} alt={item.cardSnapshot.name} />
              <div className="min-w-0">
                <p className="text-xs text-slate-500">{item.cardSnapshot.code}</p>
                <h2 className="truncate font-bold">{item.cardSnapshot.name}</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {item.language} · {item.condition.replace('_', ' ')}
                </p>
              </div>
              <div className="text-center">
                <ArrowLeftRight className="mx-auto size-4 text-violet" />
                <strong className="mt-1 block">×{item.tradeableQuantity}</strong>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function StatisticsPage() {
  const services = useServices();
  const collection = useQuery({
    queryKey: ['collection'],
    queryFn: () => services.privateData.listCollection(),
  });
  const stats = calculateCollectionStats(collection.data ?? []);
  const rows = [
    ['Cartas totales', stats.totalCopies, 'bg-indigo-500'],
    ['Cartas diferentes', stats.uniqueCards, 'bg-emerald-500'],
    ['Copias duplicadas', stats.duplicateCopies, 'bg-amber-500'],
    ['Intercambiables', stats.tradeableCopies, 'bg-sky-500'],
    ['Favoritas', stats.favoriteCards, 'bg-rose-500'],
  ] as const;
  const max = Math.max(...rows.map((row) => row[1]), 1);
  return (
    <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
      <PageHeader title="Estadísticas" subtitle="Una lectura clara del estado de tu colección" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl bg-gradient-to-br from-violet to-indigo-700 p-6 text-white shadow-soft sm:col-span-2">
          <BarChart3 className="size-7 opacity-80" />
          <p className="mt-5 text-sm font-medium text-indigo-100">Valor estimado</p>
          <p className="mt-1 text-4xl font-black">
            {stats.estimatedValue.amount.toFixed(2)} {stats.estimatedValue.currency}
          </p>
          <p className="mt-4 max-w-xl text-xs leading-5 text-indigo-100">
            Estimación orientativa basada en los precios disponibles de los proveedores configurados.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <Layers3 className="size-7 text-violet" />
          <p className="mt-5 text-sm text-slate-500">Expansiones representadas</p>
          <p className="mt-1 text-4xl font-black">{stats.setsRepresented}</p>
        </div>
      </div>
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="font-black">Resumen</h2>
        <div className="mt-6 space-y-5">
          {rows.map(([label, value, color]) => (
            <div key={label}>
              <div className="mb-2 flex justify-between text-sm">
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${(value / max) * 100}%` }} />
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
          description="Marca el corazón en cualquier carta de tu colección."
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

export function SettingsPage() {
  return (
    <SimplePage title="Ajustes">
      <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="font-black">Catálogo y precios</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Los proveedores, la prioridad de imágenes y la moneda se configuran mediante variables de
          entorno y Script Properties. No se muestran claves ni secretos en el navegador.
        </p>
        <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
          Modo mock activo: todos los flujos funcionan sin servicios externos.
        </div>
      </div>
    </SimplePage>
  );
}
