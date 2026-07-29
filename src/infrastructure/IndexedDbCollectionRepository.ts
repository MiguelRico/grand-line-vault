import Dexie, { type EntityTable } from 'dexie';
import { collectionEntrySchema } from '../domain/collectionSchema';
import { wishlistEntrySchema } from '../domain/wishlistSchema';
import type { CollectionEntry, WishlistEntry } from '../domain/models';
import type { CollectionRepository, WishlistRepository } from '../domain/repositories';

type StoredCollectionEntry = CollectionEntry & { storageKey: string };
type StoredWishlistEntry = WishlistEntry & { storageKey: string };

class GrandLineVaultDatabase extends Dexie {
  collectionEntries!: EntityTable<StoredCollectionEntry, 'storageKey'>;
  wishlistEntries!: EntityTable<StoredWishlistEntry, 'storageKey'>;

  constructor() {
    super('grand-line-vault');
    this.version(1).stores({
      collectionEntries:
        '&storageKey, ownerId, id, catalogCardId, [ownerId+id], [ownerId+catalogCardId], updatedAt',
    });
    this.version(2).stores({
      collectionEntries:
        '&storageKey, ownerId, id, catalogCardId, [ownerId+id], [ownerId+catalogCardId], updatedAt',
      wishlistEntries:
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

function persistedWishlistEntry(value: WishlistEntry): StoredWishlistEntry {
  const entry = wishlistEntrySchema.parse({
    id: value.id,
    ownerId: value.ownerId,
    catalogCardId: value.catalogCardId,
    catalogVariantId: value.catalogVariantId,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  });
  return { ...entry, storageKey: storageKey(entry.ownerId, entry.id) };
}

function domainWishlistEntry(stored: StoredWishlistEntry): WishlistEntry {
  return wishlistEntrySchema.parse({
    id: stored.id,
    ownerId: stored.ownerId,
    catalogCardId: stored.catalogCardId,
    catalogVariantId: stored.catalogVariantId,
    createdAt: stored.createdAt,
    updatedAt: stored.updatedAt,
  });
}

export class IndexedDbWishlistRepository implements WishlistRepository {
  async list(ownerId: string): Promise<WishlistEntry[]> {
    const rows = await database.wishlistEntries.where('ownerId').equals(ownerId).toArray();
    return rows.map(domainWishlistEntry);
  }

  async save(entry: WishlistEntry): Promise<WishlistEntry> {
    const stored = persistedWishlistEntry(entry);
    await database.wishlistEntries.put(stored);
    return domainWishlistEntry(stored);
  }

  async remove(ownerId: string, id: string): Promise<void> {
    await database.wishlistEntries.delete(storageKey(ownerId, id));
  }
}
