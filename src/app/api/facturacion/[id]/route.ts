import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser(req);
    const { id } = await ctx.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { details: true },
    });
    if (!invoice) return apiError('Documento no encontrado', 404);
    return ok(invoice);
  } catch (e) { return apiError(e); }
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser(req);
    const { id } = await ctx.params;
    const { status, voidReason } = await req.json();
    const invoice = await prisma.invoice.update({
      where: { id },
      data:  { status, voidReason },
      include: { details: true },
    });
    return ok(invoice);
  } catch (e) { return apiError(e); }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser(req);
    const { id } = await ctx.params;
    const inv = await prisma.invoice.findUnique({ where: { id } });
    if (inv?.status === 'EMITIDO') return apiError('No se puede eliminar un documento emitido', 400);
    await prisma.invoice.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) { return apiError(e); }
}
