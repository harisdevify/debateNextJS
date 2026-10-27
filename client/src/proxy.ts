import { NextResponse } from 'next/server';

// The API owns the httpOnly cookie and verifies it on every protected request.
// On separate hosts that cookie is intentionally absent from Next requests.
// /profile and /video wait for AuthProvider's /auth/me before mounting content.
export function proxy() {
  return NextResponse.next();
}

export const config = { matcher: ['/profile/:path*', '/video/:path*'] };
