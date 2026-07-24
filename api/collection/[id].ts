import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSession } from '../_shared/auth';
import { db } from '../_shared/firebase';
import { collectionItemSchema } from '../_shared/schemas';
import {
  apiError,
  assertPayloadSize,
  getPathId,
  json,
  methodNotAllowed,
} from '../_shared/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await requireSession(req);
    const id = getPathId(req);
    if (!id || id.length > 160) return apiError(res, 400, 'INVALID_ID', 'Identificador inválido.');
    const ref = db().collection('collectionItems').doc(id);
    if (req.method === 'GET') {
      const snapshot = await ref.get();
      if (!snapshot.exists) return apiError(res, 404, 'NOT_FOUND', 'Carta no encontrada.');
      return json(res, 200, snapshot.data());
    }
    if (req.method === 'PATCH') {
      if (!assertPayloadSize(req)) return apiError(res, 413, 'PAYLOAD_TOO_LARGE', 'Solicitud demasiado grande.');
      const parsed = collectionItemSchema.safeParse({ ...req.body, id });
      if (!parsed.success) return apiError(res, 400, 'VALIDATION_ERROR', 'Datos de colección inválidos.');
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
