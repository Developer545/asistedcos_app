import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, created, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    await getCurrentUser();
    const data = await prisma.webCampaign.findMany({ orderBy: { createdAt: 'desc' } });
    return ok(data);
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    await getCurrentUser();
    const body = await req.json();
    const { titulo, descripcion, fechaEvento, fechaFin, metaUnidades, recaudadoUnidades, unidadLabel, aporteSugerido, coverImage, activo } = body;
    if (!titulo?.trim()) return apiError('El título es requerido', 400);
    const campaign = await prisma.webCampaign.create({
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
        activo: activo ?? true,
      },
    });
    return created(campaign);
  } catch (e) { return apiError(e); }
}
