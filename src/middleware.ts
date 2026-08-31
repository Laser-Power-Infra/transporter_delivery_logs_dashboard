import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'auth_token';
const JWT_SECRET_STRING = process.env.JWT_SECRET || 'transporter-dashboard-super-secret-jwt-key-2026-laser-power';
const JWT_SECRET_KEY = new TextEncoder().encode(JWT_SECRET_STRING);

// Protected routes requiring valid JWT authentication
const PROTECTED_PREFIXES = [
  '/api/deliveries',
  '/api/sync',
  '/api/audit-logs',
  '/api/users',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Check if target URL matches a protected API route
  const isProtectedApi = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!isProtectedApi) {
    return NextResponse.next();
  }

  // Extract JWT token from cookie or Authorization header
  let token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Authentication required. Please log in.' },
      { status: 401 }
    );
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY);
    
    // Pass user identity headers downstream to API route handlers
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-id', String(payload.userId || ''));
    requestHeaders.set('x-user-email', String(payload.email || ''));
    requestHeaders.set('x-user-role', String(payload.role || ''));

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Session expired or invalid token. Please log in again.' },
      { status: 401 }
    );
  }
}

export const config = {
  matcher: [
    '/api/deliveries/:path*',
    '/api/sync',
    '/api/audit-logs/:path*',
    '/api/users/:path*',
  ],
};
