import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser(req);
    const { id } = await ctx.params;
    const cert = await prisma.retentionCert.findUnique({ where: { id } });
    if (!cert) return apiError('Retención no encontrada', 404);
    return ok(cert);
  } catch (e) { return apiError(e); }
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser(req);
    const { id } = await ctx.params;
    const { status, notes } = await req.json();
    const cert = await prisma.retentionCert.update({
      where: { id }, data: { status, notes },
    });
    return ok(cert);
  } catch (e) { return apiError(e); }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser(req);
    const { id } = await ctx.params;
    const cert = await prisma.retentionCert.findUnique({ where: { id } });
    if (cert?.status === 'EMITIDO') return apiError('No se puede eliminar un comprobante emitido', 400);
    await prisma.retentionCert.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) { return apiError(e); }
}
