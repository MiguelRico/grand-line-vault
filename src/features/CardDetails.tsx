import { Box, CalendarClock, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Card, CardVariant, CollectionItem } from '../domain/models';
import { useServices } from '../app/providers/ServicesProvider';
import { Button, CardImage, QuantitySelector, ResponsiveDialog } from '../shared/ui';
import { OnePieceLoader } from '../shared/OnePieceLoader';

export function CardDetails({ cardId, onClose }: { cardId: string | null; onClose: () => void }) {
  const services = useServices();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedVariantId(null);
    setQuantity(1);
  }, [cardId]);
  const cardQuery = useQuery({
    queryKey: ['card', cardId],
    queryFn: ({ signal }) => services.catalog.getById(cardId ?? '', signal),
    enabled: Boolean(cardId),
  });
  const collectionQuery = useQuery({
    queryKey: ['collection'],
    queryFn: () => services.privateData.listCollection(),
    enabled: Boolean(cardId),
  });
  const addMutation = useMutation({
    mutationFn: async ({ card, variant }: { card: Card; variant: CardVariant | null }) => {
      const timestamp = new Date().toISOString();
      const prices = variant ? variant.prices : card.prices;
      const sources = variant ? variant.sources : card.sources;
      const imageUrl = new URL(variant?.imageUrl ?? card.imageUrl, window.location.origin).href;
      const item: CollectionItem = {
        id: crypto.randomUUID(),
        cardId: card.id,
        cardVariantId: variant?.id ?? card.id,
        cardSnapshot: {
          code: card.code,
          name: card.name,
          setCode: card.set.code,
          rarity: card.rarity,
          variantLabel: variant?.label ?? 'Arte base',
          imageUrl,
          catalogPrice: prices[0],
          catalogProvider: sources[0]?.providerId,
          catalogFetchedAt: sources[0]?.fetchedAt,
        },
        quantity,
        language: variant?.language ?? card.language,
        condition: 'NEAR_MINT',
        favorite: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      return services.privateData.saveCollection(item);
    },
    onSuccess: async (savedItem) => {
      setQuantity(1);
      queryClient.setQueryData<CollectionItem[]>(['collection'], (items) => [
        savedItem,
        ...(items ?? []),
      ]);
      await queryClient.invalidateQueries({ queryKey: ['collection'] });
    },
  });

  const card = cardQuery.data;
  const selectedVariant =
    card?.variants.find((variant) => variant.id === selectedVariantId) ?? null;
  const selectedImageUrl = selectedVariant?.imageUrl ?? card?.imageUrl ?? '';
  const selectedLabel = selectedVariant?.label ?? 'Arte base';
  const selectedPrices = selectedVariant ? selectedVariant.prices : (card?.prices ?? []);
  const selectedSources = selectedVariant ? selectedVariant.sources : (card?.sources ?? []);
  const selectedLanguage = selectedVariant?.language ?? card?.language;
  const selectedCollectionId = selectedVariant?.id ?? card?.id;
  const cardCollectionItems =
    collectionQuery.data?.filter((item) => item.cardId === card?.id) ?? [];
  const ownedTotal = cardCollectionItems.reduce((sum, item) => sum + item.quantity, 0);
  const selectedOwnedTotal = cardCollectionItems
    .filter((item) => item.cardVariantId === selectedCollectionId)
    .reduce((sum, item) => sum + item.quantity, 0);
  const copyLabel = quantity === 1 ? 'copia' : 'copias';

  return (
    <ResponsiveDialog
      open={Boolean(cardId)}
      onOpenChange={(open) => {
        if (!open) {
          addMutation.reset();
          setQuantity(1);
          onClose();
        }
      }}
      title="Detalle de carta"
    >
      {cardQuery.isPending ? (
        <div className="grid h-[420px] animate-pulse place-items-center rounded-xl bg-slate-100">
          <OnePieceLoader size="lg" label="Cargando detalle de carta" />
        </div>
      ) : !card ? (
        <p className="p-8 text-center text-slate-600">No se ha encontrado la carta.</p>
      ) : (
        <div className="grid gap-7 md:grid-cols-[260px_1fr]">
          <div>
            <CardImage
              src={selectedImageUrl}
              alt={`Carta ${card.name} — ${selectedLabel}`}
              className="shadow-soft"
            />
            {card.variants.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Artes disponibles
                </p>
                <div className="flex gap-2 overflow-x-auto p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVariantId(null);
                      addMutation.reset();
                    }}
                    aria-pressed={selectedVariant === null}
                    aria-label="Mostrar arte base"
                    className={`w-14 shrink-0 rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet ${
                      selectedVariant === null
                        ? 'ring-2 ring-violet ring-offset-2'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <CardImage
                      src={card.imageUrl}
                      alt=""
                      className="w-full"
                      showFailureText={false}
                    />
                  </button>
                  {card.variants.map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => {
                        setSelectedVariantId(variant.id);
                        addMutation.reset();
                      }}
                      aria-pressed={selectedVariant?.id === variant.id}
                      aria-label={`Mostrar ${variant.label}`}
                      className={`w-14 shrink-0 rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet ${
                        selectedVariant?.id === variant.id
                          ? 'ring-2 ring-violet ring-offset-2'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <CardImage
                        src={variant.imageUrl}
                        alt=""
                        className="w-full"
                        showFailureText={false}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="min-w-0 pt-2">
            <p className="text-xs font-semibold text-slate-500">{card.code}</p>
            <h2 className="mt-1 pr-10 text-2xl font-black text-slate-950">{card.name}</h2>
            <p className="mt-1 text-sm font-semibold text-violet">{selectedLabel}</p>
            <p className="mt-1 text-sm text-slate-600">
              {card.type} · {card.traits.join(' / ')} · {selectedLanguage}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {card.colors.map((color) => (
                <span
                  key={color}
                  className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
                >
                  {color}
                </span>
              ))}
              {card.rarity && (
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                  {card.rarity}
                </span>
              )}
            </div>
            <dl className="mt-5 grid grid-cols-4 gap-3 border-y border-slate-200 py-4">
              {[
                ['Coste', card.cost],
                ['Poder', card.power],
                ['Counter', card.counter],
                ['Vidas', card.life],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <dt className="text-[10px] font-bold uppercase text-slate-500">{label}</dt>
                  <dd className="mt-1 font-black">{value ?? '–'}</dd>
                </div>
              ))}
            </dl>
            {card.effect && (
              <div className="mt-5">
                <h3 className="text-xs font-bold uppercase text-slate-500">Efecto</h3>
                <p className="mt-2 text-sm leading-6 text-slate-800">{card.effect}</p>
              </div>
            )}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Expansión</p>
                <p className="mt-1 text-sm font-semibold">{card.set.name}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Precio de catálogo</p>
                <p className="mt-1 font-black">
                  {selectedPrices[0]
                    ? `${selectedPrices[0].amount.toFixed(2)} ${selectedPrices[0].currency}`
                    : 'Sin valorar'}
                </p>
                {selectedPrices[0] && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                    <CalendarClock className="size-3" />
                    {selectedPrices[0].source}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-6 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
              <div aria-live="polite">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  En tu colección
                </p>
                {collectionQuery.isPending ? (
                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                    <OnePieceLoader size="xs" label="Consultando colección" />
                    Consultando…
                  </div>
                ) : (
                  <>
                    <p className="mt-1 text-lg font-black text-slate-950">
                      {selectedOwnedTotal} {selectedOwnedTotal === 1 ? 'copia' : 'copias'} de{' '}
                      {selectedLabel}
                    </p>
                    {card.variants.length > 0 && (
                      <p className="mt-1 text-xs text-slate-600">
                        Total entre todos los artes: {ownedTotal}
                      </p>
                    )}
                  </>
                )}
              </div>
              <div className="sm:justify-self-end">
                <p className="mb-2 text-sm font-semibold">Cantidad a añadir</p>
                <QuantitySelector
                  value={quantity}
                  onChange={(value) => {
                    setQuantity(value);
                    addMutation.reset();
                  }}
                  min={1}
                />
              </div>
            </div>
            {collectionQuery.isError && (
              <p role="alert" className="mt-3 text-sm text-amber-700">
                No se pudo consultar la cantidad actual. Aún puedes añadir esta carta.
              </p>
            )}
            {addMutation.isSuccess && (
              <p
                role="status"
                className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"
              >
                Se han añadido {addMutation.data.quantity}{' '}
                {addMutation.data.quantity === 1 ? 'copia' : 'copias'} de{' '}
                {addMutation.data.cardSnapshot.variantLabel}.
              </p>
            )}
            {addMutation.isError && (
              <p
                role="alert"
                className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
              >
                No se pudo añadir la carta. Inténtalo de nuevo.
              </p>
            )}
            <div className="mt-6">
              <Button
                onClick={() => addMutation.mutate({ card, variant: selectedVariant })}
                disabled={addMutation.isPending}
                className="w-full"
              >
                {addMutation.isPending ? (
                  <>
                    <OnePieceLoader size="xs" label="Añadiendo carta" />
                    Añadiendo carta…
                  </>
                ) : (
                  <>
                    <Plus className="size-4" />
                    Añadir {quantity} {copyLabel} de {selectedLabel}
                  </>
                )}
              </Button>
            </div>
            <div className="mt-3 flex justify-center gap-1 text-xs text-slate-500">
              <Box className="size-3.5" /> Fuente de datos:{' '}
              {selectedSources[0]?.providerId ?? 'desconocida'}
            </div>
          </div>
        </div>
      )}
    </ResponsiveDialog>
  );
}
