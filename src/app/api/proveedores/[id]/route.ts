import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser();
    const { id } = await ctx.params;
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: { _count: { select: { purchases: true, expenses: true } } },
    });
    if (!supplier) return apiError('Proveedor no encontrado', 404);
    return ok(supplier);
  } catch (e) { return apiError(e); }
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser();
    const { id } = await ctx.params;
    const body = await req.json();
    const { name, nrc, nit, dui, email, phone, address, contact, active, notes } = body;
    const supplier = await prisma.supplier.update({
      where: { id },
      data: { name, nrc, nit, dui, email, phone, address, contact, active, notes },
    });
    return ok(supplier);
  } catch (e) { return apiError(e); }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser();
    const { id } = await ctx.params;
    await prisma.supplier.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) { return apiError(e); }
}
