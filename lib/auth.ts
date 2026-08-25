import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, isValidSessionToken } from './auth-token';

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return isValidSessionToken(store.get(SESSION_COOKIE)?.value);
}

export async function assertAuth(): Promise<void> {
  if (!(await isAuthenticated())) redirect('/login');
}
