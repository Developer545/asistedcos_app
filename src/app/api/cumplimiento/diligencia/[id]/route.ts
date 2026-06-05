import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser();
    const { id } = await ctx.params;
    const data = await prisma.donorDiligencia.findUniqueOrThrow({
      where: { id },
      include: { donor: { select: { id: true, name: true, nit: true, dui: true, email: true, isCompany: true } } },
    });
    return ok(data);
  } catch (e) { return apiError(e); }
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const user = await getCurrentUser();
    const { id } = await ctx.params;
    const {
      nivelRiesgo, tipoFuente, fuenteFondos, propositoFondos,
      montoAnualEstimado, verificadoOFAC, verificadoONU, verificadoINTERPOL,
      fechaVerificacion, estado, observaciones, documentos, proximaRevision,
    } = await req.json();

    const previo = await prisma.donorDiligencia.findUniqueOrThrow({ where: { id } });

    const updated = await prisma.donorDiligencia.update({
      where: { id },
      data: {
        nivelRiesgo:         nivelRiesgo        ?? undefined,
        tipoFuente:          tipoFuente         ?? undefined,
        fuenteFondos:        fuenteFondos       ?? null,
        propositoFondos:     propositoFondos    ?? null,
        montoAnualEstimado:  montoAnualEstimado != null ? parseFloat(montoAnualEstimado) : null,
        verificadoOFAC:      verificadoOFAC     ?? undefined,
        verificadoONU:       verificadoONU      ?? undefined,
        verificadoINTERPOL:  verificadoINTERPOL ?? undefined,
        fechaVerificacion:   fechaVerificacion  ? new Date(fechaVerificacion) : null,
        estado:              estado             ?? undefined,
        observaciones:       observaciones      ?? null,
        documentos:          documentos         ?? undefined,
        revisadoPor:         user?.sub          ?? null,
        fechaRevision:       estado && estado !== previo.estado ? new Date() : undefined,
        proximaRevision:     proximaRevision    ? new Date(proximaRevision) : null,
      },
      include: { donor: { select: { id: true, name: true } } },
    });

    // Si se aprueba, descartar alertas DONANTE_SIN_DD pendientes
    if (estado === 'APROBADA' && previo.estado !== 'APROBADA') {
      await prisma.amlAlerta.updateMany({
        where: { donorId: previo.donorId, tipo: 'DONANTE_SIN_DD', estado: 'PENDIENTE' },
        data: { estado: 'DESCARTADA', notasRevision: 'Diligencia completada y aprobada' },
      });
    }

    return ok(updated);
  } catch (e) { return apiError(e); }
}
