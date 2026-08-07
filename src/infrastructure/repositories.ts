import type { SalesPack, StorageBox } from '../domain/models';
import { salesPackSchema, storageBoxSchema } from '../domain/organizationSchema';

export interface OrganizationRepository {
  listBoxes(): Promise<StorageBox[]>;
  saveBox(box: StorageBox): Promise<StorageBox>;
  removeBox(id: string): Promise<void>;
  listSalesPacks(): Promise<SalesPack[]>;
  saveSalesPack(pack: SalesPack): Promise<SalesPack>;
  removeSalesPack(id: string): Promise<void>;
}

function read(key: string): unknown[] {
  const value = localStorage.getItem(key);
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export class LocalOrganizationRepository implements OrganizationRepository {
  constructor(private readonly ownerId: string) {}

  private key(resource: 'boxes' | 'sales-packs') {
    return `grand-line-vault:${this.ownerId}:${resource}`;
  }

  async listBoxes(): Promise<StorageBox[]> {
    return read(this.key('boxes')).flatMap((value) => {
      const parsed = storageBoxSchema.safeParse(value);
      return parsed.success ? [parsed.data] : [];
    });
  }

  async saveBox(box: StorageBox): Promise<StorageBox> {
    const parsed = storageBoxSchema.parse(box);
    const boxes = await this.listBoxes();
    const existing = boxes.findIndex((entry) => entry.id === parsed.id);
    const next = [...boxes];
    if (existing >= 0) next[existing] = parsed;
    else next.push(parsed);
    localStorage.setItem(this.key('boxes'), JSON.stringify(next));
    return parsed;
  }

  async removeBox(id: string): Promise<void> {
    const boxes = await this.listBoxes();
    localStorage.setItem(this.key('boxes'), JSON.stringify(boxes.filter((box) => box.id !== id)));
  }

  async listSalesPacks(): Promise<SalesPack[]> {
    return read(this.key('sales-packs')).flatMap((value) => {
      const parsed = salesPackSchema.safeParse(value);
      return parsed.success ? [parsed.data] : [];
    });
  }

  async saveSalesPack(pack: SalesPack): Promise<SalesPack> {
    const parsed = salesPackSchema.parse(pack);
    const packs = await this.listSalesPacks();
    const existing = packs.findIndex((entry) => entry.id === parsed.id);
    const next = [...packs];
    if (existing >= 0) next[existing] = parsed;
    else next.push(parsed);
    localStorage.setItem(this.key('sales-packs'), JSON.stringify(next));
    return parsed;
  }

  async removeSalesPack(id: string): Promise<void> {
    const packs = await this.listSalesPacks();
    localStorage.setItem(
      this.key('sales-packs'),
      JSON.stringify(packs.filter((pack) => pack.id !== id)),
    );
  }
}
