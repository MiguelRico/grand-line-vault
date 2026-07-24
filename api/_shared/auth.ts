import type { VercelRequest } from '@vercel/node';
import { parse, serialize } from 'cookie';
import { SignJWT, jwtVerify } from 'jose';

const cookieName = 'glv_session';

function secret(): Uint8Array {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('SESSION_SECRET debe tener al menos 32 caracteres.');
  return new TextEncoder().encode(value);
}

export async function createSessionCookie(): Promise<string> {
  const ttl = Number(process.env.SESSION_TTL_SECONDS ?? 604800);
  const token = await new SignJWT({ role: 'owner' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('grand-line-vault')
    .setAudience('grand-line-vault-owner')
    .setExpirationTime(`${ttl}s`)
    .sign(secret());
  return serialize(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: ttl,
  });
}

export function clearSessionCookie(): string {
  return serialize(cookieName, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    expires: new Date(0),
  });
}

export async function requireSession(req: VercelRequest): Promise<void> {
  const token = parse(req.headers.cookie ?? '')[cookieName];
  if (!token) throw new Error('UNAUTHORIZED');
  try {
    await jwtVerify(token, secret(), {
      issuer: 'grand-line-vault',
      audience: 'grand-line-vault-owner',
    });
  } catch {
    throw new Error('UNAUTHORIZED');
  }
}
