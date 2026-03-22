import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser(req);
    const { id } = await ctx.params;
    const payroll = await prisma.payroll.findUnique({
      where: { id },
      include: { details: true },
    });
    if (!payroll) return apiError('Planilla no encontrada', 404);
    return ok(payroll);
  } catch (e) { return apiError(e); }
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser(req);
    const { id } = await ctx.params;
    const { status } = await req.json();
    const payroll = await prisma.payroll.update({
      where: { id },
      data: { status },
      include: { details: true },
    });
    return ok(payroll);
  } catch (e) { return apiError(e); }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser(req);
    const { id } = await ctx.params;
    const p = await prisma.payroll.findUnique({ where: { id } });
    if (p?.status !== 'BORRADOR') return apiError('Solo se pueden eliminar planillas en Borrador', 400);
    await prisma.payroll.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) { return apiError(e); }
}
