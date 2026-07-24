import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSession } from '../_shared/auth.js';
import { db } from '../_shared/firebase.js';
import { storageBoxSchema } from '../_shared/schemas.js';
import { apiError, getPathId, json, methodNotAllowed } from '../_shared/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await requireSession(req);
    const id = getPathId(req);
    if (!id || id.length > 160) return apiError(res, 400, 'INVALID_ID', 'Identificador inválido.');
    const ref = db().collection('storageBoxes').doc(id);
    if (req.method === 'GET') {
      const snapshot = await ref.get();
      if (!snapshot.exists) return apiError(res, 404, 'NOT_FOUND', 'Caja no encontrada.');
      return json(res, 200, snapshot.data());
    }
    if (req.method === 'PATCH') {
      const parsed = storageBoxSchema.safeParse({ ...req.body, id });
      if (!parsed.success) return apiError(res, 400, 'VALIDATION_ERROR', 'Datos de caja inválidos.');
      await ref.set(parsed.data, { merge: true });
      return json(res, 200, parsed.data);
    }
    if (req.method === 'DELETE') {
      const assigned = await db().collection('collectionItems').where('boxId', '==', id).limit(1).get();
      if (!assigned.empty)
        return apiError(res, 409, 'BOX_IN_USE', 'La caja contiene cartas y no se puede eliminar.');
      await ref.delete();
      return json(res, 200, { deleted: true });
    }
    return methodNotAllowed(req, res, ['GET', 'PATCH', 'DELETE']);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED')
      return apiError(res, 401, 'UNAUTHORIZED', 'Sesión no válida.');
    return apiError(res, 500, 'BOX_ERROR', 'No se pudo completar la operación.');
  }
}
