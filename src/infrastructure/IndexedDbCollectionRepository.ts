import Dexie, { type EntityTable } from 'dexie';
import { collectionEntrySchema } from '../domain/collectionSchema';
import type { CollectionEntry } from '../domain/models';
import type { CollectionRepository } from '../domain/repositories';

type StoredCollectionEntry = CollectionEntry & { storageKey: string };

class GrandLineVaultDatabase extends Dexie {
  collectionEntries!: EntityTable<StoredCollectionEntry, 'storageKey'>;

  constructor() {
    super('grand-line-vault');
    this.version(1).stores({
      collectionEntries:
        '&storageKey, ownerId, id, catalogCardId, [ownerId+id], [ownerId+catalogCardId], updatedAt',
    });
  }
}

const database = new GrandLineVaultDatabase();

function storageKey(ownerId: string, id: string): string {
  return `${ownerId}::${id}`;
}

function persistedEntry(value: CollectionEntry): StoredCollectionEntry {
  const entry = collectionEntrySchema.parse({
    id: value.id,
    ownerId: value.ownerId,
    catalogCardId: value.catalogCardId,
    catalogVariantId: value.catalogVariantId,
    quantity: value.quantity,
    language: value.language,
    condition: value.condition,
    favorite: value.favorite,
    boxId: value.boxId,
    sectionId: value.sectionId,
    acquisitionPrice: value.acquisitionPrice,
    notes: value.notes,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  });
  return { ...entry, storageKey: storageKey(entry.ownerId, entry.id) };
}

function domainEntry(stored: StoredCollectionEntry): CollectionEntry {
  const {
    id,
    ownerId,
    catalogCardId,
    catalogVariantId,
    quantity,
    language,
    condition,
    favorite,
    boxId,
    sectionId,
    acquisitionPrice,
    notes,
    createdAt,
    updatedAt,
  } = stored;
  return collectionEntrySchema.parse({
    id,
    ownerId,
    catalogCardId,
    catalogVariantId,
    quantity,
    language,
    condition,
    favorite,
    boxId,
    sectionId,
    acquisitionPrice,
    notes,
    createdAt,
    updatedAt,
  });
}

export class IndexedDbCollectionRepository implements CollectionRepository {
  async list(ownerId: string): Promise<CollectionEntry[]> {
    const rows = await database.collectionEntries.where('ownerId').equals(ownerId).toArray();
    return rows.map(domainEntry);
  }

  async save(entry: CollectionEntry): Promise<CollectionEntry> {
    const stored = persistedEntry(entry);
    await database.collectionEntries.put(stored);
    return domainEntry(stored);
  }

  async remove(ownerId: string, id: string): Promise<void> {
    await database.collectionEntries.delete(storageKey(ownerId, id));
  }
}
