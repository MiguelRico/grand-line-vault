import {
  Archive,
  ExternalLink,
  Grid2X2,
  Heart,
  Layers3,
  List,
  Plus,
  ShoppingBag,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useServices } from '../app/providers/ServicesProvider';
import type {
  CardCondition,
  CardLanguage,
  CollectionItem,
  SalesPack,
  StorageBox,
} from '../domain/models';
import {
  groupCollectionItems,
  type CollectionCardGroup,
  type CollectionVariantGroup,
} from '../domain/collectionGrouping';
import { calculateCollectionStats, sectionLabel } from '../domain/services';
import { PageHeader } from '../shared/AppShell';
import { OnePieceLoader } from '../shared/OnePieceLoader';
import {
  Button,
  CardImage,
  EmptyState,
  FavoriteButton,
  QuantitySelector,
  ResponsiveDialog,
  SearchInput,
} from '../shared/ui';

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
      <p
        className={`truncate text-xl font-black sm:text-2xl ${accent ? 'text-violet' : 'text-slate-950'}`}
      >
        {value}
      </p>
      <p className="mt-1 truncate text-[10px] text-slate-500 sm:text-xs">{label}</p>
    </div>
  );
}
function OrganizationEditor({
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
    queryFn: () => services.organization.listBoxes(),
  });
  const save = useMutation({
    mutationFn: (value: CollectionItem) => services.collection.saveCollection(value),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['collection'] });
      onClose();
    },
  });
  return (
    <ResponsiveDialog
      open={Boolean(item)}
      onOpenChange={(open) => !open && onClose()}
      title="Ubicar carta"
    >
      {draft && (
        <div className="grid gap-6 pt-8 md:grid-cols-[180px_1fr] md:pt-0">
          <CardImage
            src={draft.variant?.image ?? draft.card.image}
            alt={`Carta ${draft.card.name}`}
          />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-violet">Organización</p>
            <h2 className="mt-1 pr-10 text-2xl font-black">Ubicar {draft.card.name}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {draft.variant?.label ?? 'Arte base'} · {draft.language} ·{' '}
              {draft.condition.replace('_', ' ')}
            </p>
            <p className="mt-5 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-900">
              Desde Organización sólo se modifica la ubicación física. La cantidad, el favorito y la
              eliminación se gestionan desde el detalle de Mi colección.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold">
                Contenedor
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
            <Button
              className="mt-6 w-full"
              disabled={save.isPending}
              onClick={() => save.mutate({ ...draft, updatedAt: new Date().toISOString() })}
            >
              {save.isPending ? 'Guardando ubicación…' : 'Guardar contenedor y sección'}
            </Button>
          </div>
        </div>
      )}
    </ResponsiveDialog>
  );
}

function CollectionArtworkStack({
  group,
  compact = false,
}: {
  group: CollectionCardGroup;
  compact?: boolean;
}) {
  const variantImages = group.variants
    .map((entry) => entry.variant?.image)
    .filter((image): image is string => Boolean(image))
    .slice(0, 3);
  const offsets = compact
    ? ['translate-x-3', 'translate-x-2', 'translate-x-1']
    : ['translate-x-6', 'translate-x-4', 'translate-x-2'];

  return (
    <div className={`relative ${variantImages.length > 0 ? (compact ? 'mr-3' : 'mr-6') : ''}`}>
      {[...variantImages].reverse().map((image, index) => (
        <CardImage
          key={image}
          src={image}
          alt=""
          showFailureText={false}
          className={`absolute inset-0 border border-slate-300 shadow-sm ${offsets[index]}`}
        />
      ))}
      <CardImage
        src={group.card.image}
        alt={`Carta ${group.card.name}`}
        className="relative border border-slate-200 shadow-sm"
      />
    </div>
  );
}

const conditionLabels: Record<CardCondition, string> = {
  MINT: 'Mint',
  NEAR_MINT: 'Near Mint',
  EXCELLENT: 'Excelente',
  GOOD: 'Bueno',
  PLAYED: 'Jugado',
  POOR: 'Deteriorado',
  UNKNOWN: 'Sin indicar',
};

const packStatusLabels: Record<SalesPack['status'], string> = {
  DRAFT: 'Borrador',
  READY: 'Listo para venta',
  SOLD: 'Vendido',
  ARCHIVED: 'Archivado',
};

function variantKey(variant: CollectionVariantGroup): string {
  return variant.id ?? 'BASE';
}

function CollectionCardDetail({
  group,
  boxes,
  packs,
  onClose,
  onOrganize,
}: {
  group: CollectionCardGroup | null;
  boxes: StorageBox[];
  packs: SalesPack[];
  onClose: () => void;
  onOrganize: (item: CollectionItem) => void;
}) {
  const services = useServices();
  const queryClient = useQueryClient();
  const [activeVariantKey, setActiveVariantKey] = useState('BASE');
  const [draftQuantities, setDraftQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    setActiveVariantKey(group?.variants[0] ? variantKey(group.variants[0]) : 'BASE');
    setDraftQuantities(
      Object.fromEntries((group?.items ?? []).map((item) => [item.id, item.quantity])),
    );
  }, [group]);

  const updateItem = useMutation({
    mutationFn: (item: CollectionItem) => services.collection.saveCollection(item),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['collection'] }),
  });
  const removeItem = useMutation({
    mutationFn: async (item: CollectionItem) => {
      const affectedPacks = packs.filter((pack) =>
        pack.items.some((packItem) => packItem.collectionItemId === item.id),
      );
      await Promise.all(
        affectedPacks.map((pack) =>
          services.organization.saveSalesPack({
            ...pack,
            items: pack.items.filter((packItem) => packItem.collectionItemId !== item.id),
            updatedAt: new Date().toISOString(),
          }),
        ),
      );
      await services.collection.removeCollection(item.id);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['collection'] }),
        queryClient.invalidateQueries({ queryKey: ['sales-packs'] }),
      ]);
    },
  });

  if (!group) return null;
  const activeVariant =
    group.variants.find((variant) => variantKey(variant) === activeVariantKey) ?? group.variants[0];
  if (!activeVariant) return null;

  const card = group.card;
  const activeImage = activeVariant.variant?.image ?? card.image;
  const activeLabel = activeVariant.variant?.label ?? 'Arte principal';
  const activeType = activeVariant.variant?.variant_type ?? 'BASE';
  const links = [
    ['Cardmarket', card.links?.cardmarket],
    ['TCGPlayer', card.links?.tcgplayer],
    ['TCGGO', card.tcggo_url],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={`${card.name} en tu colección`}
    >
      <div className="grid gap-7 pt-6 md:grid-cols-[260px_1fr] md:pt-0">
        <section>
          <CardImage
            src={activeImage}
            alt={`Carta ${card.name} — ${activeLabel}`}
            className="shadow-soft"
          />
          <div className="mt-4" aria-label="Variantes en tu colección">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              Artes en tu colección
            </p>
            <div className="flex gap-2 overflow-x-auto p-1">
              {group.variants.map((variant) => {
                const key = variantKey(variant);
                const selected = key === variantKey(activeVariant);
                return (
                  <button
                    key={key}
                    onClick={() => setActiveVariantKey(key)}
                    className={`relative w-14 shrink-0 rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet ${
                      selected ? 'ring-2 ring-violet ring-offset-2' : 'opacity-70 hover:opacity-100'
                    }`}
                    aria-label={`Ver ${variant.variant?.label ?? 'arte principal'}, ${variant.quantity} copias`}
                    aria-pressed={selected}
                  >
                    <CardImage
                      src={variant.variant?.image ?? card.image}
                      alt=""
                      className="w-full"
                      showFailureText={false}
                    />
                    <span className="absolute bottom-1 right-1 rounded-full bg-slate-950/85 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      ×{variant.quantity}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-slate-500">
            {group.variants.length} {group.variants.length === 1 ? 'impresión' : 'impresiones'} ·{' '}
            {group.quantity} {group.quantity === 1 ? 'copia' : 'copias'}
          </p>
        </section>

        <div className="min-w-0 pt-2">
          <p className="text-xs font-semibold text-slate-500">{card.card_number}</p>
          <h2 className="mt-1 pr-10 text-2xl font-black text-slate-950">{card.name}</h2>
          <p className="mt-1 text-sm font-semibold text-violet">{activeLabel}</p>
          <p className="mt-1 text-sm text-slate-600">
            {card.game.card_type} ·{' '}
            {card.game.colors.length > 0 ? card.game.colors.join(' / ') : card.color || 'Sin color'}{' '}
            · {activeVariant.variant?.language ?? activeVariant.items[0]?.language}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {card.game.colors.map((color) => (
              <span
                key={color}
                className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
              >
                {color}
              </span>
            ))}
            {(card.rarity ?? card.rarity_normalized) && (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                {card.rarity ?? card.rarity_normalized}
              </span>
            )}
          </div>
          <dl className="mt-5 grid grid-cols-4 gap-3 border-y border-slate-200 py-4">
            {[
              ['Coste', card.game.cost],
              ['Poder', card.game.power],
              ['Counter', card.game.counter],
              ['Vidas', card.game.life],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <dt className="text-[10px] font-bold uppercase text-slate-500">{label}</dt>
                <dd className="mt-1 font-black">{value ?? '–'}</dd>
              </div>
            ))}
          </dl>

          {card.game.attributes.length > 0 && (
            <dl className="mt-5">
              <div>
                <dt className="text-xs font-bold uppercase text-slate-500">Atributos</dt>
                <dd className="mt-1 text-sm text-slate-800">{card.game.attributes.join(' / ')}</dd>
              </div>
            </dl>
          )}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-500">Expansión</p>
              <p className="mt-1 text-sm font-semibold">{card.episode.name}</p>
              <p className="mt-1 text-xs text-slate-600">
                {card.episode.code}
                {card.setCodes.length > 1 ? ` · ${card.setCodes.join(', ')}` : ''}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-500">En tu colección</p>
              <p className="mt-1 text-lg font-black">
                {activeVariant.quantity} {activeVariant.quantity === 1 ? 'copia' : 'copias'} de{' '}
                {activeLabel}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Total entre todos los artes: {group.quantity}
              </p>
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-slate-200 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Datos de la impresión
            </h3>
            <dl className="mt-3 grid grid-cols-3 gap-x-3 gap-y-3 text-sm">
              {[
                ['Versión', activeLabel],
                ['Tipo de impresión', activeType],
                ['N.º de impresión', activeVariant.variant?.number],
                ['ID de variante', activeVariant.id],
                ['Idioma', activeVariant.variant?.language ?? activeVariant.items[0]?.language],
                ['Proveedor del índice', card.source.providerId],
                ['ID del proveedor', card.tcggoId ?? card.source.providerCardId],
                ['Artista', card.artist?.name],
                ['Cardmarket ID', card.cardmarket_id],
                ['TCGPlayer ID', card.tcgplayer_id],
                ['TCG ID', card.tcgid],
              ].map(([label, value]) => (
                <div key={String(label)} className="min-w-0">
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="break-words font-semibold">{value ?? '–'}</dd>
                </div>
              ))}
            </dl>
            {links.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {links.map(([label, href]) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
                  >
                    {label} <ExternalLink className="size-3" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <section className="mt-7">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-black">Gestión de ejemplares</h3>
              <span className="text-xs font-semibold text-slate-500">
                {activeVariant.quantity} copias
              </span>
            </div>
            <div className="mt-3 space-y-3">
              {activeVariant.items.map((item) => {
                const memberships = packs.flatMap((pack) =>
                  pack.items
                    .filter((packItem) => packItem.collectionItemId === item.id)
                    .map((packItem) => ({ pack, quantity: packItem.quantity })),
                );
                return (
                  <article key={item.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold">
                          {item.language} · {conditionLabels[item.condition]} · ×{item.quantity}
                        </p>
                        <p className="mt-1 flex items-start gap-1.5 text-sm text-violet">
                          <Archive className="mt-0.5 size-3.5 shrink-0" />
                          {sectionLabel(boxes, item.boxId, item.sectionId)}
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        onClick={() => onOrganize(item)}
                        className="shrink-0"
                        aria-label={`Ubicar lote de ${activeLabel}`}
                      >
                        <Archive className="size-4" /> Ubicar
                      </Button>
                    </div>
                    <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-y border-slate-100 py-4">
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                          Cantidad
                        </p>
                        <QuantitySelector
                          value={draftQuantities[item.id] ?? item.quantity}
                          min={1}
                          max={999}
                          onChange={(quantity) =>
                            setDraftQuantities((current) => ({
                              ...current,
                              [item.id]: quantity,
                            }))
                          }
                        />
                      </div>
                      <FavoriteButton
                        active={item.favorite}
                        onClick={() =>
                          updateItem.mutate({
                            ...item,
                            favorite: !item.favorite,
                            updatedAt: new Date().toISOString(),
                          })
                        }
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                      {item.favorite && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 font-semibold text-red-700">
                          <Heart className="size-3 fill-current" /> Favorita
                        </span>
                      )}
                      {item.acquisitionPrice && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold">
                          Adquisición: {item.acquisitionPrice.amount.toFixed(2)}{' '}
                          {item.acquisitionPrice.currency}
                        </span>
                      )}
                    </div>
                    {item.notes && (
                      <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                        {item.notes}
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        className="flex-1"
                        disabled={
                          updateItem.isPending ||
                          (draftQuantities[item.id] ?? item.quantity) === item.quantity
                        }
                        onClick={() =>
                          updateItem.mutate({
                            ...item,
                            quantity: draftQuantities[item.id] ?? item.quantity,
                            updatedAt: new Date().toISOString(),
                          })
                        }
                      >
                        {updateItem.isPending ? 'Guardando…' : 'Actualizar cantidad'}
                      </Button>
                      <Button
                        variant="danger"
                        disabled={removeItem.isPending}
                        onClick={() => {
                          const packNotice =
                            memberships.length > 0
                              ? ` También se retirará de ${memberships.length} ${
                                  memberships.length === 1 ? 'pack' : 'packs'
                                } de venta.`
                              : '';
                          if (
                            window.confirm(
                              `¿Eliminar este lote de ${activeLabel} de tu colección?${packNotice}`,
                            )
                          ) {
                            removeItem.mutate(item);
                          }
                        }}
                      >
                        <Trash2 className="size-4" /> Eliminar lote
                      </Button>
                    </div>
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                        <ShoppingBag className="size-3.5" /> Packs de venta
                      </p>
                      {memberships.length > 0 ? (
                        <div className="mt-2 space-y-2">
                          {memberships.map(({ pack, quantity }) => (
                            <div
                              key={pack.id}
                              className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-950"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <strong>{pack.name}</strong>
                                <span className="text-xs font-bold">
                                  {packStatusLabels[pack.status]} · ×{quantity}
                                </span>
                              </div>
                              {pack.description && (
                                <p className="mt-1 text-xs text-indigo-800">{pack.description}</p>
                              )}
                              {pack.salePrice && (
                                <p className="mt-1 text-xs font-semibold">
                                  Precio del pack: {pack.salePrice.amount.toFixed(2)}{' '}
                                  {pack.salePrice.currency}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-sm text-slate-500">
                          Este lote no pertenece a ningún pack.
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-900">
            Este detalle usa exclusivamente el índice del catálogo y tus datos locales. No consulta
            TCGGO ni el proveedor mock.
          </div>
        </div>
      </div>
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

function CollectionLoadingState() {
  return (
    <div aria-busy="true" aria-label="Cargando colección">
      <section className="mb-5 grid grid-cols-4 overflow-hidden rounded-xl border border-slate-200 bg-white py-4 shadow-sm lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className={`relative grid min-h-14 place-items-center border-r border-slate-200 last:border-0 ${
              index > 3 ? 'hidden lg:grid' : ''
            }`}
          >
            <div className="absolute inset-x-3 inset-y-1 animate-pulse rounded-lg bg-slate-100" />
            <OnePieceLoader size="sm" label="Cargando estadística" />
          </div>
        ))}
      </section>
      <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative h-11 animate-pulse rounded-lg bg-slate-200">
          <OnePieceLoader
            size="sm"
            label="Cargando buscador"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          />
        </div>
        {[0, 1].map((item) => (
          <div key={item} className="relative h-11 min-w-28 animate-pulse rounded-lg bg-slate-200">
            <OnePieceLoader
              size="sm"
              label="Cargando control"
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, index) => (
          <div
            key={index}
            className="relative aspect-[5/7] animate-pulse overflow-hidden rounded-xl bg-slate-200"
          >
            <OnePieceLoader
              label={`Cargando carta ${index + 1}`}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

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
            Contenedor
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
              <option value="">Todos los contenedores</option>
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
            {(
              [
                ['favoritesOnly', 'Cartas favoritas'],
                ['unassignedOnly', 'Lotes sin ubicar'],
                ['duplicatesOnly', 'Lotes con varias copias'],
              ] as const
            ).map(([key, label]) => (
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
          <Button onClick={onClose}>Ver {resultCount} cartas</Button>
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
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [organizingItem, setOrganizingItem] = useState<CollectionItem | null>(null);
  const result = useQuery({
    queryKey: ['collection'],
    queryFn: () => services.collection.listCollection(),
  });
  const boxes = useQuery({
    queryKey: ['boxes'],
    queryFn: () => services.organization.listBoxes(),
  });
  const packs = useQuery({
    queryKey: ['sales-packs'],
    queryFn: () => services.organization.listSalesPacks(),
  });
  const items = useMemo(() => result.data ?? [], [result.data]);
  const stats = calculateCollectionStats(items);
  const filteredItems = useMemo(() => {
    const normalized = query.toLocaleLowerCase();
    return items.filter(
      (item) =>
        (!normalized ||
          item.card.name.toLocaleLowerCase().includes(normalized) ||
          item.card.card_number.toLocaleLowerCase().includes(normalized)) &&
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
  const groups = useMemo(() => groupCollectionItems(items), [items]);
  const filteredGroups = useMemo(() => groupCollectionItems(filteredItems), [filteredItems]);
  const selectedGroup = groups.find((group) => group.catalogCardId === selectedGroupId) ?? null;
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
    if (filters.boxId) chips.push({ key: 'boxId', label: selectedBox?.name ?? 'Contenedor' });
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
  const loading = result.isPending || boxes.isPending || packs.isPending;

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
      {loading ? (
        <CollectionLoadingState />
      ) : (
        <>
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
                value={`${stats.acquisitionValue.amount.toFixed(2)} ${stats.acquisitionValue.currency}`}
                label="Coste registrado"
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
                La completitud cuenta cartas base; sus variantes se agrupan bajo la misma carta.
              </p>
            </section>
          ) : (
            <>
              <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                <SearchInput
                  value={query}
                  onChange={setQuery}
                  placeholder="Buscar en mi colección..."
                />
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
                          effectiveView === 'grid'
                            ? 'bg-indigo-50 text-violet'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <Grid2X2 className="size-4" /> Cuadrícula
                      </button>
                      <button
                        role="menuitemradio"
                        aria-checked={effectiveView === 'list'}
                        onClick={() => chooseView('list')}
                        className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold ${
                          effectiveView === 'list'
                            ? 'bg-indigo-50 text-violet'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <List className="size-4" /> Lista
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {activeFilterChips.length > 0 && (
                <div
                  className="mb-5 flex flex-wrap items-center gap-2"
                  aria-label="Filtros activos"
                >
                  {activeFilterChips.map((chip) => (
                    <button
                      key={chip.key}
                      onClick={() =>
                        setFilters({
                          ...filters,
                          [chip.key]: typeof filters[chip.key] === 'boolean' ? false : '',
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
              {filteredGroups.length === 0 ? (
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
                  {filteredGroups.map((group) => {
                    const locations = new Set(
                      group.items.map((item) =>
                        sectionLabel(boxes.data ?? [], item.boxId, item.sectionId),
                      ),
                    );
                    return (
                      <button
                        key={group.catalogCardId}
                        onClick={() => setSelectedGroupId(group.catalogCardId)}
                        className="grid w-full grid-cols-[64px_1fr_auto] items-center gap-3 border-b border-slate-100 p-3 text-left last:border-0 hover:bg-slate-50"
                      >
                        <div className="w-11">
                          <CollectionArtworkStack group={group} compact />
                        </div>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{group.card.name}</span>
                          <span className="block text-xs text-slate-500">
                            {group.card.card_number} · {group.variants.length}{' '}
                            {group.variants.length === 1 ? 'impresión' : 'impresiones'}
                          </span>
                          <span className="mt-1 flex items-center gap-1 text-xs text-violet">
                            <Archive className="size-3" />
                            {locations.size === 1
                              ? Array.from(locations)[0]
                              : `${locations.size} ubicaciones`}
                          </span>
                        </span>
                        <span className="flex items-center gap-3">
                          {group.favorite && <Heart className="size-4 fill-red-500 text-red-500" />}
                          <strong>×{group.quantity}</strong>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                  {filteredGroups.map((group) => (
                    <article key={group.catalogCardId} className="group min-w-0">
                      <button
                        onClick={() => setSelectedGroupId(group.catalogCardId)}
                        className="relative block w-full rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2"
                        aria-label={`Ver ${group.card.name}, ${group.variants.length} impresiones`}
                      >
                        <CollectionArtworkStack group={group} />
                        <span className="absolute right-8 top-2 z-10 rounded-full bg-ink/90 px-2 py-1 text-xs font-bold text-white">
                          ×{group.quantity}
                        </span>
                        {group.variants.length > 1 && (
                          <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-violet/95 px-2 py-1 text-[11px] font-bold text-white shadow">
                            <Layers3 className="size-3" />
                            {group.variants.length} artes
                          </span>
                        )}
                      </button>
                      <div className="mt-2 min-w-0 pr-5">
                        <p className="text-[11px] font-medium text-slate-500">
                          {group.card.card_number}
                        </p>
                        <h3 className="truncate text-sm font-semibold text-slate-950">
                          {group.card.name}
                        </h3>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
      <CollectionFilterDrawer
        open={filtersOpen}
        filters={filters}
        boxes={boxes.data ?? []}
        resultCount={filteredGroups.length}
        onChange={setFilters}
        onClose={() => setFiltersOpen(false)}
        onClear={() => setFilters(emptyFilters)}
      />
      <CollectionCardDetail
        group={selectedGroup}
        boxes={boxes.data ?? []}
        packs={packs.data ?? []}
        onClose={() => setSelectedGroupId(null)}
        onOrganize={(item) => {
          setSelectedGroupId(null);
          setOrganizingItem(item);
        }}
      />
      <OrganizationEditor item={organizingItem} onClose={() => setOrganizingItem(null)} />
    </div>
  );
}
