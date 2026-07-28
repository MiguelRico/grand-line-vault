import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSession } from '../_shared/auth.js';
import { db } from '../_shared/firebase.js';
import { collectionItemSchema } from '../_shared/schemas.js';
import { apiError, assertPayloadSize, json, methodNotAllowed } from '../_shared/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await requireSession(req);
    if (req.method === 'GET') {
      const snapshot = await db()
        .collection('collectionItems')
        .orderBy('updatedAt', 'desc')
        .limit(500)
        .get();
      const items = snapshot.docs.map((doc) => collectionItemSchema.safeParse(doc.data()));
      if (items.some((item) => !item.success)) {
        return apiError(
          res,
          500,
          'COLLECTION_DATA_CORRUPTED',
          'Hay datos de colección guardados con un formato no válido.',
        );
      }
      return json(
        res,
        200,
        items.map((item) => {
          if (!item.success) throw new Error('COLLECTION_DATA_CORRUPTED');
          return item.data;
        }),
      );
    }
    if (req.method === 'POST') {
      if (!assertPayloadSize(req))
        return apiError(res, 413, 'PAYLOAD_TOO_LARGE', 'Solicitud demasiado grande.');
      const parsed = collectionItemSchema.safeParse(req.body);
      if (!parsed.success)
        return apiError(res, 400, 'VALIDATION_ERROR', 'Datos de colección inválidos.');
      await db().collection('collectionItems').doc(parsed.data.id).create(parsed.data);
      return json(res, 201, parsed.data);
    }
    return methodNotAllowed(req, res, ['GET', 'POST']);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED')
      return apiError(res, 401, 'UNAUTHORIZED', 'Sesión no válida.');
    return apiError(res, 500, 'COLLECTION_ERROR', 'No se pudo acceder a la colección.');
  }
}
