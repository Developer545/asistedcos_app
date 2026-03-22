import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, created, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me) return apiError('No autorizado', 401);
    if (me.role !== 'ADMIN') return apiError('Solo ADMIN puede ver usuarios', 403);
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
    return ok(users);
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me) return apiError('No autorizado', 401);
    if (me.role !== 'ADMIN') return apiError('Solo ADMIN puede crear usuarios', 403);
    const { name, email, password, role } = await req.json();
    if (!name || !email || !password) return apiError('Nombre, correo y contraseña son requeridos', 400);
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return apiError('Ya existe un usuario con ese correo', 409);
    const hash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hash, role: role ?? 'USER' },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });
    return created(user);
  } catch (e) { return apiError(e); }
}
