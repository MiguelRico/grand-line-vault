import {
  collection as firestoreCollection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import type { ZodType } from 'zod';
import { collectionEntrySchema } from '../domain/collectionSchema';
import type { CollectionEntry, SalesPack, StorageBox, WishlistEntry } from '../domain/models';
import { salesPackSchema, storageBoxSchema } from '../domain/organizationSchema';
import type { CollectionRepository, WishlistRepository } from '../domain/repositories';
import { wishlistEntrySchema } from '../domain/wishlistSchema';
import { firestoreClient } from './firebaseClient';
import type { OrganizationRepository } from './repositories';
import {
  SynchronizedStore,
  type DocumentStore,
  type SyncEntity,
  type SyncMarker,
} from './SynchronizedStore';

type SyncResource = 'collectionItems' | 'wishlistItems' | 'storageBoxes' | 'salesPacks';

function documentId(id: string): string {
  if (id.includes('/') || id === '.' || id === '..') {
    throw new Error('El identificador no es válido para Firestore.');
  }
  return id;
}

function firestoreValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(firestoreValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, child]) => child !== undefined)
      .map(([key, child]) => [key, firestoreValue(child)]),
  );
}

class FirestoreDocumentStore<T extends SyncEntity> implements DocumentStore<T> {
  constructor(
    private readonly ownerId: string,
    private readonly resource: SyncResource,
    private readonly schema: ZodType<T>,
  ) {}

  private resourceCollection() {
    return firestoreCollection(firestoreClient(), 'users', this.ownerId, this.resource);
  }

  async list(): Promise<T[]> {
    const snapshot = await getDocs(this.resourceCollection());
    return snapshot.docs.map((snapshotDocument) => this.schema.parse(snapshotDocument.data()));
  }

  async save(value: T): Promise<T> {
    const parsed = this.schema.parse(value);
    await setDoc(doc(this.resourceCollection(), documentId(parsed.id)), firestoreValue(parsed));
    return parsed;
  }

  async remove(id: string): Promise<void> {
    await deleteDoc(doc(this.resourceCollection(), documentId(id)));
  }
}

class FirestoreSyncMarker implements SyncMarker {
  constructor(
    private readonly ownerId: string,
    private readonly resource: SyncResource,
  ) {}

  private reference() {
    return doc(firestoreClient(), 'users', this.ownerId, 'syncState', this.resource);
  }

  async isInitialized(): Promise<boolean> {
    const snapshot = await getDoc(this.reference());
    return snapshot.exists() && snapshot.data().schemaVersion === 1;
  }

  async markInitialized(): Promise<void> {
    await setDoc(this.reference(), {
      schemaVersion: 1,
      resource: this.resource,
      initializedAt: new Date().toISOString(),
    });
  }
}

function collectionStore(
  ownerId: string,
  repository: CollectionRepository,
): DocumentStore<CollectionEntry> {
  return {
    list: () => repository.list(ownerId),
    save: (value) => repository.save(value),
    remove: (id) => repository.remove(ownerId, id),
  };
}

function wishlistStore(
  ownerId: string,
  repository: WishlistRepository,
): DocumentStore<WishlistEntry> {
  return {
    list: () => repository.list(ownerId),
    save: (value) => repository.save(value),
    remove: (id) => repository.remove(ownerId, id),
  };
}

export class CloudSyncCollectionRepository implements CollectionRepository {
  private readonly store: SynchronizedStore<CollectionEntry>;

  constructor(
    private readonly ownerId: string,
    localRepository: CollectionRepository,
  ) {
    this.store = new SynchronizedStore(
      collectionStore(ownerId, localRepository),
      new FirestoreDocumentStore(ownerId, 'collectionItems', collectionEntrySchema),
      new FirestoreSyncMarker(ownerId, 'collectionItems'),
    );
  }

  list(ownerId: string): Promise<CollectionEntry[]> {
    this.assertOwner(ownerId);
    return this.store.list();
  }

  save(entry: CollectionEntry): Promise<CollectionEntry> {
    this.assertOwner(entry.ownerId);
    return this.store.save(entry);
  }

  remove(ownerId: string, id: string): Promise<void> {
    this.assertOwner(ownerId);
    return this.store.remove(id);
  }

  private assertOwner(ownerId: string): void {
    if (ownerId !== this.ownerId) throw new Error('Acceso a una colección de otro usuario.');
  }
}

export class CloudSyncWishlistRepository implements WishlistRepository {
  private readonly store: SynchronizedStore<WishlistEntry>;

  constructor(
    private readonly ownerId: string,
    localRepository: WishlistRepository,
  ) {
    this.store = new SynchronizedStore(
      wishlistStore(ownerId, localRepository),
      new FirestoreDocumentStore(ownerId, 'wishlistItems', wishlistEntrySchema),
      new FirestoreSyncMarker(ownerId, 'wishlistItems'),
    );
  }

  list(ownerId: string): Promise<WishlistEntry[]> {
    this.assertOwner(ownerId);
    return this.store.list();
  }

  save(entry: WishlistEntry): Promise<WishlistEntry> {
    this.assertOwner(entry.ownerId);
    return this.store.save(entry);
  }

  remove(ownerId: string, id: string): Promise<void> {
    this.assertOwner(ownerId);
    return this.store.remove(id);
  }

  private assertOwner(ownerId: string): void {
    if (ownerId !== this.ownerId) throw new Error('Acceso a deseos de otro usuario.');
  }
}

function boxStore(repository: OrganizationRepository): DocumentStore<StorageBox> {
  return {
    list: () => repository.listBoxes(),
    save: (value) => repository.saveBox(value),
    remove: (id) => repository.removeBox(id),
  };
}

function salesPackStore(repository: OrganizationRepository): DocumentStore<SalesPack> {
  return {
    list: () => repository.listSalesPacks(),
    save: (value) => repository.saveSalesPack(value),
    remove: (id) => repository.removeSalesPack(id),
  };
}

export class CloudSyncOrganizationRepository implements OrganizationRepository {
  private readonly boxes: SynchronizedStore<StorageBox>;
  private readonly salesPacks: SynchronizedStore<SalesPack>;

  constructor(ownerId: string, localRepository: OrganizationRepository) {
    this.boxes = new SynchronizedStore(
      boxStore(localRepository),
      new FirestoreDocumentStore(ownerId, 'storageBoxes', storageBoxSchema),
      new FirestoreSyncMarker(ownerId, 'storageBoxes'),
    );
    this.salesPacks = new SynchronizedStore(
      salesPackStore(localRepository),
      new FirestoreDocumentStore(ownerId, 'salesPacks', salesPackSchema),
      new FirestoreSyncMarker(ownerId, 'salesPacks'),
    );
  }

  listBoxes(): Promise<StorageBox[]> {
    return this.boxes.list();
  }

  saveBox(box: StorageBox): Promise<StorageBox> {
    return this.boxes.save(box);
  }

  removeBox(id: string): Promise<void> {
    return this.boxes.remove(id);
  }

  listSalesPacks(): Promise<SalesPack[]> {
    return this.salesPacks.list();
  }

  saveSalesPack(pack: SalesPack): Promise<SalesPack> {
    return this.salesPacks.save(pack);
  }

  removeSalesPack(id: string): Promise<void> {
    return this.salesPacks.remove(id);
  }
}
