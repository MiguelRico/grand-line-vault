import { Box, CalendarClock, ExternalLink, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import type {
  CardDetail,
  CardVariant,
  CatalogCard,
  CatalogExternalLinks,
  CollectionEntry,
  CollectionItem,
  PaginatedResult,
} from '../domain/models';
import { catalogPriceList } from '../domain/services';
import { collectionItemIdentity, resolveCatalogVariant } from '../domain/catalogNormalization';
import { config } from '../app/config';
import { useServices } from '../app/providers/ServicesProvider';
import { Button, CardImage, QuantitySelector, ResponsiveDialog } from '../shared/ui';
import { OnePieceLoader } from '../shared/OnePieceLoader';

function CatalogLinks({
  links,
  tcggoUrl,
}: {
  links?: CatalogExternalLinks;
  tcggoUrl?: string | null;
}) {
  const entries = [
    ['Cardmarket', links?.cardmarket],
    ['TCGPlayer', links?.tcgplayer],
    ['TCGGO', tcggoUrl],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  if (entries.length === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {entries.map(([label, href]) => (
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
  );
}
export function CardDetails({
  card: catalogCard,
  onClose,
}: {
  card?: CatalogCard | null;
  onClose: () => void;
}) {
  const services = useServices();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const detailId = catalogCard?.id ?? null;

  useEffect(() => {
    setSelectedVariantId(null);
    setQuantity(1);
  }, [detailId]);
  const cardQuery = useQuery({
    queryKey: ['card-detail', detailId],
    queryFn: ({ signal }) =>
      services.catalog.getById(
        catalogCard?.tcggoId ?? null,
        signal,
        catalogCard
          ? {
              cardNumber: catalogCard.card_number,
              catalogId: catalogCard.id,
              indexCard: catalogCard,
            }
          : undefined,
      ),
    enabled: Boolean(detailId),
    staleTime: 5 * 60 * 1000,
  });
  const baseCard = cardQuery.data;
  const selectedVariant =
    baseCard?.artworks.find((variant) => variant.id === selectedVariantId) ?? null;
  const variantQuery = useQuery({
    queryKey: ['card-variant-detail', selectedVariant?.external_id],
    queryFn: ({ signal }) =>
      services.catalog.getVariantById(selectedVariant?.external_id ?? '', signal),
    enabled: Boolean(selectedVariant?.external_id),
    staleTime: 5 * 60 * 1000,
  });
  const card = variantQuery.data ?? baseCard;

  useEffect(() => {
    if (!catalogCard || !baseCard || catalogCard.image === baseCard.image) return;
    const enrichedIndexCard: CatalogCard = {
      ...catalogCard,
      tcggoId: baseCard.external_id,
      image: baseCard.image,
      artist: baseCard.artist,
      cardmarket_id: baseCard.cardmarket_id,
      tcgplayer_id: baseCard.tcgplayer_id,
      tcgid: baseCard.tcgid,
      links: baseCard.links,
      tcggo_url: baseCard.tcggo_url,
      source: baseCard.source,
    };
    queryClient.setQueryData(['catalog-index-card', catalogCard.id], enrichedIndexCard);
    queryClient.setQueriesData<InfiniteData<PaginatedResult<CatalogCard>>>(
      { queryKey: ['catalog'] },
      (current) =>
        current
          ? {
              ...current,
              pages: current.pages.map((page) => ({
                ...page,
                items: page.items.map((item) =>
                  item.id === catalogCard.id ? enrichedIndexCard : item,
                ),
              })),
            }
          : current,
    );
  }, [baseCard, catalogCard, queryClient]);

  const collectionQuery = useQuery({
    queryKey: ['collection'],
    queryFn: () => services.collection.listCollection(),
    enabled: Boolean(detailId),
  });
  const addMutation = useMutation({
    mutationFn: async ({ card, variant }: { card: CardDetail; variant: CardVariant | null }) => {
      if (!catalogCard) throw new Error('No hay una carta de catálogo válida.');
      const timestamp = new Date().toISOString();
      const catalogVariant = resolveCatalogVariant(catalogCard, card, variant);
      if (variant && !catalogVariant)
        throw new Error('Esta variante todavía no está normalizada en el índice.');
      const candidate: Omit<CollectionEntry, 'ownerId'> = {
        id: crypto.randomUUID(),
        catalogCardId: catalogCard.id,
        catalogVariantId: catalogVariant?.id ?? null,
        quantity,
        language: variant?.language ?? card.game.language,
        condition: 'NEAR_MINT',
        favorite: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      const existing = collectionQuery.data?.find(
        (item) => collectionItemIdentity(item) === collectionItemIdentity(candidate),
      );
      const item = existing
        ? {
            ...existing,
            quantity: Math.min(999, existing.quantity + quantity),
            updatedAt: timestamp,
          }
        : candidate;
      const savedItem = await services.collection.saveCollection(item);
      return { savedItem, addedQuantity: quantity };
    },
    onSuccess: async ({ savedItem }) => {
      setQuantity(1);
      queryClient.setQueryData<CollectionItem[]>(['collection'], (items) => [
        savedItem,
        ...(items ?? []).filter((item) => item.id !== savedItem.id),
      ]);
      await queryClient.invalidateQueries({ queryKey: ['collection'] });
    },
  });

  const selectedImageUrl = variantQuery.data?.image ?? selectedVariant?.image ?? card?.image ?? '';
  const selectedLabel =
    variantQuery.data?.print?.label ??
    selectedVariant?.label ??
    card?.print?.label ??
    (card?.version ? `Versión ${card.version}` : 'Arte base');
  const selectedPrices = catalogPriceList(
    variantQuery.data?.prices ?? selectedVariant?.prices ?? card?.prices ?? {},
  );
  const selectedPriceDetails =
    variantQuery.data?.prices ?? selectedVariant?.prices ?? card?.prices ?? {};
  const selectedSource = variantQuery.data?.source ?? selectedVariant?.source ?? card?.source;
  const selectedLanguage =
    variantQuery.data?.game.language ?? selectedVariant?.language ?? card?.game.language;
  const selectedArtist = variantQuery.data?.artist ?? selectedVariant?.artist ?? card?.artist;
  const selectedVersion = variantQuery.data?.version ?? selectedVariant?.version ?? card?.version;
  const selectedCardmarketId =
    variantQuery.data?.cardmarket_id ?? selectedVariant?.cardmarket_id ?? card?.cardmarket_id;
  const selectedTcgplayerId =
    variantQuery.data?.tcgplayer_id ?? selectedVariant?.tcgplayer_id ?? card?.tcgplayer_id;
  const selectedTcgid = variantQuery.data?.tcgid ?? selectedVariant?.tcgid ?? card?.tcgid;
  const selectedLinks =
    variantQuery.data?.links ?? selectedVariant?.links ?? card?.links ?? catalogCard?.links;
  const selectedTcggoUrl =
    variantQuery.data?.tcggo_url ??
    selectedVariant?.tcggo_url ??
    card?.tcggo_url ??
    catalogCard?.tcggo_url;
  const cardmarket = selectedPriceDetails.cardmarket;
  const tcgplayer = selectedPriceDetails.tcgplayer;
  const secondaryCardmarketPriceRows = cardmarket
    ? [
        ['Mínimo Near Mint (Francia)', cardmarket.lowest_near_mint_FR],
        ['Mínimo Near Mint (UE)', cardmarket.lowest_near_mint_EU_only],
        ['Mínimo Near Mint (Francia/UE)', cardmarket.lowest_near_mint_FR_EU_only],
      ].filter((entry): entry is [string, number] => typeof entry[1] === 'number')
    : [];
  const detailSummary = card
    ? [
        card.game.card_type === 'UNKNOWN' ? 'Carta' : card.game.card_type,
        card.game.traits.length > 0 ? card.game.traits.join(' / ') : null,
        selectedLanguage,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';
  const selectedPrinting: CardVariant | null =
    selectedVariant && variantQuery.data
      ? {
          ...selectedVariant,
          id: variantQuery.data.id,
          external_id: variantQuery.data.external_id,
          image: variantQuery.data.image,
          language: variantQuery.data.game.language,
          prices: variantQuery.data.prices,
          artist: variantQuery.data.artist,
          cardmarket_id: variantQuery.data.cardmarket_id,
          tcgplayer_id: variantQuery.data.tcgplayer_id,
          tcgid: variantQuery.data.tcgid,
          links: variantQuery.data.links,
          tcggo_url: variantQuery.data.tcggo_url,
          source: variantQuery.data.source,
        }
      : selectedVariant;
  const selectedCatalogVariant =
    card && catalogCard ? resolveCatalogVariant(catalogCard, card, selectedPrinting) : null;
  const cardCollectionItems =
    collectionQuery.data?.filter((item) => item.catalogCardId === catalogCard?.id) ?? [];
  const ownedTotal = cardCollectionItems.reduce((sum, item) => sum + item.quantity, 0);
  const selectedOwnedTotal = cardCollectionItems
    .filter((item) => item.catalogVariantId === (selectedCatalogVariant?.id ?? null))
    .reduce((sum, item) => sum + item.quantity, 0);
  const copyLabel = quantity === 1 ? 'copia' : 'copias';
  const returnedPrintCount = baseCard
    ? (baseCard.printings?.length ?? baseCard.artworks.length + 1)
    : 0;
  const missingPrintCount = catalogCard
    ? Math.max(0, catalogCard.totalVariants - returnedPrintCount)
    : 0;

  return (
    <ResponsiveDialog
      open={Boolean(detailId)}
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
      ) : cardQuery.isError ? (
        <div className="grid gap-6 p-4 sm:grid-cols-[220px_1fr]">
          <CardImage
            src={catalogCard?.image ?? ''}
            alt={`Carta ${catalogCard?.name ?? ''}`}
            className="shadow-soft"
          />
          <div className="self-center">
            <p className="text-xs font-semibold text-slate-500">{catalogCard?.card_number}</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">{catalogCard?.name}</h2>
            <p role="alert" className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
              No se pudo cargar el detalle enriquecido desde TCGGO. Se muestra la información
              básica disponible en el índice.
            </p>
            <CatalogLinks links={catalogCard?.links} tcggoUrl={catalogCard?.tcggo_url} />
            <Button className="mt-4" variant="secondary" onClick={() => void cardQuery.refetch()}>
              Reintentar
            </Button>
          </div>
        </div>
      ) : !card ? (
        <p className="p-8 text-center text-slate-600">No se ha encontrado la carta.</p>
      ) : (
        <div className="grid gap-7 md:grid-cols-[260px_1fr]">
          <div>
            <div className="relative">
              <CardImage
                src={selectedImageUrl}
                alt={`Carta ${card.name} — ${selectedLabel}`}
                className="shadow-soft"
              />
              {variantQuery.isPending && selectedVariant && (
                <div className="absolute inset-0 grid place-items-center rounded-xl bg-white/75">
                  <OnePieceLoader size="lg" label="Cargando variante" />
                </div>
              )}
            </div>
            {(baseCard?.artworks.length ?? 0) > 0 && (
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
                      src={baseCard?.image ?? card.image}
                      alt=""
                      className="w-full"
                      showFailureText={false}
                    />
                  </button>
                  {baseCard?.artworks.map((variant) => (
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
                        src={variant.image}
                        alt=""
                        className="w-full"
                        showFailureText={false}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {missingPrintCount > 0 && (
              <p
                role="status"
                className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"
              >
                El índice registra {catalogCard?.totalVariants}{' '}
                {catalogCard?.totalVariants === 1 ? 'impresión' : 'impresiones'}, pero el detalle
                disponible devuelve {returnedPrintCount}. Pueden faltar {missingPrintCount}{' '}
                {missingPrintCount === 1 ? 'variante' : 'variantes'}.
              </p>
            )}
          </div>
          <div className="min-w-0 pt-2">
            <p className="text-xs font-semibold text-slate-500">{card.card_number}</p>
            <h2 className="mt-1 pr-10 text-2xl font-black text-slate-950">{card.name}</h2>
            <p className="mt-1 text-sm font-semibold text-violet">{selectedLabel}</p>
            <p className="mt-1 text-sm text-slate-600">{detailSummary}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {card.game.colors.map((color) => (
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
            {card.game.effect && (
              <div className="mt-5">
                <h3 className="text-xs font-bold uppercase text-slate-500">Efecto</h3>
                <p className="mt-2 text-sm leading-6 text-slate-800">{card.game.effect}</p>
              </div>
            )}
            {card.flavor_text && (
              <blockquote className="mt-5 border-l-4 border-violet/30 pl-4 text-sm italic leading-6 text-slate-600">
                {card.flavor_text}
              </blockquote>
            )}
            {card.game.trigger && (
              <div className="mt-5">
                <h3 className="text-xs font-bold uppercase text-slate-500">Trigger</h3>
                <p className="mt-2 text-sm leading-6 text-slate-800">{card.game.trigger}</p>
              </div>
            )}
            {card.game.don && (
              <div className="mt-5">
                <h3 className="text-xs font-bold uppercase text-slate-500">DON!!</h3>
                <p className="mt-2 text-sm leading-6 text-slate-800">{card.game.don}</p>
              </div>
            )}
            {(card.game.attributes.length > 0 || card.game.traits.length > 0) && (
              <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                {card.game.attributes.length > 0 && (
                  <div>
                    <dt className="text-xs font-bold uppercase text-slate-500">Atributos</dt>
                    <dd className="mt-1 text-sm text-slate-800">
                      {card.game.attributes.join(' / ')}
                    </dd>
                  </div>
                )}
                {card.game.traits.length > 0 && (
                  <div>
                    <dt className="text-xs font-bold uppercase text-slate-500">Tipos / rasgos</dt>
                    <dd className="mt-1 text-sm text-slate-800">{card.game.traits.join(' / ')}</dd>
                  </div>
                )}
              </dl>
            )}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Expansión</p>
                <div className="mt-1 flex items-center gap-3">
                  {card.episode.logo && (
                    <img
                      src={card.episode.logo}
                      alt=""
                      className="max-h-10 max-w-20 object-contain"
                    />
                  )}
                  <p className="text-sm font-semibold">{card.episode.name}</p>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  {card.episode.code}
                  {card.episode.released_at ? ` · ${card.episode.released_at}` : ''}
                </p>
                {card.episode.series && (
                  <p className="mt-1 text-xs text-slate-600">Serie: {card.episode.series.name}</p>
                )}
                {card.episode.game && (
                  <p className="mt-1 text-xs text-slate-600">Juego: {card.episode.game.name}</p>
                )}
                {(card.episode.cards_total !== undefined ||
                  card.episode.cards_printed_total !== undefined) && (
                  <p className="mt-1 text-xs text-slate-600">
                    {card.episode.cards_total ?? '–'} cartas ·{' '}
                    {card.episode.cards_printed_total ?? '–'} impresiones
                  </p>
                )}
                {card.episode.prices?.cardmarket && (
                  <p className="mt-1 text-xs text-slate-600">
                    Total set Cardmarket: {card.episode.prices.cardmarket.total.toFixed(2)}{' '}
                    {card.episode.prices.cardmarket.currency}
                  </p>
                )}
                {card.episode.prices?.tcgplayer && (
                  <p className="mt-1 text-xs text-slate-600">
                    Total set TCGPlayer: {card.episode.prices.tcgplayer.total.toFixed(2)}{' '}
                    {card.episode.prices.tcgplayer.currency}
                  </p>
                )}
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
            <div className="mt-3 rounded-xl border border-slate-200 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Datos de la impresión
              </h3>
              <dl className="mt-3 grid grid-cols-3 gap-x-3 gap-y-3 text-sm">
                {selectedVersion && (
                  <div>
                    <dt className="text-xs text-slate-500">Versión</dt>
                    <dd className="font-semibold">{selectedVersion}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-slate-500">Tipo API</dt>
                  <dd className="font-semibold">{card.type}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">ID de carta en la fuente</dt>
                  <dd className="font-semibold">{card.external_id}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">ID de expansión en la fuente</dt>
                  <dd className="font-semibold">{card.episode.id}</dd>
                </div>
                {selectedArtist && (
                  <div>
                    <dt className="text-xs text-slate-500">Artista</dt>
                    <dd className="font-semibold">{selectedArtist.name}</dd>
                  </div>
                )}
                {card.card_code_number && (
                  <div>
                    <dt className="text-xs text-slate-500">Código completo</dt>
                    <dd className="font-semibold">{card.card_code_number}</dd>
                  </div>
                )}
                {card.supertype && (
                  <div>
                    <dt className="text-xs text-slate-500">Supertipo</dt>
                    <dd className="font-semibold">{card.supertype}</dd>
                  </div>
                )}
                {card.hp !== null && card.hp !== undefined && (
                  <div>
                    <dt className="text-xs text-slate-500">HP</dt>
                    <dd className="font-semibold">{card.hp}</dd>
                  </div>
                )}
                {selectedCardmarketId !== null && selectedCardmarketId !== undefined && (
                  <div>
                    <dt className="text-xs text-slate-500">Cardmarket ID</dt>
                    <dd className="font-semibold">{selectedCardmarketId}</dd>
                  </div>
                )}
                {selectedTcgplayerId !== null && selectedTcgplayerId !== undefined && (
                  <div>
                    <dt className="text-xs text-slate-500">TCGPlayer ID</dt>
                    <dd className="font-semibold">{selectedTcgplayerId}</dd>
                  </div>
                )}
                {selectedTcgid !== null && selectedTcgid !== undefined && (
                  <div>
                    <dt className="text-xs text-slate-500">TCG ID</dt>
                    <dd className="font-semibold">{selectedTcgid}</dd>
                  </div>
                )}
              </dl>
              <CatalogLinks links={selectedLinks} tcggoUrl={selectedTcggoUrl} />
            </div>
            {(cardmarket ||
              (tcgplayer?.market_price !== null && tcgplayer?.market_price !== undefined)) && (
              <div className="mt-3 rounded-xl border border-slate-200 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Mercado de la impresión
                </h3>
                <dl className="mt-3 grid grid-cols-4 gap-x-2 gap-y-3 text-sm">
                  {[
                    ['Mínimo Near Mint', cardmarket?.lowest_near_mint],
                    ['Media 30 días', cardmarket?.average_30d],
                    ['Media 7 días', cardmarket?.average_7d],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="min-w-0">
                      <dt className="text-[11px] leading-tight text-slate-500">{label}</dt>
                      <dd className="mt-1 break-words font-semibold">
                        {typeof value === 'number'
                          ? `${value.toFixed(2)} ${cardmarket?.currency ?? ''}`.trim()
                          : '–'}
                      </dd>
                    </div>
                  ))}
                  <div className="min-w-0">
                    <dt className="text-[11px] leading-tight text-slate-500">Disponibles</dt>
                    <dd className="mt-1 font-semibold">{cardmarket?.available_items ?? '–'}</dd>
                  </div>
                </dl>
                <dl className="mt-4 grid grid-cols-3 gap-x-3 gap-y-3 border-t border-slate-100 pt-4 text-sm">
                  {secondaryCardmarketPriceRows.map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <dt className="text-[11px] leading-tight text-slate-500">{label}</dt>
                      <dd className="mt-1 break-words font-semibold">
                        {value.toFixed(2)} {cardmarket?.currency}
                      </dd>
                    </div>
                  ))}
                  {tcgplayer?.market_price !== null && tcgplayer?.market_price !== undefined && (
                    <div className="min-w-0">
                      <dt className="text-[11px] leading-tight text-slate-500">
                        TCGPlayer — precio de mercado
                      </dt>
                      <dd className="mt-1 break-words font-semibold">
                        {tcgplayer.market_price.toFixed(2)} {tcgplayer.currency}
                      </dd>
                    </div>
                  )}
                  {cardmarket?.graded?.map((graded) => (
                    <div key={graded.grade} className="min-w-0">
                      <dt className="text-[11px] leading-tight text-slate-500">
                        Graduada {graded.grade}
                      </dt>
                      <dd className="mt-1 break-words font-semibold">
                        {graded.price.toFixed(2)} {cardmarket.currency}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            {config.VITE_SHOW_CATALOG_NORMALIZATION && (
              <div className="mt-3 rounded-xl bg-violet/5 px-4 py-3 text-xs text-slate-700">
                <p className="font-bold">Normalización: {card.enrichment.status}</p>
                <p className="mt-1">
                  Proveedores: {card.enrichment.providers.join(' + ')}
                  {card.enrichment.fields.length > 0
                    ? ` · ${card.enrichment.fields.length} campos enriquecidos`
                    : ''}
                </p>
                {card.enrichment.conflicts.map((conflict) => (
                  <p key={conflict} className="mt-1 font-semibold text-amber-800">
                    {conflict}
                  </p>
                ))}
                {Object.keys(card.enrichment.provenance).length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer font-semibold">
                      Procedencia por campo
                    </summary>
                    <ul className="mt-2 space-y-1">
                      {Object.entries(card.enrichment.provenance).map(([field, provenance]) => (
                        <li key={field}>
                          {field}: {provenance.providerId} · {provenance.sourceField} ·{' '}
                          {provenance.confidence}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}
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
                    {(baseCard?.artworks.length ?? 0) > 0 && (
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
                Se han añadido {addMutation.data.addedQuantity}{' '}
                {addMutation.data.addedQuantity === 1 ? 'copia' : 'copias'} de{' '}
                {addMutation.data.savedItem.variant?.label ?? 'Arte base'}.
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
                onClick={() => addMutation.mutate({ card, variant: selectedPrinting })}
                disabled={addMutation.isPending || variantQuery.isPending}
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
              {selectedSource?.providerId ?? 'desconocida'}
            </div>
          </div>
        </div>
      )}
    </ResponsiveDialog>
  );
}
