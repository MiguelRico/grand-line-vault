import type { z } from 'zod';
import { db } from './firebase';
import { salesPackSchema } from './schemas';

type SalesPackInput = z.infer<typeof salesPackSchema>;

export async function saveSalesPackWithStock(pack: SalesPackInput): Promise<void> {
  const firestore = db();
  await firestore.runTransaction(async (transaction) => {
    const itemRefs = pack.items.map((item) =>
      firestore.collection('collectionItems').doc(item.collectionItemId),
    );
    const itemSnapshots = itemRefs.length ? await transaction.getAll(...itemRefs) : [];
    const available = new Map(
      itemSnapshots.map((snapshot) => [
        snapshot.id,
        snapshot.exists ? Number(snapshot.data()?.quantity ?? 0) : 0,
      ]),
    );

    const activePacks = await transaction.get(
      firestore.collection('salesPacks').where('status', 'in', ['DRAFT', 'READY', 'SOLD']),
    );
    const reserved = new Map<string, number>();
    activePacks.docs
      .filter((snapshot) => snapshot.id !== pack.id)
      .flatMap((snapshot) => {
        const data = snapshot.data() as { items?: Array<{ collectionItemId: string; quantity: number }> };
        return data.items ?? [];
      })
      .forEach((item) => {
        reserved.set(
          item.collectionItemId,
          (reserved.get(item.collectionItemId) ?? 0) + item.quantity,
        );
      });

    for (const item of pack.items) {
      const free = (available.get(item.collectionItemId) ?? 0) - (reserved.get(item.collectionItemId) ?? 0);
      if (item.quantity > free) throw new Error('STOCK_CONFLICT');
    }

    transaction.set(firestore.collection('salesPacks').doc(pack.id), pack, { merge: true });
  });
}
