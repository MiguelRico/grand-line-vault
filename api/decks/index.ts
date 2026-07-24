import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSession } from '../_shared/auth';
import { db } from '../_shared/firebase';
import { deckSchema } from '../_shared/schemas';
import { apiError, json, methodNotAllowed } from '../_shared/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await requireSession(req);
    if (req.method === 'GET') {
      const snapshot = await db().collection('decks').orderBy('updatedAt', 'desc').limit(100).get();
      return json(
        res,
        200,
        snapshot.docs.map((doc) => doc.data()),
      );
    }
    if (req.method === 'POST') {
      const parsed = deckSchema.safeParse(req.body);
      if (!parsed.success) return apiError(res, 400, 'VALIDATION_ERROR', 'Datos del mazo inválidos.');
      await db().collection('decks').doc(parsed.data.id).create(parsed.data);
      return json(res, 201, parsed.data);
    }
    return methodNotAllowed(req, res, ['GET', 'POST']);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED')
      return apiError(res, 401, 'UNAUTHORIZED', 'Sesión no válida.');
    return apiError(res, 500, 'DECK_ERROR', 'No se pudo acceder a los mazos.');
  }
}
