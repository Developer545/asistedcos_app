import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  verifyRefreshToken,
  signAccessToken,
  signRefreshToken,
  setAuthCookies,
  getRefreshToken,
} from '@/lib/auth';

/**
 * POST /api/auth/refresh
 * Uses the refresh token cookie to issue a new access token (+ rotate refresh token).
 * Public route — no JWT middleware check.
 */
export async function POST() {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const tokenData = await verifyRefreshToken(refreshToken);
    if (!tokenData) {
      return NextResponse.json({ error: 'Sesión expirada' }, { status: 401 });
    }

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({ where: { id: tokenData.sub } });
    if (!user || !user.active) {
      return NextResponse.json({ error: 'Usuario inactivo' }, { status: 401 });
    }

    // Issue new tokens (rotate refresh token)
    const payload = { sub: user.id, role: user.role, name: user.name };
    const [newAccess, newRefresh] = await Promise.all([
      signAccessToken(payload),
      signRefreshToken(payload),
    ]);

    await setAuthCookies(newAccess, newRefresh);
    return NextResponse.json({ success: true, name: user.name, role: user.role });

  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
