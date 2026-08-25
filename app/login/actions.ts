'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, sessionToken, verifyPassword } from '@/lib/auth-token';

export async function loginAction(formData: FormData) {
  const password = String(formData.get('password') ?? '');
  const token = verifyPassword(password);

  if (!token) redirect('/login?error=1');

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });

  redirect('/');
}

export async function logoutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect('/login');
}
