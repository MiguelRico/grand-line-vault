import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSession } from '../_shared/auth';
import { db } from '../_shared/firebase';
import { deckSchema } from '../_shared/schemas';
import { apiError, getPathId, json, methodNotAllowed } from '../_shared/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await requireSession(req);
    const id = getPathId(req);
    if (!id || id.length > 160) return apiError(res, 400, 'INVALID_ID', 'Identificador inválido.');
    const ref = db().collection('decks').doc(id);
    if (req.method === 'GET') {
      const snapshot = await ref.get();
      if (!snapshot.exists) return apiError(res, 404, 'NOT_FOUND', 'Mazo no encontrado.');
      return json(res, 200, snapshot.data());
    }
    if (req.method === 'PATCH') {
      const parsed = deckSchema.safeParse({ ...req.body, id });
      if (!parsed.success) return apiError(res, 400, 'VALIDATION_ERROR', 'Datos del mazo inválidos.');
      await ref.set(parsed.data, { merge: true });
      return json(res, 200, parsed.data);
    }
    if (req.method === 'DELETE') {
      await ref.delete();
      return json(res, 200, { deleted: true });
    }
    return methodNotAllowed(req, res, ['GET', 'PATCH', 'DELETE']);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED')
      return apiError(res, 401, 'UNAUTHORIZED', 'Sesión no válida.');
    return apiError(res, 500, 'DECK_ERROR', 'No se pudo completar la operación.');
  }
}
