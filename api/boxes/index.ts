import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSession } from '../_shared/auth.js';
import { db } from '../_shared/firebase.js';
import { storageBoxSchema } from '../_shared/schemas.js';
import { apiError, json, methodNotAllowed } from '../_shared/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await requireSession(req);
    if (req.method === 'GET') {
      const snapshot = await db().collection('storageBoxes').orderBy('name', 'asc').limit(200).get();
      return json(
        res,
        200,
        snapshot.docs.map((doc) => doc.data()),
      );
    }
    if (req.method === 'POST') {
      const parsed = storageBoxSchema.safeParse(req.body);
      if (!parsed.success) return apiError(res, 400, 'VALIDATION_ERROR', 'Datos de caja inválidos.');
      await db().collection('storageBoxes').doc(parsed.data.id).create(parsed.data);
      return json(res, 201, parsed.data);
    }
    return methodNotAllowed(req, res, ['GET', 'POST']);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED')
      return apiError(res, 401, 'UNAUTHORIZED', 'Sesión no válida.');
    return apiError(res, 500, 'BOX_ERROR', 'No se pudo acceder a las cajas.');
  }
}
