import type {
  CardDetail,
  CatalogCard,
  CatalogCriteria,
  CatalogEpisode,
  PaginatedResult,
} from '../domain/models';
import type { CatalogRepository } from '../domain/repositories';
import { config } from '../app/config';
import { isOnePieceApiCard, mapApiCard, type OnePieceApiCard } from './onePieceApi';
import { ExpiringLocalCache } from './cache/ExpiringCache';

interface ApiEnvelope<T> {
  data: T;
}

interface DetailPayload {
  card: OnePieceApiCard;
  variants: OnePieceApiCard[];
}

function isCatalogCard(value: unknown): value is CatalogCard {
  if (!value || typeof value !== 'object') return false;
  const card = value as Partial<CatalogCard>;
  return (
    typeof card.id === 'string' &&
    (typeof card.tcggoId === 'string' || card.tcggoId === null) &&
    typeof card.name === 'string' &&
    typeof card.normalizedName === 'string' &&
    typeof card.card_number === 'string' &&
    typeof card.normalized_card_number === 'string' &&
    typeof card.image === 'string' &&
    Boolean(card.episode) &&
    typeof card.episode?.code === 'string' &&
    Array.isArray(card.setCodes) &&
    Boolean(card.game) &&
    Array.isArray(card.game?.colors) &&
    Array.isArray(card.variantTypes) &&
    typeof card.variantCount === 'number' &&
    typeof card.totalVariants === 'number' &&
    (!card.links ||
      ((typeof card.links.cardmarket === 'string' || card.links.cardmarket == null) &&
        (typeof card.links.tcgplayer === 'string' || card.links.tcgplayer == null))) &&
    (typeof card.tcggo_url === 'string' || card.tcggo_url == null)
  );
}

async function readJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  const body = (await response.json().catch(() => null)) as
    ApiEnvelope<T> | { error?: { message?: string } } | null;
  if (!response.ok) {
    throw new Error(
      body && 'error' in body && body.error?.message
        ? body.error.message
        : 'No se pudo consultar el catálogo.',
    );
  }
  return body && 'data' in body ? body.data : (body as T);
}

export class HybridCatalogRepository implements CatalogRepository {
  private readonly cache = new ExpiringLocalCache<CardDetail>(
    'grand-line-vault:tcggo-card',
    config.VITE_CARD_DETAIL_CACHE_TTL_MS,
  );

  async search(
    criteria: CatalogCriteria,
    signal?: AbortSignal,
  ): Promise<PaginatedResult<CatalogCard>> {
    const params = new URLSearchParams({
      action: 'index',
      resource: 'cards',
      query: criteria.query,
      set: criteria.setCode,
      color: criteria.color,
      type: criteria.type,
      rarity: criteria.rarity,
      variant: criteria.variant,
      sort: criteria.sort,
      direction: criteria.direction,
      pageSize: String(criteria.pageSize),
    });
    if (criteria.cursor) params.set('cursor', criteria.cursor);
    if (criteria.minCost !== undefined) params.set('minCost', String(criteria.minCost));
    if (criteria.maxCost !== undefined) params.set('maxCost', String(criteria.maxCost));
    if (criteria.minPower !== undefined) params.set('minPower', String(criteria.minPower));
    if (criteria.maxPower !== undefined) params.set('maxPower', String(criteria.maxPower));
    const result = await readJson<PaginatedResult<unknown>>(`/api/catalog?${params}`, signal);
    if (!result.items.every(isCatalogCard)) {
      throw new Error('El índice de catálogo contiene datos no válidos.');
    }
    return { ...result, items: result.items };
  }

  listSets(signal?: AbortSignal): Promise<CatalogEpisode[]> {
    return readJson('/api/catalog?action=index&resource=sets', signal);
  }

  async getIndexCard(catalogId: string, signal?: AbortSignal): Promise<CatalogCard | null> {
    const card = await readJson<unknown>(
      `/api/catalog?action=index&resource=card&id=${encodeURIComponent(catalogId)}`,
      signal,
    );
    if (card === null) return null;
    if (!isCatalogCard(card)) throw new Error('La carta del índice no es válida.');
    return card;
  }

  async getById(
    tcggoId: string | null,
    signal?: AbortSignal,
    fallback?: {
      cardNumber: string;
      catalogId: string;
      indexCard?: CatalogCard;
    },
  ): Promise<CardDetail | null> {
    const cacheKey = tcggoId ?? fallback?.catalogId ?? fallback?.cardNumber ?? '';
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    const params = new URLSearchParams({ action: 'detail' });
    if (tcggoId) params.set('id', tcggoId);
    if (fallback) {
      params.set('cardNumber', fallback.cardNumber);
      params.set('catalogId', fallback.catalogId);
    }
    const payload = await readJson<DetailPayload>(`/api/catalog?${params}`, signal);
    if (!isOnePieceApiCard(payload.card)) return null;
    const variants = payload.variants.filter(isOnePieceApiCard);
    const detail = mapApiCard(payload.card, variants);
    this.cache.set(cacheKey, detail);
    this.cache.set(detail.external_id, detail);
    return detail;
  }

  async getVariantById(tcggoId: string, signal?: AbortSignal): Promise<CardDetail | null> {
    const cacheKey = `variant:${tcggoId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    const params = new URLSearchParams({ action: 'detail', id: tcggoId, related: 'false' });
    const payload = await readJson<DetailPayload>(`/api/catalog?${params}`, signal);
    if (!isOnePieceApiCard(payload.card)) return null;
    const detail = mapApiCard(payload.card, []);
    this.cache.set(cacheKey, detail);
    return detail;
  }
}
