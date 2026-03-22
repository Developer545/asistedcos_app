/**
 * auth.ts — JWT helpers usando 'jose' (Edge-compatible).
 * Sin multi-tenant. Roles: ADMIN | USER.
 */

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { UserRole } from '@prisma/client';

export type JwtPayload = {
  sub:  string;   // userId
  role: UserRole; // ADMIN | USER
  name: string;   // nombre completo para avatar
};

const ACCESS_TOKEN_NAME  = 'ong_access_token';
const REFRESH_TOKEN_NAME = 'ong_refresh_token';
const IS_PROD = process.env.NODE_ENV === 'production';

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET no configurado en .env.local');
  return new TextEncoder().encode(secret);
}

const nowSec     = () => Math.floor(Date.now() / 1000);
const ACCESS_TTL  = 15 * 60;
const REFRESH_TTL = 7 * 24 * 60 * 60;

export async function signAccessToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(nowSec() + ACCESS_TTL)
    .sign(getSecret());
}

export async function signRefreshToken(payload: Pick<JwtPayload, 'sub'>): Promise<string> {
  return new SignJWT({ sub: payload.sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(nowSec() + REFRESH_TTL)
    .sign(getSecret());
}

export async function verifyAccessToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

const COOKIE_BASE = {
  httpOnly: true,
  secure:   IS_PROD,
  sameSite: IS_PROD ? ('none' as const) : ('lax' as const),
  path:     '/',
};

export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const store = await cookies();
  store.set(ACCESS_TOKEN_NAME,  accessToken,  { ...COOKIE_BASE, maxAge: ACCESS_TTL });
  store.set(REFRESH_TOKEN_NAME, refreshToken, { ...COOKIE_BASE, maxAge: REFRESH_TTL });
}

export async function clearAuthCookies() {
  const store = await cookies();
  store.delete(ACCESS_TOKEN_NAME);
  store.delete(REFRESH_TOKEN_NAME);
}

export async function getCurrentUser(): Promise<JwtPayload | null> {
  const store = await cookies();
  const token = store.get(ACCESS_TOKEN_NAME)?.value ?? null;
  if (!token) return null;
  return verifyAccessToken(token);
}
