import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSession } from '../_shared/auth.js';
import { db } from '../_shared/firebase.js';
import { salesPackSchema } from '../_shared/schemas.js';
import { saveSalesPackWithStock } from '../_shared/inventory.js';
import { apiError, getPathId, json, methodNotAllowed } from '../_shared/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await requireSession(req);
    const id = getPathId(req);
    if (!id || id.length > 160) return apiError(res, 400, 'INVALID_ID', 'Identificador inválido.');
    const ref = db().collection('salesPacks').doc(id);
    if (req.method === 'GET') {
      const snapshot = await ref.get();
      if (!snapshot.exists) return apiError(res, 404, 'NOT_FOUND', 'Pack no encontrado.');
      return json(res, 200, snapshot.data());
    }
    if (req.method === 'PATCH') {
      const parsed = salesPackSchema.safeParse({ ...req.body, id });
      if (!parsed.success) return apiError(res, 400, 'VALIDATION_ERROR', 'Datos del pack inválidos.');
      await saveSalesPackWithStock(parsed.data);
      return json(res, 200, parsed.data);
    }
    if (req.method === 'DELETE') {
      await ref.delete();
      return json(res, 200, { deleted: true });
    }
    return methodNotAllowed(req, res, ['GET', 'PATCH', 'DELETE']);
  } catch (error) {
    if (error instanceof Error && error.message === 'STOCK_CONFLICT')
      return apiError(res, 409, 'STOCK_CONFLICT', 'El pack supera las copias disponibles.');
    if (error instanceof Error && error.message === 'UNAUTHORIZED')
      return apiError(res, 401, 'UNAUTHORIZED', 'Sesión no válida.');
    return apiError(res, 500, 'SALES_PACK_ERROR', 'No se pudo completar la operación.');
  }
}
