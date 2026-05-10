import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await getCurrentUser();
    const estado = req.nextUrl.searchParams.get('estado') ?? undefined;
    const tipo   = req.nextUrl.searchParams.get('tipo')   ?? undefined;
    const where: Record<string, unknown> = {};
    if (estado) where.estado = estado;
    if (tipo)   where.tipo   = tipo;

    const data = await prisma.amlAlerta.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        donor:    { select: { id: true, name: true, nit: true } },
        donation: { select: { id: true, amount: true, date: true, paymentMethod: true } },
        ros:      { select: { id: true, numero: true, estado: true } },
      },
    });
    return ok(data);
  } catch (e) { return apiError(e); }
}
