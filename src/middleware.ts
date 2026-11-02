import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'auth_token';
const JWT_SECRET_STRING = process.env.JWT_SECRET || 'transporter-dashboard-super-secret-jwt-key-2026-laser-power';
const JWT_SECRET_KEY = new TextEncoder().encode(JWT_SECRET_STRING);

// Routes reachable without a session.
const PUBLIC_PAGES = ['/login'];
const PUBLIC_APIS = ['/api/auth/login', '/api/auth/logout', '/api/auth/forgot-password', '/api/health'];

// Non-GET endpoints a read-only (VIEWER) account may still call (own session / own password only).
const VIEWER_ALLOWED_WRITES = ['/api/auth/logout', '/api/auth/change-password'];

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function matches(pathname: string, list: string[]) {
  return list.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function unauthorized(req: NextRequest, isApi: boolean, message: string) {
  if (isApi) {
    return NextResponse.json({ success: false, error: message }, { status: 401 });
  }
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = '';
  return NextResponse.redirect(loginUrl);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith('/api/');

  // Never trust identity headers coming from the client.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.delete('x-user-id');
  requestHeaders.delete('x-user-email');
  requestHeaders.delete('x-user-role');

  if (matches(pathname, PUBLIC_PAGES) || matches(pathname, PUBLIC_APIS)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
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
    return unauthorized(req, isApi, 'Unauthorized: Authentication required. Please log in.');
  }

  let payload: Record<string, unknown>;
  try {
    ({ payload } = await jwtVerify(token, JWT_SECRET_KEY));
  } catch {
    return unauthorized(req, isApi, 'Unauthorized: Session expired or invalid token. Please log in again.');
  }

  // Read-only accounts: block every mutating API call up-front (handlers re-check against the DB role).
  if (
    isApi &&
    payload.role === 'VIEWER' &&
    !SAFE_METHODS.has(req.method) &&
    !matches(pathname, VIEWER_ALLOWED_WRITES)
  ) {
    return NextResponse.json(
      { success: false, error: 'Forbidden: This is a read-only account and cannot modify data.' },
      { status: 403 }
    );
  }

  // Pass user identity headers downstream to route handlers
  requestHeaders.set('x-user-id', String(payload.userId || ''));
  requestHeaders.set('x-user-email', String(payload.email || ''));
  requestHeaders.set('x-user-role', String(payload.role || ''));

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // Run on every page and API route except Next.js internals and static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|css|js|map|txt)$).*)'],
};
