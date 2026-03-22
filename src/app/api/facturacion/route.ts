import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, created, apiError, paginate, parsePagination } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await getCurrentUser(req);
    const { page, limit, skip } = parsePagination(req);
    const dteType = req.nextUrl.searchParams.get('dteType') ?? '';
    const status  = req.nextUrl.searchParams.get('status')  ?? '';

    const where: Record<string, unknown> = {};
    if (dteType) where.dteType = dteType;
    if (status)  where.status  = status;

    const [data, total] = await prisma.$transaction([
      prisma.invoice.findMany({
        where, skip, take: limit,
        orderBy: { date: 'desc' },
        include: { details: true },
      }),
      prisma.invoice.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    await getCurrentUser(req);
    const body = await req.json();
    const {
      dteType, date,
      issuerName, issuerNrc, issuerNit, issuerAddress,
      receiverName, receiverNrc, receiverNit, receiverDui, receiverAddress,
      paymentMethod, notes, details,
    } = body;

    if (!dteType)         return apiError('Tipo de DTE requerido', 400);
    if (!receiverName)    return apiError('Nombre del receptor requerido', 400);
    if (!details?.length) return apiError('Debe incluir al menos un ítem', 400);

    // Obtener / incrementar correlativo
    const corr = await prisma.correlativo.upsert({
      where:  { dteType },
      create: { dteType, prefix: dteTypePrefix(dteType), current: 1 },
      update: { current: { increment: 1 } },
    });

    const number = `${corr.prefix}-${String(corr.current).padStart(8, '0')}`;

    // Calcular totales
    let subtotal = 0, ivaAmount = 0;
    for (const d of details) {
      const sub = Number(d.quantity) * Number(d.unitPrice);
      subtotal += sub;
      if (d.taxable && (dteType === 'CCF' || dteType === 'NOTA_CREDITO' || dteType === 'NOTA_DEBITO')) {
        ivaAmount += sub * 0.13;
      }
    }
    const total = subtotal + ivaAmount;

    const orgConfig = await prisma.orgConfig.findMany({
      where: { key: { in: ['org_name', 'org_nrc', 'org_nit', 'org_address'] } },
    });
    const cfg = Object.fromEntries(orgConfig.map(c => [c.key, c.value]));

    const invoice = await prisma.invoice.create({
      data: {
        dteType,
        number,
        date:    date ? new Date(date) : new Date(),
        issuerName:    issuerName    || cfg['org_name']    || 'Fundación ASISTEDCOS',
        issuerNrc:     issuerNrc     || cfg['org_nrc']     || '',
        issuerNit:     issuerNit     || cfg['org_nit']     || '',
        issuerAddress: issuerAddress || cfg['org_address'] || '',
        receiverName,
        receiverNrc,
        receiverNit,
        receiverDui,
        receiverAddress,
        subtotal,
        ivaAmount,
        total,
        paymentMethod: paymentMethod ?? 'EFECTIVO',
        notes,
        details: {
          create: details.map((d: {
            description: string; quantity: number; unitPrice: number; taxable?: boolean;
          }) => ({
            description: d.description,
            quantity:    d.quantity,
            unitPrice:   d.unitPrice,
            subtotal:    Number(d.quantity) * Number(d.unitPrice),
            taxable:     d.taxable ?? true,
          })),
        },
      },
      include: { details: true },
    });

    return created(invoice);
  } catch (e) { return apiError(e); }
}

function dteTypePrefix(dteType: string): string {
  const map: Record<string, string> = {
    FACTURA:      'FAC',
    CCF:          'CCF',
    NOTA_CREDITO: 'NCR',
    NOTA_DEBITO:  'NDB',
    RETENCION:    'RET',
    DONACION:     'DON',
  };
  return map[dteType] ?? 'DOC';
}
