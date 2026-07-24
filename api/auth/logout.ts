import type { VercelRequest, VercelResponse } from '@vercel/node';
import { clearSessionCookie } from '../_shared/auth.js';
import { json, methodNotAllowed } from '../_shared/http.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return methodNotAllowed(req, res, ['POST']);
  res.setHeader('Set-Cookie', clearSessionCookie());
  return json(res, 200, { authenticated: false });
}
