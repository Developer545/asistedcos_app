import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, created, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await getCurrentUser();
    const estado      = req.nextUrl.searchParams.get('estado') ?? undefined;
    const nivelRiesgo = req.nextUrl.searchParams.get('nivelRiesgo') ?? undefined;
    const where: Record<string, unknown> = {};
    if (estado)      where.estado      = estado;
    if (nivelRiesgo) where.nivelRiesgo = nivelRiesgo;

    const data = await prisma.donorDiligencia.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        donor: { select: { id: true, name: true, nit: true, dui: true, email: true, isCompany: true } },
      },
    });
    return ok(data);
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const {
      donorId, nivelRiesgo, tipoFuente, fuenteFondos, propositoFondos,
      montoAnualEstimado, verificadoOFAC, verificadoONU, verificadoINTERPOL,
      fechaVerificacion, estado, observaciones, documentos, proximaRevision,
    } = await req.json();

    if (!donorId) return apiError('El donante es requerido', 400);

    // Check if already exists
    const existe = await prisma.donorDiligencia.findUnique({ where: { donorId } });
    if (existe) return apiError('Ya existe una diligencia para este donante. Use PUT para actualizar.', 409);

    const diligencia = await prisma.donorDiligencia.create({
      data: {
        donorId,
        nivelRiesgo:         nivelRiesgo         ?? 'BAJO',
        tipoFuente:          tipoFuente          ?? 'NACIONAL',
        fuenteFondos:        fuenteFondos        ?? null,
        propositoFondos:     propositoFondos     ?? null,
        montoAnualEstimado:  montoAnualEstimado  ? parseFloat(montoAnualEstimado) : null,
        verificadoOFAC:      verificadoOFAC      ?? false,
        verificadoONU:       verificadoONU       ?? false,
        verificadoINTERPOL:  verificadoINTERPOL  ?? false,
        fechaVerificacion:   fechaVerificacion   ? new Date(fechaVerificacion) : null,
        estado:              estado              ?? 'PENDIENTE',
        observaciones:       observaciones       ?? null,
        documentos:          documentos          ?? null,
        revisadoPor:         user?.id            ?? null,
        fechaRevision:       estado && estado !== 'PENDIENTE' ? new Date() : null,
        proximaRevision:     proximaRevision     ? new Date(proximaRevision) : null,
      },
      include: { donor: { select: { id: true, name: true } } },
    });

    // Si se aprobó, descartar alertas DONANTE_SIN_DD pendientes de ese donor
    if (estado === 'APROBADA') {
      await prisma.amlAlerta.updateMany({
        where: { donorId, tipo: 'DONANTE_SIN_DD', estado: 'PENDIENTE' },
        data: { estado: 'DESCARTADA', notasRevision: 'Diligencia completada y aprobada' },
      });
    }

    return created(diligencia);
  } catch (e) { return apiError(e); }
}
