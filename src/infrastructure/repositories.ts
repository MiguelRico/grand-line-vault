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
  listSets(signal?: AbortSignal): Promise<Card['episode'][]>;
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
  return (
    card.prices.cardmarket?.lowest_near_mint ??
    card.prices.tcgplayer?.market_price ??
    Number.MAX_SAFE_INTEGER
  );
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
            card.card_number.toLocaleLowerCase().includes(query)) &&
          (!criteria.setCode || card.episode.id === criteria.setCode) &&
          (!criteria.color || card.game.colors.includes(criteria.color)) &&
          (!criteria.type || card.game.card_type === criteria.type) &&
          (!criteria.rarity || card.rarity === criteria.rarity) &&
          (!criteria.variant ||
            criteria.variant === 'BASE' ||
            card.artworks.some((variant) => variant.variant_type === criteria.variant)) &&
          (criteria.minCost === undefined || (card.game.cost ?? 0) >= criteria.minCost) &&
          (criteria.maxCost === undefined || (card.game.cost ?? 0) <= criteria.maxCost) &&
          (criteria.minPower === undefined || (card.game.power ?? 0) >= criteria.minPower) &&
          (criteria.maxPower === undefined || (card.game.power ?? 0) <= criteria.maxPower),
      )
      .sort((left, right) => {
        const leftValue =
          criteria.sort === 'price'
            ? getPrice(left)
            : criteria.sort === 'power'
              ? (left.game.power ?? 0)
              : criteria.sort === 'cost'
                ? (left.game.cost ?? 0)
                : criteria.sort === 'code'
                  ? left.card_number
                  : left.name;
        const rightValue =
          criteria.sort === 'price'
            ? getPrice(right)
            : criteria.sort === 'power'
              ? (right.game.power ?? 0)
              : criteria.sort === 'cost'
                ? (right.game.cost ?? 0)
                : criteria.sort === 'code'
                  ? right.card_number
                  : right.name;
        const comparison =
          typeof leftValue === 'number'
            ? leftValue - Number(rightValue)
            : String(leftValue).localeCompare(String(rightValue));
        return criteria.direction === 'asc' ? comparison : -comparison;
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

  async listSets(signal?: AbortSignal): Promise<Card['episode'][]> {
    await delay(signal);
    return [...new Map(mockCards.map((card) => [card.episode.id, card.episode])).values()];
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
    const response = await fetch(path, { ...init, headers });
    if (!response.ok) throw new Error('No se pudo completar la operación.');
    const payload = (await response.json()) as { data: T };
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
