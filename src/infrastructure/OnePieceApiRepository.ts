import type { Card, CatalogCriteria, PaginatedResult } from '../domain/models';
import type { CatalogRepository } from './repositories';
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
    const result = await this.request<OnePieceApiList<unknown>>(params, signal);
    const cards = result.data.filter(isOnePieceApiCard);
    return {
      items: cards.map((card) => mapApiCard(card)),
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
    const relatedResult = await this.request<OnePieceApiList<unknown>>(
      new URLSearchParams({
        resource: 'cards',
        card_number: detail.card_number,
        per_page: '100',
      }),
      signal,
    );
    const related = relatedResult.data.filter(isOnePieceApiCard);
    return mapApiCard(detail, related);
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
