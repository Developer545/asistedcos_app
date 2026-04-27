import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';
import { asientoFactura } from '@/lib/contabilidad/auto-asientos';
import { buildDteJson } from '@/lib/dte/builder';
import { enviarDte } from '@/lib/dte/mh-api';

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

    // Obtener estado anterior + datos necesarios para DTE
    const prev = await prisma.invoice.findUnique({
      where:   { id },
      include: { details: true },
    });

    const invoice = await prisma.invoice.update({
      where: { id },
      data:  { status, voidReason },
      include: { details: true },
    });

    // Al emitir: generar DTE JSON y enviar al MH (o guardar en contingencia)
    if (status === 'EMITIDO' && prev?.status !== 'EMITIDO' && prev) {
      // Obtener el correlativo actual para el numeroControl
      const correlativo = await prisma.correlativo.findUnique({
        where: { dteType: prev.dteType },
        select: { current: true },
      });
      const secuencial = correlativo?.current ?? 1;

      const dteJson = buildDteJson({
        dteType:        prev.dteType,
        secuencial,
        fecha:          new Date(prev.date),
        receiverName:   prev.receiverName,
        receiverNrc:    prev.receiverNrc,
        receiverNit:    prev.receiverNit,
        receiverDui:    prev.receiverDui,
        receiverAddress: prev.receiverAddress,
        subtotal:       Number(prev.subtotal),
        ivaAmount:      Number(prev.ivaAmount),
        total:          Number(prev.total),
        paymentMethod:  prev.paymentMethod,
        details:        prev.details.map(d => ({
          description: d.description,
          quantity:    Number(d.quantity),
          unitPrice:   Number(d.unitPrice),
          subtotal:    Number(d.subtotal),
          taxable:     d.taxable,
        })),
      });

      // Enviar (o guardar en contingencia si está offline)
      const resultado = await enviarDte(dteJson);

      // Guardar resultado DTE en la factura
      await prisma.invoice.update({
        where: { id },
        data: {
          codigoGeneracion:  resultado.codigoGeneracion,
          numeroControl:     dteJson.identificacion.numeroControl,
          selloRecibido:     resultado.selloRecibido,
          fechaProcesamiento: new Date(resultado.fechaProcesamiento),
          estadoMH:          resultado.estado === 'PROCESADO' ? 'PROCESADO'
                           : resultado.estado === 'RECHAZADO' ? 'RECHAZADO'
                           : 'CONTINGENCIA',
          jsonDte:           JSON.parse(resultado.jsonDte),
          observacionesMH:   resultado.observaciones.join('; ') || null,
        },
      });

      // Auto-asiento contable (fire-and-forget)
      asientoFactura(id);
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
