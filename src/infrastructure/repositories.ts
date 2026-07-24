import type {
  Card,
  CatalogCriteria,
  CollectionItem,
  PaginatedResult,
  SalesPack,
  StorageBox,
} from '../domain/models';
import { initialBoxes, initialCollection, initialSalesPacks, mockCards } from './mockData';

export interface CatalogRepository {
  search(criteria: CatalogCriteria, signal?: AbortSignal): Promise<PaginatedResult<Card>>;
  getById(id: string, signal?: AbortSignal): Promise<Card | null>;
}

export interface PrivateRepository {
  listCollection(): Promise<CollectionItem[]>;
  saveCollection(item: CollectionItem): Promise<CollectionItem>;
  removeCollection(id: string): Promise<void>;
  listBoxes(): Promise<StorageBox[]>;
  saveBox(box: StorageBox): Promise<StorageBox>;
  removeBox(id: string): Promise<void>;
  listSalesPacks(): Promise<SalesPack[]>;
  saveSalesPack(pack: SalesPack): Promise<SalesPack>;
  removeSalesPack(id: string): Promise<void>;
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
    const payload: {
      success: boolean;
      data?: Omit<PaginatedResult<Card>, 'meta'>;
      meta?: PaginatedResult<Card>['meta'];
      error?: { message: string };
    } = await response.json();
    if (!payload.success || !payload.data || !payload.meta)
      throw new Error(payload.error?.message ?? 'Respuesta de catálogo inválida.');
    return { ...payload.data, meta: payload.meta };
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
const boxesKey = 'grand-line-vault:mock-boxes';
const packsKey = 'grand-line-vault:mock-sales-packs';

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

  async listBoxes(): Promise<StorageBox[]> {
    return read(boxesKey, initialBoxes);
  }

  async saveBox(box: StorageBox): Promise<StorageBox> {
    const boxes = await this.listBoxes();
    const existing = boxes.findIndex((entry) => entry.id === box.id);
    const next = [...boxes];
    if (existing >= 0) next[existing] = box;
    else next.push(box);
    localStorage.setItem(boxesKey, JSON.stringify(next));
    return box;
  }

  async removeBox(id: string): Promise<void> {
    const boxes = await this.listBoxes();
    localStorage.setItem(boxesKey, JSON.stringify(boxes.filter((box) => box.id !== id)));
  }

  async listSalesPacks(): Promise<SalesPack[]> {
    return read(packsKey, initialSalesPacks);
  }

  async saveSalesPack(pack: SalesPack): Promise<SalesPack> {
    const packs = await this.listSalesPacks();
    const existing = packs.findIndex((entry) => entry.id === pack.id);
    const next = [...packs];
    if (existing >= 0) next[existing] = pack;
    else next.push(pack);
    localStorage.setItem(packsKey, JSON.stringify(next));
    return pack;
  }

  async removeSalesPack(id: string): Promise<void> {
    const packs = await this.listSalesPacks();
    localStorage.setItem(packsKey, JSON.stringify(packs.filter((pack) => pack.id !== id)));
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
  listBoxes(): Promise<StorageBox[]> {
    return this.request('/api/boxes');
  }
  saveBox(box: StorageBox): Promise<StorageBox> {
    return this.request(`/api/boxes/${encodeURIComponent(box.id)}`, {
      method: 'PATCH',
      body: JSON.stringify(box),
    });
  }
  async removeBox(id: string): Promise<void> {
    await this.request(`/api/boxes/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }
  listSalesPacks(): Promise<SalesPack[]> {
    return this.request('/api/sales-packs');
  }
  saveSalesPack(pack: SalesPack): Promise<SalesPack> {
    return this.request(`/api/sales-packs/${encodeURIComponent(pack.id)}`, {
      method: 'PATCH',
      body: JSON.stringify(pack),
    });
  }
  async removeSalesPack(id: string): Promise<void> {
    await this.request(`/api/sales-packs/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }
}
