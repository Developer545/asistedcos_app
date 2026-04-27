/**
 * POST /api/facturacion/[id]/enviar-mh
 * Re-envía un DTE en estado CONTINGENCIA al Ministerio de Hacienda.
 * Útil cuando el MH estaba caído o se estaba en modo offline.
 */
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';
import { enviarDte } from '@/lib/dte/mh-api';
import { DTE_ENABLED } from '@/lib/dte/config';
import type { DteJson } from '@/lib/dte/types';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser();
    const { id } = await ctx.params;

    if (!DTE_ENABLED) {
      return apiError('DTE no habilitado. Configure DTE_MODE y credenciales en .env.local', 400);
    }

    const invoice = await prisma.invoice.findUnique({
      where:  { id },
      select: { status: true, estadoMH: true, jsonDte: true, dteType: true },
    });

    if (!invoice) return apiError('Documento no encontrado', 404);
    if (invoice.status !== 'EMITIDO') return apiError('Solo se pueden enviar documentos EMITIDOS', 400);
    if (invoice.estadoMH === 'PROCESADO') return apiError('Este DTE ya fue procesado por el MH', 400);
    if (!invoice.jsonDte) return apiError('No hay JSON DTE generado para este documento', 400);

    const resultado = await enviarDte(invoice.jsonDte as unknown as DteJson);

    await prisma.invoice.update({
      where: { id },
      data: {
        selloRecibido:     resultado.selloRecibido,
        fechaProcesamiento: new Date(resultado.fechaProcesamiento),
        estadoMH:          resultado.estado === 'PROCESADO' ? 'PROCESADO'
                         : resultado.estado === 'RECHAZADO' ? 'RECHAZADO'
                         : 'CONTINGENCIA',
        observacionesMH:   resultado.observaciones.join('; ') || null,
      },
    });

    return ok({
      estado:         resultado.estado,
      selloRecibido:  resultado.selloRecibido,
      observaciones:  resultado.observaciones,
    });
  } catch (e) { return apiError(e); }
}
