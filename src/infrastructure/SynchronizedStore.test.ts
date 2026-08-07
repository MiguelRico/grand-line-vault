import { describe, expect, it } from 'vitest';
import {
  SynchronizedStore,
  type DocumentStore,
  type SyncEntity,
  type SyncMarker,
} from './SynchronizedStore';

interface Entry extends SyncEntity {
  value: string;
}

class MemoryStore implements DocumentStore<Entry> {
  readonly values = new Map<string, Entry>();

  constructor(initial: Entry[] = []) {
    initial.forEach((value) => this.values.set(value.id, value));
  }

  async list(): Promise<Entry[]> {
    return [...this.values.values()];
  }

  async save(value: Entry): Promise<Entry> {
    this.values.set(value.id, value);
    return value;
  }

  async remove(id: string): Promise<void> {
    this.values.delete(id);
  }
}

class MemoryMarker implements SyncMarker {
  constructor(public initialized: boolean) {}

  async isInitialized(): Promise<boolean> {
    return this.initialized;
  }

  async markInitialized(): Promise<void> {
    this.initialized = true;
  }
}

function entry(id: string, value: string, day: number): Entry {
  return { id, value, updatedAt: `2026-08-${String(day).padStart(2, '0')}T00:00:00.000Z` };
}

describe('SynchronizedStore', () => {
  it('migrates local and remote data once and keeps the newest version', async () => {
    const local = new MemoryStore([entry('local', 'local', 1), entry('shared', 'new', 3)]);
    const remote = new MemoryStore([entry('remote', 'remote', 1), entry('shared', 'old', 2)]);
    const marker = new MemoryMarker(false);
    const store = new SynchronizedStore(local, remote, marker);

    expect(await store.list()).toEqual(
      expect.arrayContaining([
        entry('local', 'local', 1),
        entry('remote', 'remote', 1),
        entry('shared', 'new', 3),
      ]),
    );
    expect(marker.initialized).toBe(true);
    expect(await local.list()).toEqual(expect.arrayContaining(await remote.list()));
  });

  it('treats remote data as authoritative after migration and removes stale local data', async () => {
    const local = new MemoryStore([entry('stale', 'stale', 1)]);
    const remote = new MemoryStore([entry('remote', 'remote', 2)]);
    const store = new SynchronizedStore(local, remote, new MemoryMarker(true));

    expect(await store.list()).toEqual([entry('remote', 'remote', 2)]);
    expect(await local.list()).toEqual([entry('remote', 'remote', 2)]);
  });

  it('writes and removes from remote and local stores', async () => {
    const local = new MemoryStore();
    const remote = new MemoryStore();
    const store = new SynchronizedStore(local, remote, new MemoryMarker(true));
    const saved = entry('saved', 'value', 4);

    await store.save(saved);
    expect(await local.list()).toEqual([saved]);
    expect(await remote.list()).toEqual([saved]);

    await store.remove(saved.id);
    expect(await local.list()).toEqual([]);
    expect(await remote.list()).toEqual([]);
  });
});
