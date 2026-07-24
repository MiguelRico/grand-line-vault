import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSession } from '../_shared/auth.js';
import { db } from '../_shared/firebase.js';
import { salesPackSchema } from '../_shared/schemas.js';
import { saveSalesPackWithStock } from '../_shared/inventory.js';
import { apiError, json, methodNotAllowed } from '../_shared/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await requireSession(req);
    if (req.method === 'GET') {
      const snapshot = await db().collection('salesPacks').orderBy('updatedAt', 'desc').limit(200).get();
      return json(
        res,
        200,
        snapshot.docs.map((doc) => doc.data()),
      );
    }
    if (req.method === 'POST') {
      const parsed = salesPackSchema.safeParse(req.body);
      if (!parsed.success) return apiError(res, 400, 'VALIDATION_ERROR', 'Datos del pack inválidos.');
      await saveSalesPackWithStock(parsed.data);
      return json(res, 201, parsed.data);
    }
    return methodNotAllowed(req, res, ['GET', 'POST']);
  } catch (error) {
    if (error instanceof Error && error.message === 'STOCK_CONFLICT')
      return apiError(res, 409, 'STOCK_CONFLICT', 'El pack supera las copias disponibles.');
    if (error instanceof Error && error.message === 'UNAUTHORIZED')
      return apiError(res, 401, 'UNAUTHORIZED', 'Sesión no válida.');
    return apiError(res, 500, 'SALES_PACK_ERROR', 'No se pudo acceder a los packs.');
  }
}
