import type { Card, CatalogCriteria, PaginatedResult } from '../domain/models';
import type { CatalogRepository } from './repositories';
import { normalizeCardNumber, normalizeExpansionCode } from '../domain/catalogNormalization';
import {
  loadStaticCatalog,
  type LoadedStaticCatalog,
  type StaticCatalogCard,
} from './staticCatalog';
import {
  isOnePieceApiCard,
  isOnePieceApiEpisode,
  mapApiCard,
  mapApiEpisode,
  type OnePieceApiCard,
  type OnePieceApiEpisode,
  type OnePieceApiList,
} from './onePieceApi';

interface ApiEnvelope<T> {
  data: T;
}

interface TimedCacheEntry<T> {
  value: T;
  expiresAt: number;
}

const CARD_CACHE_TTL = 5 * 60 * 1000;

function apiSort(criteria: CatalogCriteria): string {
  if (criteria.sort === 'price')
    return criteria.direction === 'asc' ? 'price_lowest' : 'price_highest';
  return criteria.direction === 'asc' ? 'card_number_lowest' : 'card_number_highest';
}

export class OnePieceApiRepository implements CatalogRepository {
  private staticIndexPromise: Promise<Map<string, StaticCatalogCard[]>> | null = null;
  private readonly detailCache = new Map<string, TimedCacheEntry<OnePieceApiCard>>();
  private readonly relatedCache = new Map<string, TimedCacheEntry<OnePieceApiCard[]>>();
  private readonly relatedRequests = new Map<string, Promise<OnePieceApiCard[]>>();

  constructor(
    private readonly staticCatalogLoader: () => Promise<LoadedStaticCatalog> = loadStaticCatalog,
  ) {}

  private staticIndex(): Promise<Map<string, StaticCatalogCard[]>> {
    this.staticIndexPromise ??= this.staticCatalogLoader()
      .then((catalog) => {
        const index = new Map<string, StaticCatalogCard[]>();
        catalog.cards.forEach((card) => {
          const key = normalizeCardNumber(card.cardNumber);
          index.set(key, [...(index.get(key) ?? []), card]);
        });
        return index;
      })
      .catch(() => new Map());
    return this.staticIndexPromise;
  }

  private staticMatches(
    card: { card_number: string; name: string; episode: { code: string } },
    index: Map<string, StaticCatalogCard[]>,
  ): StaticCatalogCard[] {
    const candidates = index.get(normalizeCardNumber(card.card_number)) ?? [];
    const expansionCode = normalizeExpansionCode(card.episode.code);
    const expansionMatches = candidates.filter((candidate) =>
      candidate.sets.some(
        (set) =>
          normalizeExpansionCode(set.id) === expansionCode ||
          normalizeExpansionCode(set.sourceSeriesId) === expansionCode,
      ),
    );
    const expansionCompatible = expansionMatches.length > 0 ? expansionMatches : candidates;
    const normalizedName = card.name.toLocaleUpperCase().replace(/[^A-Z0-9]/g, '');
    return expansionCompatible.filter(
      (candidate) =>
        candidate.name.toLocaleUpperCase().replace(/[^A-Z0-9]/g, '') === normalizedName,
    );
  }

  private async request<T>(params: URLSearchParams, signal?: AbortSignal): Promise<T> {
    params.set('action', 'one-piece');
    const response = await fetch(`/api/catalog?${params}`, { signal });
    const payload = (await response.json().catch(() => null)) as
      ApiEnvelope<T> | { error?: { message?: string } } | null;
    if (!response.ok) {
      const message = payload && 'error' in payload ? payload.error?.message : undefined;
      throw new Error(message ?? 'No se pudo consultar One Piece API.');
    }
    if (!payload || !('data' in payload))
      throw new Error('La respuesta del catálogo no es válida.');
    return payload.data;
  }

  private cached<T>(cache: Map<string, TimedCacheEntry<T>>, key: string): T | undefined {
    const entry = cache.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  private cacheDetails(cards: OnePieceApiCard[]): void {
    const expiresAt = Date.now() + CARD_CACHE_TTL;
    cards.forEach((card) =>
      this.detailCache.set(String(card.id), {
        value: card,
        expiresAt,
      }),
    );
  }

  private async cardDetail(externalId: string, signal?: AbortSignal): Promise<OnePieceApiCard> {
    const cached = this.cached(this.detailCache, externalId);
    if (cached) return cached;
    const result = await this.request<{ data: unknown }>(
      new URLSearchParams({ resource: 'card', id: externalId }),
      signal,
    );
    if (!isOnePieceApiCard(result.data))
      throw new Error('La carta recibida no tiene un formato válido.');
    this.cacheDetails([result.data]);
    return result.data;
  }

  private async relatedCards(
    detail: OnePieceApiCard,
    staticMatches: StaticCatalogCard[],
    signal?: AbortSignal,
  ): Promise<OnePieceApiCard[]> {
    if (staticMatches.length === 1 && staticMatches[0]?.variant.type === 'base' && !detail.version)
      return [detail];
    const key = normalizeCardNumber(detail.card_number);
    const cached = this.cached(this.relatedCache, key);
    if (cached) return cached;
    const inFlight = this.relatedRequests.get(key);
    if (inFlight) return inFlight;
    const request = this.request<OnePieceApiList<unknown>>(
      new URLSearchParams({
        resource: 'cards',
        card_number: detail.card_number,
        per_page: '100',
      }),
      signal,
    )
      .then((result) => {
        const cards = result.data.filter(isOnePieceApiCard);
        this.cacheDetails(cards);
        this.relatedCache.set(key, {
          value: cards,
          expiresAt: Date.now() + CARD_CACHE_TTL,
        });
        return cards;
      })
      .finally(() => this.relatedRequests.delete(key));
    this.relatedRequests.set(key, request);
    return request;
  }

  async search(criteria: CatalogCriteria, signal?: AbortSignal): Promise<PaginatedResult<Card>> {
    const params = new URLSearchParams({
      resource: 'cards',
      page: String(criteria.page),
      per_page: String(criteria.pageSize),
      sort: apiSort(criteria),
    });
    if (criteria.query) params.set('search', criteria.query);
    if (criteria.setCode) params.set('episode_id', criteria.setCode);
    const [result, staticIndex] = await Promise.all([
      this.request<OnePieceApiList<unknown>>(params, signal),
      this.staticIndex(),
    ]);
    const cards = result.data.filter(isOnePieceApiCard);
    this.cacheDetails(cards);
    return {
      items: cards.map((card) => mapApiCard(card, [], this.staticMatches(card, staticIndex))),
      page: result.paging?.current ?? criteria.page,
      pageSize: result.paging?.per_page ?? criteria.pageSize,
      total: result.results ?? cards.length,
      meta: {
        provider: 'ONE_PIECE_API',
        fallbackUsed: false,
        cached: false,
        partialData: cards.length !== result.data.length,
      },
    };
  }

  async getById(id: string, signal?: AbortSignal): Promise<Card | null> {
    const externalId = id.replace(/^ONE_PIECE_API::/, '');
    if (!/^\d+$/.test(externalId)) return null;
    const [detail, staticIndex] = await Promise.all([
      this.cardDetail(externalId, signal),
      this.staticIndex(),
    ]);
    const staticMatches = this.staticMatches(detail, staticIndex);
    const related = await this.relatedCards(detail, staticMatches, signal);
    return mapApiCard(detail, related, staticMatches);
  }

  async listSets(signal?: AbortSignal): Promise<Card['episode'][]> {
    const first = await this.request<OnePieceApiList<unknown>>(
      new URLSearchParams({ resource: 'episodes', page: '1' }),
      signal,
    );
    const episodes: OnePieceApiEpisode[] = first.data.filter(isOnePieceApiEpisode);
    const pages = Math.min(first.paging?.total ?? 1, 20);
    for (let page = 2; page <= pages; page += 1) {
      const next = await this.request<OnePieceApiList<unknown>>(
        new URLSearchParams({ resource: 'episodes', page: String(page) }),
        signal,
      );
      episodes.push(...next.data.filter(isOnePieceApiEpisode));
    }
    return episodes.map(mapApiEpisode);
  }
}
