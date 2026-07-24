import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSession } from '../_shared/auth.js';
import { db } from '../_shared/firebase.js';
import { apiError, json, methodNotAllowed } from '../_shared/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await requireSession(req);
    if (req.method !== 'GET') return methodNotAllowed(req, res, ['GET']);
    const snapshot = await db().collection('collectionItems').limit(1000).get();
    const items = snapshot.docs.map((doc) => doc.data());
    const totalCopies = items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0);
    const amount = items.reduce(
      (sum, item) =>
        sum + Number(item.quantity ?? 0) * Number(item.cardSnapshot?.catalogPrice?.amount ?? 0),
      0,
    );
    return json(res, 200, {
      totalCopies,
      uniqueCards: new Set(items.map((item) => item.cardId)).size,
      estimatedValue: { amount, currency: 'EUR' },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED')
      return apiError(res, 401, 'UNAUTHORIZED', 'Sesión no válida.');
    return apiError(res, 500, 'STATISTICS_ERROR', 'No se pudieron calcular las estadísticas.');
  }
}
