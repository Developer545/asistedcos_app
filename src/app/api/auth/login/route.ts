import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signAccessToken, signRefreshToken, setAuthCookies } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError, ValidationError } from '@/lib/errors';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      throw new ValidationError('Correo y contraseña son requeridos');
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user || !user.active) throw new UnauthorizedError('Credenciales inválidas');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedError('Credenciales inválidas');

    const payload = { sub: user.id, role: user.role, name: user.name };
    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken(payload),
      signRefreshToken(payload),
    ]);

    await setAuthCookies(accessToken, refreshToken);
    return NextResponse.json(ok({ name: user.name, role: user.role }));

  } catch (err: unknown) {
    return apiError(err);
  }
}
