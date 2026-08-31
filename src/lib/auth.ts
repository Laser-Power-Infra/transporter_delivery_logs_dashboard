import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

export const COOKIE_NAME = 'auth_token';

const JWT_SECRET_STRING = process.env.JWT_SECRET || 'transporter-dashboard-super-secret-jwt-key-2026-laser-power';
const JWT_SECRET_KEY = new TextEncoder().encode(JWT_SECRET_STRING);

export interface UserJwtPayload {
  userId: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'OPERATOR';
}

/**
 * Securely hashes a plain text password using bcryptjs (salt rounds = 10)
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Compares a plain text password against a stored bcrypt hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  if (!hash || !password) return false;
  return bcrypt.compare(password, hash);
}

/**
 * Signs a secure Edge-compatible JWT token valid for 7 days
 */
export async function signJWT(payload: UserJwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('3650d')
    .sign(JWT_SECRET_KEY);
}

/**
 * Verifies and decodes a JWT token using HS256 secret key
 */
export async function verifyJWT(token: string): Promise<UserJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY);
    return payload as unknown as UserJwtPayload;
  } catch (err) {
    return null;
  }
}

/**
 * Extracts and verifies current session user from HTTP-Only cookie or request headers
 */
export async function getSessionUser(req?: NextRequest): Promise<UserJwtPayload | null> {
  let token: string | undefined;

  if (req) {
    token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
  } else {
    try {
      const cookieStore = cookies();
      token = cookieStore.get(COOKIE_NAME)?.value;
    } catch {
      token = undefined;
    }
  }

  if (!token) return null;
  return verifyJWT(token);
}
