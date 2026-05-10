import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser();
    const { id } = await ctx.params;
    const ros = await prisma.rOS.findUniqueOrThrow({ where: { id } });
    if (ros.estado === 'ENVIADO') return apiError('No se puede editar un ROS ya enviado', 400);

    const { donorId, descripcion, montoEstimado, fechaOperacion, tipoActividad, mediosUtilizados } = await req.json();

    const updated = await prisma.rOS.update({
      where: { id },
      data: {
        donorId:          donorId         ?? null,
        descripcion:      descripcion?.trim().slice(0, 2000) ?? undefined,
        montoEstimado:    montoEstimado   != null ? parseFloat(montoEstimado) : null,
        fechaOperacion:   fechaOperacion  ? new Date(fechaOperacion) : undefined,
        tipoActividad:    tipoActividad?.trim().slice(0, 300) ?? undefined,
        mediosUtilizados: mediosUtilizados ?? null,
      },
      include: { donor: { select: { id: true, name: true } }, alertas: { select: { id: true, tipo: true } } },
    });
    return ok(updated);
  } catch (e) { return apiError(e); }
}

// PATCH: action = 'enviar'
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser();
    const { id } = await ctx.params;
    const { action, referencia } = await req.json();

    if (action !== 'enviar') return apiError('Acción no válida. Use: enviar', 400);

    const ros = await prisma.rOS.findUniqueOrThrow({ where: { id } });
    if (ros.estado === 'ENVIADO') return apiError('El ROS ya fue enviado', 400);

    const updated = await prisma.rOS.update({
      where: { id },
      data: {
        estado:     'ENVIADO',
        fechaEnvio: new Date(),
        referencia: referencia ?? null,
      },
    });
    return ok(updated);
  } catch (e) { return apiError(e); }
}
