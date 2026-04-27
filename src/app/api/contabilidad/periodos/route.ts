import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, created, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    await getCurrentUser();
    const periodos = await prisma.accountingPeriod.findMany({
      orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
      include: {
        _count: { select: { entries: true } },
      },
    });
    return ok(periodos);
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    await getCurrentUser();
    const { anio, mes } = await req.json();

    if (!anio || !mes || mes < 1 || mes > 12)
      return apiError('Año y mes válidos son requeridos', 400);

    const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    const fechaInicio = new Date(anio, mes - 1, 1);
    const fechaFin    = new Date(anio, mes, 0, 23, 59, 59);

    const periodo = await prisma.accountingPeriod.create({
      data: {
        nombre:      `${MESES[mes - 1]} ${anio}`,
        anio:        parseInt(anio),
        mes:         parseInt(mes),
        fechaInicio,
        fechaFin,
        estado:      'ABIERTO',
      },
    });

    return created(periodo);
  } catch (e) { return apiError(e); }
}
