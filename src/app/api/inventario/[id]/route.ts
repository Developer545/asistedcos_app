import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser();
    const { id } = await ctx.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        kardex:  { orderBy: { date: 'desc' }, take: 50 },
      },
    });
    if (!product) return apiError('Producto no encontrado', 404);
    return ok(product);
  } catch (e) { return apiError(e); }
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser();
    const { id } = await ctx.params;
    const body = await req.json();
    const { code, name, description, unit, minStock, projectId, active } = body;
    const product = await prisma.product.update({
      where: { id },
      data: { code, name, description, unit, minStock, projectId: projectId || null, active },
    });
    return ok(product);
  } catch (e) { return apiError(e); }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser();
    const { id } = await ctx.params;
    await prisma.product.update({ where: { id }, data: { active: false } });
    return ok({ deleted: true });
  } catch (e) { return apiError(e); }
}
