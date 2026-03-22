import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, created, apiError, paginate, parsePagination } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await getCurrentUser();
    const { page, limit, skip } = parsePagination(req);
    const status = req.nextUrl.searchParams.get('status') ?? '';

    const where = status ? { status: status as 'BORRADOR' | 'EMITIDO' | 'ANULADO' } : {};

    const [data, total] = await prisma.$transaction([
      prisma.retentionCert.findMany({
        where, skip, take: limit, orderBy: { date: 'desc' },
      }),
      prisma.retentionCert.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    await getCurrentUser();
    const body = await req.json();
    const {
      date, subjectName, subjectNit, subjectDui,
      serviceDesc, grossAmount, retentionRate, ivaRetained, notes,
    } = body;

    if (!subjectName)  return apiError('Nombre del sujeto requerido', 400);
    if (!serviceDesc)  return apiError('Descripción del servicio requerida', 400);
    if (!grossAmount)  return apiError('Monto bruto requerido', 400);

    // Obtener correlativo de retenciones
    const corr = await prisma.correlativo.upsert({
      where:  { dteType: 'RETENCION' },
      create: { dteType: 'RETENCION', prefix: 'RET', current: 1 },
      update: { current: { increment: 1 } },
    });
    const number = `RET-${String(corr.current).padStart(8, '0')}`;

    // Datos del agente retenedor (ONG)
    const orgCfg = await prisma.orgConfig.findMany({
      where: { key: { in: ['org_name', 'org_nrc', 'org_nit'] } },
    });
    const cfg = Object.fromEntries(orgCfg.map(c => [c.key, c.value]));

    const rate            = Number(retentionRate) || 0.10;
    const gross           = Number(grossAmount);
    const retentionAmount = Math.round(gross * rate * 100) / 100;

    const cert = await prisma.retentionCert.create({
      data: {
        number,
        date:            date ? new Date(date) : new Date(),
        agentName:       cfg['org_name'] || 'Fundación ASISTEDCOS',
        agentNrc:        cfg['org_nrc']  || '',
        agentNit:        cfg['org_nit']  || '',
        subjectName,
        subjectNit,
        subjectDui,
        serviceDesc,
        grossAmount:     gross,
        retentionRate:   rate,
        retentionAmount,
        ivaRetained:     Number(ivaRetained) || 0,
        notes,
      },
    });
    return created(cert);
  } catch (e) { return apiError(e); }
}
