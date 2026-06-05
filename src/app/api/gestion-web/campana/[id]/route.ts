import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, noContent, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getCurrentUser();
    const { id } = await params;
    const body = await req.json();
    const { titulo, descripcion, fechaEvento, fechaFin, metaUnidades, recaudadoUnidades, unidadLabel, aporteSugerido, coverImage, activo } = body;
    const campaign = await prisma.webCampaign.update({
      where: { id },
      data: {
        titulo,
        descripcion,
        fechaEvento: fechaEvento ? new Date(fechaEvento) : null,
        fechaFin: fechaFin ? new Date(fechaFin) : null,
        metaUnidades: metaUnidades ?? 0,
        recaudadoUnidades: recaudadoUnidades ?? 0,
        unidadLabel: unidadLabel ?? 'Unidades',
        aporteSugerido: aporteSugerido ?? 25,
        coverImage,
        activo,
      },
    });
    return ok(campaign);
  } catch (e) { return apiError(e); }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getCurrentUser();
    const { id } = await params;
    await prisma.webCampaign.delete({ where: { id } });
    return noContent();
  } catch (e) { return apiError(e); }
}
