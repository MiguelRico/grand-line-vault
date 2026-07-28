import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSession } from '../_shared/auth.js';
import { db } from '../_shared/firebase.js';
import { collectionItemSchema } from '../_shared/schemas.js';
import { apiError, assertPayloadSize, getPathId, json, methodNotAllowed } from '../_shared/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await requireSession(req);
    const id = getPathId(req);
    if (!id || id.length > 160) return apiError(res, 400, 'INVALID_ID', 'Identificador inválido.');
    const ref = db().collection('collectionItems').doc(id);
    if (req.method === 'GET') {
      const snapshot = await ref.get();
      if (!snapshot.exists) return apiError(res, 404, 'NOT_FOUND', 'Carta no encontrada.');
      const parsed = collectionItemSchema.safeParse(snapshot.data());
      if (!parsed.success)
        return apiError(
          res,
          500,
          'COLLECTION_DATA_CORRUPTED',
          'La carta guardada tiene un formato no válido.',
        );
      return json(res, 200, parsed.data);
    }
    if (req.method === 'PATCH') {
      if (!assertPayloadSize(req))
        return apiError(res, 413, 'PAYLOAD_TOO_LARGE', 'Solicitud demasiado grande.');
      const parsed = collectionItemSchema.safeParse({ ...req.body, id });
      if (!parsed.success)
        return apiError(res, 400, 'VALIDATION_ERROR', 'Datos de colección inválidos.');
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
    return apiError(res, 500, 'COLLECTION_ERROR', 'No se pudo completar la operación.');
  }
}
