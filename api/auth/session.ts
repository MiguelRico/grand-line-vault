import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSession } from '../_shared/auth.js';
import { apiError, json, methodNotAllowed } from '../_shared/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return methodNotAllowed(req, res, ['GET']);
  try {
    await requireSession(req);
    return json(res, 200, { authenticated: true });
  } catch {
    return apiError(res, 401, 'UNAUTHORIZED', 'Sesión no válida.');
  }
}
