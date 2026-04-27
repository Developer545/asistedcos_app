/**
 * GET /api/facturacion/[id]/json
 * Descarga el JSON DTE de un documento emitido.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser();
    const { id } = await ctx.params;

    const invoice = await prisma.invoice.findUnique({
      where:  { id },
      select: { number: true, dteType: true, jsonDte: true, status: true },
    });

    if (!invoice) return apiError('Documento no encontrado', 404);
    if (!invoice.jsonDte) return apiError('No hay JSON DTE para este documento', 404);

    const filename = `DTE-${invoice.dteType}-${invoice.number}.json`;

    return new NextResponse(JSON.stringify(invoice.jsonDte, null, 2), {
      status: 200,
      headers: {
        'Content-Type':        'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (e) { return apiError(e); }
}
