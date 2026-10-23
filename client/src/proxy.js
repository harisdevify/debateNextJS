import { NextResponse } from 'next/server';

// Next.js 16: `middleware` was renamed to `proxy`.
// Fast gate only (is the cookie present?). The API verifies the JWT for real
// and the pages redirect if /auth/me says the session is invalid.
// NOTE: the cookie is set by the API, so this works when client and API share
// a domain (localhost in dev). On separate domains the in-page gates still apply.
const PROTECTED = ['/profile', '/video'];

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (isProtected && !request.cookies.has('accessToken')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/profile/:path*', '/video/:path*'],
};
