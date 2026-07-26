import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSession } from '../_shared/auth.js';
import { db } from '../_shared/firebase.js';
import { apiError, assertPayloadSize, json, methodNotAllowed } from '../_shared/http.js';
import { appSettingsSchema } from '../_shared/schemas.js';

const defaults = {
  theme: 'LIGHT' as const,
  catalogDataSource: 'OFFICIAL_STATIC' as const,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await requireSession(req);
    const reference = db().collection('app').doc('settings');

    if (req.method === 'GET') {
      const snapshot = await reference.get();
      const parsed = appSettingsSchema.safeParse(snapshot.data());
      return json(res, 200, parsed.success ? parsed.data : defaults);
    }

    if (req.method === 'PUT') {
      if (!assertPayloadSize(req, 2_000))
        return apiError(res, 413, 'PAYLOAD_TOO_LARGE', 'Solicitud inválida.');
      const parsed = appSettingsSchema.safeParse(req.body);
      if (!parsed.success)
        return apiError(res, 400, 'VALIDATION_ERROR', 'Los ajustes no son válidos.');
      await reference.set({ ...parsed.data, updatedAt: new Date().toISOString() }, { merge: true });
      return json(res, 200, parsed.data);
    }

    return methodNotAllowed(req, res, ['GET', 'PUT']);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED')
      return apiError(res, 401, 'UNAUTHORIZED', 'Sesión no válida.');
    return apiError(res, 500, 'SETTINGS_ERROR', 'No se pudieron guardar los ajustes.');
  }
}
