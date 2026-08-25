import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, isValidSessionToken } from '@/lib/auth-token';

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/login') return NextResponse.next();

  if (isValidSessionToken(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/|.*\\..*).*)'],
};
