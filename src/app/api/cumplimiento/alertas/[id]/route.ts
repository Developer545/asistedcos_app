import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> };

// PATCH: revisar | descartar | escalar (a ROS)
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const user = await getCurrentUser();
    const { id } = await ctx.params;
    const { action, notasRevision, rosId } = await req.json();

    const alerta = await prisma.amlAlerta.findUniqueOrThrow({ where: { id } });
    if (alerta.estado === 'DESCARTADA') return apiError('La alerta ya está descartada', 400);

    let nuevoEstado: string;
    if (action === 'revisar')   nuevoEstado = 'REVISADA';
    else if (action === 'descartar') nuevoEstado = 'DESCARTADA';
    else if (action === 'escalar')   nuevoEstado = 'ESCALADA';
    else return apiError('Acción no válida. Use: revisar | descartar | escalar', 400);

    const updated = await prisma.amlAlerta.update({
      where: { id },
      data: {
        estado:       nuevoEstado,
        revisadoPor:  user?.id ?? null,
        fechaRevision: new Date(),
        notasRevision: notasRevision ?? null,
        rosId:        action === 'escalar' && rosId ? rosId : undefined,
      },
    });
    return ok(updated);
  } catch (e) { return apiError(e); }
}
