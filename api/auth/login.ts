import type { VercelRequest, VercelResponse } from '@vercel/node';
import { compare } from 'bcryptjs';
import { z } from 'zod';
import { createSessionCookie } from '../_shared/auth.js';
import { apiError, assertPayloadSize, json, methodNotAllowed } from '../_shared/http.js';

const bodySchema = z.object({ password: z.string().min(1).max(256) });
const attempts = new Map<string, { count: number; resetAt: number }>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return methodNotAllowed(req, res, ['POST']);
  if (!assertPayloadSize(req, 2_000)) return apiError(res, 413, 'PAYLOAD_TOO_LARGE', 'Solicitud inválida.');
  const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? 'unknown')
    .split(',')[0]
    ?.trim() ?? 'unknown';
  const now = Date.now();
  const current = attempts.get(ip);
  if (current && current.resetAt > now && current.count >= 5)
    return apiError(res, 429, 'RATE_LIMITED', 'Demasiados intentos. Espera unos minutos.');
  if (!current || current.resetAt <= now) attempts.set(ip, { count: 0, resetAt: now + 15 * 60_000 });
  const parsed = bodySchema.safeParse(req.body);
  const hash = process.env.APP_PASSWORD_HASH;
  const valid = parsed.success && hash ? await compare(parsed.data.password, hash) : false;
  if (!valid) {
    const state = attempts.get(ip) ?? { count: 0, resetAt: now + 15 * 60_000 };
    attempts.set(ip, { ...state, count: state.count + 1 });
    return apiError(res, 401, 'INVALID_CREDENTIALS', 'Credenciales incorrectas.');
  }
  attempts.delete(ip);
  res.setHeader('Set-Cookie', await createSessionCookie());
  return json(res, 200, { authenticated: true });
}
