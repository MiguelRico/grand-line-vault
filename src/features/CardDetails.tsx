import { Box, CalendarClock, Layers3, Plus } from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Card, CollectionItem } from '../domain/models';
import { useServices } from '../app/providers/ServicesProvider';
import { Button, CardImage, QuantitySelector, ResponsiveDialog } from '../shared/ui';

export function CardDetails({
  cardId,
  onClose,
}: {
  cardId: string | null;
  onClose: () => void;
}) {
  const services = useServices();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const cardQuery = useQuery({
    queryKey: ['card', cardId],
    queryFn: ({ signal }) => services.catalog.getById(cardId ?? '', signal),
    enabled: Boolean(cardId),
  });
  const collectionQuery = useQuery({
    queryKey: ['collection'],
    queryFn: () => services.privateData.listCollection(),
  });
  const existing = collectionQuery.data?.find((item) => item.cardId === cardId);
  const addMutation = useMutation({
    mutationFn: async (card: Card) => {
      const timestamp = new Date().toISOString();
      const item: CollectionItem = existing
        ? { ...existing, quantity, updatedAt: timestamp }
        : {
            id: crypto.randomUUID(),
            cardId: card.id,
            cardVariantId: card.id,
            cardSnapshot: {
              code: card.code,
              name: card.name,
              setCode: card.set.code,
              rarity: card.rarity,
              variantLabel: 'Normal',
              imageUrl: card.imageUrl,
              catalogPrice: card.prices[0],
              catalogProvider: card.sources[0]?.providerId,
              catalogFetchedAt: card.sources[0]?.fetchedAt,
            },
            quantity,
            language: card.language,
            condition: 'NEAR_MINT',
            favorite: false,
            tradeableQuantity: 0,
            createdAt: timestamp,
            updatedAt: timestamp,
          };
      return services.privateData.saveCollection(item);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['collection'] });
    },
  });

  const card = cardQuery.data;
  return (
    <ResponsiveDialog open={Boolean(cardId)} onOpenChange={(open) => !open && onClose()} title="Detalle de carta">
      {cardQuery.isPending ? (
        <div className="h-[420px] animate-pulse rounded-xl bg-slate-100" />
      ) : !card ? (
        <p className="p-8 text-center text-slate-600">No se ha encontrado la carta.</p>
      ) : (
        <div className="grid gap-7 md:grid-cols-[260px_1fr]">
          <div>
            <CardImage src={card.imageUrl} alt={`Carta ${card.name}`} className="shadow-soft" />
            {card.variants.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Artes disponibles
                </p>
                <div className="flex gap-2">
                  <CardImage src={card.imageUrl} alt="Arte base" className="w-14 shrink-0" />
                  {card.variants.slice(0, 3).map((variant) => (
                    <CardImage
                      key={variant.id}
                      src={variant.imageUrl}
                      alt={variant.label}
                      className="w-14 shrink-0"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="min-w-0 pt-2">
            <p className="text-xs font-semibold text-slate-500">{card.code}</p>
            <h2 className="mt-1 pr-10 text-2xl font-black text-slate-950">{card.name}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {card.type} · {card.traits.join(' / ')}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {card.colors.map((color) => (
                <span key={color} className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
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
                  {card.prices[0]
                    ? `${card.prices[0].amount.toFixed(2)} ${card.prices[0].currency}`
                    : 'Sin valorar'}
                </p>
                {card.prices[0] && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                    <CalendarClock className="size-3" />
                    {card.prices[0].source}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between gap-4">
              <div>
                <p className="mb-2 text-sm font-semibold">Cantidad en tu colección</p>
                <QuantitySelector value={quantity} onChange={setQuantity} min={1} />
              </div>
              {existing && (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Ya tienes {existing.quantity}
                </span>
              )}
            </div>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <Button
                onClick={() => addMutation.mutate(card)}
                disabled={addMutation.isPending}
                className="w-full"
              >
                <Plus className="size-4" />
                {existing ? 'Actualizar colección' : 'Añadir a mi colección'}
              </Button>
              <Button variant="secondary" className="w-full">
                <Layers3 className="size-4" /> Añadir a un mazo
              </Button>
            </div>
            <div className="mt-3 flex justify-center gap-1 text-xs text-slate-500">
              <Box className="size-3.5" /> Fuente de datos: {card.sources[0]?.providerId ?? 'desconocida'}
            </div>
          </div>
        </div>
      )}
    </ResponsiveDialog>
  );
}
