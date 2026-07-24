import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSession } from '../_shared/auth';
import { db } from '../_shared/firebase';
import { apiError, json, methodNotAllowed } from '../_shared/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await requireSession(req);
    if (req.method !== 'GET') return methodNotAllowed(req, res, ['GET']);
    const snapshot = await db()
      .collection('collectionItems')
      .where('tradeableQuantity', '>', 0)
      .orderBy('tradeableQuantity', 'desc')
      .limit(500)
      .get();
    return json(
      res,
      200,
      snapshot.docs.map((doc) => doc.data()),
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED')
      return apiError(res, 401, 'UNAUTHORIZED', 'Sesión no válida.');
    return apiError(res, 500, 'TRADES_ERROR', 'No se pudo acceder a intercambios.');
  }
}
