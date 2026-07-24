import type {
  Card,
  CatalogCriteria,
  CollectionItem,
  Deck,
  PaginatedResult,
} from '../domain/models';
import { initialCollection, initialDecks, mockCards } from './mockData';

export interface CatalogRepository {
  search(criteria: CatalogCriteria, signal?: AbortSignal): Promise<PaginatedResult<Card>>;
  getById(id: string, signal?: AbortSignal): Promise<Card | null>;
}

export interface PrivateRepository {
  listCollection(): Promise<CollectionItem[]>;
  saveCollection(item: CollectionItem): Promise<CollectionItem>;
  removeCollection(id: string): Promise<void>;
  listDecks(): Promise<Deck[]>;
  saveDeck(deck: Deck): Promise<Deck>;
}

const delay = async (signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const timeout = window.setTimeout(resolve, 180);
    signal?.addEventListener('abort', () => {
      window.clearTimeout(timeout);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });

function getPrice(card: Card): number {
  return card.prices[0]?.amount ?? Number.MAX_SAFE_INTEGER;
}

export class MockCatalogRepository implements CatalogRepository {
  async search(criteria: CatalogCriteria, signal?: AbortSignal): Promise<PaginatedResult<Card>> {
    await delay(signal);
    const query = criteria.query.toLocaleLowerCase();
    const filtered = mockCards
      .filter(
        (card) =>
          (!query ||
            card.name.toLocaleLowerCase().includes(query) ||
            card.code.toLocaleLowerCase().includes(query)) &&
          (!criteria.setCode || card.set.code === criteria.setCode) &&
          (!criteria.color || card.colors.includes(criteria.color)) &&
          (!criteria.type || card.type === criteria.type) &&
          (!criteria.rarity || card.rarity === criteria.rarity) &&
          (!criteria.variant ||
            (criteria.variant === 'BASE'
              ? true
              : card.variants.some((variant) => variant.type === criteria.variant))) &&
          (criteria.minCost === undefined || (card.cost ?? 0) >= criteria.minCost) &&
          (criteria.maxCost === undefined || (card.cost ?? 0) <= criteria.maxCost) &&
          (criteria.minPower === undefined || (card.power ?? 0) >= criteria.minPower) &&
          (criteria.maxPower === undefined || (card.power ?? 0) <= criteria.maxPower),
      )
      .sort((a, b) => {
        const av =
          criteria.sort === 'price'
            ? getPrice(a)
            : criteria.sort === 'power'
              ? (a.power ?? 0)
              : criteria.sort === 'cost'
                ? (a.cost ?? 0)
                : a[criteria.sort];
        const bv =
          criteria.sort === 'price'
            ? getPrice(b)
            : criteria.sort === 'power'
              ? (b.power ?? 0)
              : criteria.sort === 'cost'
                ? (b.cost ?? 0)
                : b[criteria.sort];
        const result = typeof av === 'number' ? av - Number(bv) : String(av).localeCompare(String(bv));
        return criteria.direction === 'asc' ? result : -result;
      });
    const offset = (criteria.page - 1) * criteria.pageSize;
    return {
      items: filtered.slice(offset, offset + criteria.pageSize),
      page: criteria.page,
      pageSize: criteria.pageSize,
      total: filtered.length,
      meta: { provider: 'MOCK', fallbackUsed: false, cached: true, partialData: false },
    };
  }

  async getById(id: string, signal?: AbortSignal): Promise<Card | null> {
    await delay(signal);
    return mockCards.find((card) => card.id === id) ?? null;
  }
}

export class AppsScriptCatalogRepository implements CatalogRepository {
  constructor(private readonly baseUrl: string) {}

  async search(criteria: CatalogCriteria, signal?: AbortSignal): Promise<PaginatedResult<Card>> {
    const params = new URLSearchParams({
      resource: 'cards',
      query: criteria.query,
      set: criteria.setCode,
      color: criteria.color,
      type: criteria.type,
      rarity: criteria.rarity,
      variant: criteria.variant,
      sort: criteria.sort,
      direction: criteria.direction,
      page: String(criteria.page),
      pageSize: String(criteria.pageSize),
    });
    const response = await fetch(`${this.baseUrl}?${params.toString()}`, { signal });
    if (!response.ok) throw new Error('No se pudo cargar el catálogo.');
    const payload: { success: boolean; data?: PaginatedResult<Card>; error?: { message: string } } =
      await response.json();
    if (!payload.success || !payload.data)
      throw new Error(payload.error?.message ?? 'Respuesta de catálogo inválida.');
    return payload.data;
  }

  async getById(id: string, signal?: AbortSignal): Promise<Card | null> {
    const response = await fetch(
      `${this.baseUrl}?${new URLSearchParams({ resource: 'card', id })}`,
      { signal },
    );
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('No se pudo cargar la carta.');
    const payload: { success: boolean; data?: Card } = await response.json();
    return payload.data ?? null;
  }
}

const collectionKey = 'grand-line-vault:mock-collection';
const decksKey = 'grand-line-vault:mock-decks';

function read<T>(key: string, fallback: T): T {
  const value = localStorage.getItem(key);
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export class MockPrivateRepository implements PrivateRepository {
  async listCollection(): Promise<CollectionItem[]> {
    return read(collectionKey, initialCollection);
  }

  async saveCollection(item: CollectionItem): Promise<CollectionItem> {
    const items = await this.listCollection();
    const existing = items.findIndex((entry) => entry.id === item.id);
    const next = [...items];
    if (existing >= 0) next[existing] = item;
    else next.push(item);
    localStorage.setItem(collectionKey, JSON.stringify(next));
    return item;
  }

  async removeCollection(id: string): Promise<void> {
    const items = await this.listCollection();
    localStorage.setItem(collectionKey, JSON.stringify(items.filter((item) => item.id !== id)));
  }

  async listDecks(): Promise<Deck[]> {
    return read(decksKey, initialDecks);
  }

  async saveDeck(deck: Deck): Promise<Deck> {
    const decks = await this.listDecks();
    const existing = decks.findIndex((entry) => entry.id === deck.id);
    const next = [...decks];
    if (existing >= 0) next[existing] = deck;
    else next.push(deck);
    localStorage.setItem(decksKey, JSON.stringify(next));
    return deck;
  }
}

export class ApiPrivateRepository implements PrivateRepository {
  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers);
    headers.set('Content-Type', 'application/json');
    const response = await fetch(path, {
      ...init,
      headers,
    });
    if (!response.ok) throw new Error('No se pudo completar la operación.');
    const payload: { data: T } = await response.json();
    return payload.data;
  }

  listCollection(): Promise<CollectionItem[]> {
    return this.request('/api/collection');
  }
  saveCollection(item: CollectionItem): Promise<CollectionItem> {
    return this.request(`/api/collection/${encodeURIComponent(item.id)}`, {
      method: 'PATCH',
      body: JSON.stringify(item),
    });
  }
  async removeCollection(id: string): Promise<void> {
    await this.request(`/api/collection/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }
  listDecks(): Promise<Deck[]> {
    return this.request('/api/decks');
  }
  saveDeck(deck: Deck): Promise<Deck> {
    return this.request(`/api/decks/${encodeURIComponent(deck.id)}`, {
      method: 'PATCH',
      body: JSON.stringify(deck),
    });
  }
}
