import type { VercelRequest, VercelResponse } from '@vercel/node';

export function json(res: VercelResponse, status: number, data: unknown): void {
  res.status(status).json({ data });
}

export function apiError(
  res: VercelResponse,
  status: number,
  code: string,
  message: string,
): void {
  res.status(status).json({ error: { code, message } });
}

export function methodNotAllowed(req: VercelRequest, res: VercelResponse, allowed: string[]): void {
  res.setHeader('Allow', allowed.join(', '));
  apiError(res, 405, 'METHOD_NOT_ALLOWED', `Método ${req.method ?? 'desconocido'} no permitido.`);
}

export function assertPayloadSize(req: VercelRequest, maxBytes = 32_000): boolean {
  return Number(req.headers['content-length'] ?? 0) <= maxBytes;
}

export function getPathId(req: VercelRequest): string {
  const value = req.query.id;
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}
