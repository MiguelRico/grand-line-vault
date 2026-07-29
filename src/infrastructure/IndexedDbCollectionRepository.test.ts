import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import type { CollectionEntry, WishlistEntry } from '../domain/models';
import {
  IndexedDbCollectionRepository,
  IndexedDbWishlistRepository,
} from './IndexedDbCollectionRepository';

function entry(ownerId: string, id: string): CollectionEntry {
  return {
    id,
    ownerId,
    catalogCardId: 'CARD::OP01-001',
    catalogVariantId: 'OP01-001',
    quantity: 2,
    language: 'EN',
    condition: 'NEAR_MINT',
    favorite: false,
    createdAt: '2026-07-29T00:00:00.000Z',
    updatedAt: '2026-07-29T00:00:00.000Z',
  };
}

describe('IndexedDbCollectionRepository', () => {
  it('isolates entries by owner', async () => {
    const repository = new IndexedDbCollectionRepository();
    await repository.save(entry('owner-a', 'same-id'));
    await repository.save(entry('owner-b', 'same-id'));

    expect(await repository.list('owner-a')).toEqual([entry('owner-a', 'same-id')]);
    expect(await repository.list('owner-b')).toEqual([entry('owner-b', 'same-id')]);
  });

  it('persists only the allowlisted catalog references and user metadata', async () => {
    const repository = new IndexedDbCollectionRepository();
    const unsafe = {
      ...entry('owner-safe', 'safe-id'),
      prices: { cardmarket: { lowest_near_mint: 99 } },
      availability: 42,
      card: { name: 'No debe persistirse' },
    } as CollectionEntry;

    await repository.save(unsafe);
    const [stored] = await repository.list('owner-safe');

    expect(stored).toEqual(entry('owner-safe', 'safe-id'));
    expect(stored).not.toHaveProperty('prices');
    expect(stored).not.toHaveProperty('availability');
    expect(stored).not.toHaveProperty('card');
  });
});

describe('IndexedDbWishlistRepository', () => {
  const wish: WishlistEntry = {
    id: 'CARD::OP01-001::BASE',
    ownerId: 'wishlist-owner',
    catalogCardId: 'CARD::OP01-001',
    catalogVariantId: null,
    createdAt: '2026-07-29T00:00:00.000Z',
    updatedAt: '2026-07-29T00:00:00.000Z',
  };

  it('persists only catalog references and isolates them by owner', async () => {
    const repository = new IndexedDbWishlistRepository();
    await repository.save({
      ...wish,
      prices: { market: 99 },
      image: 'https://example.com/dynamic.png',
    } as WishlistEntry);
    await repository.save({ ...wish, ownerId: 'another-owner' });

    expect(await repository.list(wish.ownerId)).toEqual([wish]);
    expect(await repository.list('another-owner')).toEqual([{ ...wish, ownerId: 'another-owner' }]);
  });

  it('removes only the selected wish', async () => {
    const repository = new IndexedDbWishlistRepository();
    await repository.save(wish);
    await repository.remove(wish.ownerId, wish.id);
    expect(await repository.list(wish.ownerId)).toEqual([]);
  });
});
