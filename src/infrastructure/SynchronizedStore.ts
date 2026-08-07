export interface SyncEntity {
  id: string;
  updatedAt: string;
}

export interface DocumentStore<T extends SyncEntity> {
  list(): Promise<T[]>;
  save(value: T): Promise<T>;
  remove(id: string): Promise<void>;
}

export interface SyncMarker {
  isInitialized(): Promise<boolean>;
  markInitialized(): Promise<void>;
}

function newer<T extends SyncEntity>(left: T, right: T): T {
  return Date.parse(left.updatedAt) >= Date.parse(right.updatedAt) ? left : right;
}

function merge<T extends SyncEntity>(local: T[], remote: T[]): T[] {
  const merged = new Map<string, T>();
  for (const value of [...remote, ...local]) {
    const current = merged.get(value.id);
    merged.set(value.id, current ? newer(current, value) : value);
  }
  return [...merged.values()];
}

export class SynchronizedStore<T extends SyncEntity> implements DocumentStore<T> {
  private initialization?: Promise<void>;

  constructor(
    private readonly local: DocumentStore<T>,
    private readonly remote: DocumentStore<T>,
    private readonly marker: SyncMarker,
  ) {}

  private async initialize(): Promise<void> {
    if (await this.marker.isInitialized()) return;
    const [localValues, remoteValues] = await Promise.all([this.local.list(), this.remote.list()]);
    await Promise.all(merge(localValues, remoteValues).map((value) => this.remote.save(value)));
    await this.marker.markInitialized();
  }

  private ensureInitialized(): Promise<void> {
    if (!this.initialization) {
      this.initialization = this.initialize().catch((error: unknown) => {
        this.initialization = undefined;
        throw error;
      });
    }
    return this.initialization;
  }

  private async mirror(values: T[]): Promise<void> {
    const localValues = await this.local.list();
    const remoteIds = new Set(values.map((value) => value.id));
    await Promise.all([
      ...values.map((value) => this.local.save(value)),
      ...localValues
        .filter((value) => !remoteIds.has(value.id))
        .map((value) => this.local.remove(value.id)),
    ]);
  }

  async list(): Promise<T[]> {
    await this.ensureInitialized();
    const values = await this.remote.list();
    await this.mirror(values);
    return values;
  }

  async save(value: T): Promise<T> {
    await this.ensureInitialized();
    const saved = await this.remote.save(value);
    await this.local.save(saved);
    return saved;
  }

  async remove(id: string): Promise<void> {
    await this.ensureInitialized();
    await this.remote.remove(id);
    await this.local.remove(id);
  }
}
