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
  type OnePieceApiEpisode,
  type OnePieceApiList,
} from './onePieceApi';

interface ApiEnvelope<T> {
  data: T;
}

function apiSort(criteria: CatalogCriteria): string {
  if (criteria.sort === 'price')
    return criteria.direction === 'asc' ? 'price_lowest' : 'price_highest';
  return criteria.direction === 'asc' ? 'card_number_lowest' : 'card_number_highest';
}

export class OnePieceApiRepository implements CatalogRepository {
  private staticIndexPromise: Promise<Map<string, StaticCatalogCard[]>> | null = null;

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
    const detailResult = await this.request<{ data: unknown }>(
      new URLSearchParams({ resource: 'card', id: externalId }),
      signal,
    );
    const detail = detailResult.data;
    if (!isOnePieceApiCard(detail))
      throw new Error('La carta recibida no tiene un formato válido.');
    const [relatedResult, staticIndex] = await Promise.all([
      this.request<OnePieceApiList<unknown>>(
        new URLSearchParams({
          resource: 'cards',
          card_number: detail.card_number,
          per_page: '100',
        }),
        signal,
      ),
      this.staticIndex(),
    ]);
    const related = relatedResult.data.filter(isOnePieceApiCard);
    return mapApiCard(detail, related, this.staticMatches(detail, staticIndex));
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
