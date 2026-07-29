import type { SalesPack, StorageBox } from '../domain/models';

export interface OrganizationRepository {
  listBoxes(): Promise<StorageBox[]>;
  saveBox(box: StorageBox): Promise<StorageBox>;
  removeBox(id: string): Promise<void>;
  listSalesPacks(): Promise<SalesPack[]>;
  saveSalesPack(pack: SalesPack): Promise<SalesPack>;
  removeSalesPack(id: string): Promise<void>;
}

function read<T>(key: string, fallback: T): T {
  const value = localStorage.getItem(key);
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export class LocalOrganizationRepository implements OrganizationRepository {
  constructor(private readonly ownerId: string) {}

  private key(resource: 'boxes' | 'sales-packs') {
    return `grand-line-vault:${this.ownerId}:${resource}`;
  }

  async listBoxes(): Promise<StorageBox[]> {
    return read<StorageBox[]>(this.key('boxes'), []);
  }

  async saveBox(box: StorageBox): Promise<StorageBox> {
    const boxes = await this.listBoxes();
    const existing = boxes.findIndex((entry) => entry.id === box.id);
    const next = [...boxes];
    if (existing >= 0) next[existing] = box;
    else next.push(box);
    localStorage.setItem(this.key('boxes'), JSON.stringify(next));
    return box;
  }

  async removeBox(id: string): Promise<void> {
    const boxes = await this.listBoxes();
    localStorage.setItem(
      this.key('boxes'),
      JSON.stringify(boxes.filter((box) => box.id !== id)),
    );
  }

  async listSalesPacks(): Promise<SalesPack[]> {
    return read<SalesPack[]>(this.key('sales-packs'), []);
  }

  async saveSalesPack(pack: SalesPack): Promise<SalesPack> {
    const packs = await this.listSalesPacks();
    const existing = packs.findIndex((entry) => entry.id === pack.id);
    const next = [...packs];
    if (existing >= 0) next[existing] = pack;
    else next.push(pack);
    localStorage.setItem(this.key('sales-packs'), JSON.stringify(next));
    return pack;
  }

  async removeSalesPack(id: string): Promise<void> {
    const packs = await this.listSalesPacks();
    localStorage.setItem(
      this.key('sales-packs'),
      JSON.stringify(packs.filter((pack) => pack.id !== id)),
    );
  }
}
