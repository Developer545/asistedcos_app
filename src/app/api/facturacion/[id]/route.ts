import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';
import { asientoFactura } from '@/lib/contabilidad/auto-asientos';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser();
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
    await getCurrentUser();
    const { id } = await ctx.params;
    const { status, voidReason } = await req.json();

    // Obtener estado anterior para detectar transición → EMITIDO
    const prev = await prisma.invoice.findUnique({ where: { id }, select: { status: true } });

    const invoice = await prisma.invoice.update({
      where: { id },
      data:  { status, voidReason },
      include: { details: true },
    });

    // Auto-asiento contable al emitir
    if (status === 'EMITIDO' && prev?.status !== 'EMITIDO') {
      asientoFactura(id); // fire-and-forget: no await para no bloquear
    }

    return ok(invoice);
  } catch (e) { return apiError(e); }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser();
    const { id } = await ctx.params;
    const inv = await prisma.invoice.findUnique({ where: { id } });
    if (inv?.status === 'EMITIDO') return apiError('No se puede eliminar un documento emitido', 400);
    await prisma.invoice.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) { return apiError(e); }
}
