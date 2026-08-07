import { beforeEach, describe, expect, it } from 'vitest';
import type { SalesPack, StorageBox } from '../domain/models';
import { LocalOrganizationRepository } from './repositories';

const timestamp = '2026-08-07T00:00:00.000Z';

const box: StorageBox = {
  id: 'box-1',
  name: 'Caja',
  sections: [],
  createdAt: timestamp,
  updatedAt: timestamp,
};

const pack: SalesPack = {
  id: 'pack-1',
  name: 'Pack',
  status: 'DRAFT',
  items: [],
  createdAt: timestamp,
  updatedAt: timestamp,
};

describe('LocalOrganizationRepository', () => {
  beforeEach(() => localStorage.clear());

  it('isolates boxes and sales packs by owner', async () => {
    const first = new LocalOrganizationRepository('owner-a');
    const second = new LocalOrganizationRepository('owner-b');

    await first.saveBox(box);
    await first.saveSalesPack(pack);

    expect(await first.listBoxes()).toEqual([box]);
    expect(await first.listSalesPacks()).toEqual([pack]);
    expect(await second.listBoxes()).toEqual([]);
    expect(await second.listSalesPacks()).toEqual([]);
  });

  it('persists only fields from the organization schemas', async () => {
    const repository = new LocalOrganizationRepository('owner-safe');
    await repository.saveBox({ ...box, remotePayload: true } as StorageBox);
    await repository.saveSalesPack({ ...pack, prices: [99] } as SalesPack);

    expect((await repository.listBoxes())[0]).not.toHaveProperty('remotePayload');
    expect((await repository.listSalesPacks())[0]).not.toHaveProperty('prices');
  });
});
