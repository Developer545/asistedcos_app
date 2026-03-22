import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';
import bcrypt from 'bcryptjs';

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const me = await getCurrentUser(req);
    if (me.role !== 'ADMIN') return apiError('Solo ADMIN', 403);
    const { id } = await ctx.params;
    const { name, role, active, password } = await req.json();
    const data: Record<string, unknown> = { name, role, active };
    if (password) data.password = await bcrypt.hash(password, 12);
    const user = await prisma.user.update({
      where: { id }, data,
      select: { id: true, name: true, email: true, role: true, active: true },
    });
    return ok(user);
  } catch (e) { return apiError(e); }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const me = await getCurrentUser(req);
    if (me.role !== 'ADMIN') return apiError('Solo ADMIN', 403);
    const { id } = await ctx.params;
    if (id === me.sub) return apiError('No puedes eliminarte a ti mismo', 400);
    await prisma.user.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) { return apiError(e); }
}
