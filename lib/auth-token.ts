import { createHash, createHmac, timingSafeEqual } from 'crypto';

export const SESSION_COOKIE = 'ml_session';

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[auth] AUTH_SECRET is not set — using insecure dev default. Do this only in development.');
    return 'dev-only-insecure-secret';
  }
  throw new Error('AUTH_SECRET must be set in production');
}

function getPassword(): string {
  return process.env.APP_PASSWORD ?? '';
}

export function sessionToken(): string {
  return createHmac('sha256', getSecret()).update(`authed:${getPassword()}`).digest('hex');
}

export function verifyPassword(candidate: string): string | null {
  const password = getPassword();
  if (!password || !candidate) return null;

  const hash = (s: string) => createHash('sha256').update(s).digest();
  const ok = timingSafeEqual(hash(candidate), hash(password));
  return ok ? sessionToken() : null;
}

export function isValidSessionToken(value: string | undefined): boolean {
  if (!value) return false;
  const expected = sessionToken();
  if (value.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}
