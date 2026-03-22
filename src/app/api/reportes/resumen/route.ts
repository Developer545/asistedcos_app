import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await getCurrentUser();
    const year  = parseInt(req.nextUrl.searchParams.get('year') ?? String(new Date().getFullYear()));
    const from  = new Date(year, 0, 1);
    const to    = new Date(year, 11, 31, 23, 59, 59);

    const [
      donaciones, gastos, compras, beneficiarios,
      voluntarios, proyectos, planillas,
      donacionesPorMes, gastosPorMes,
    ] = await prisma.$transaction([
      // Total donaciones del año
      prisma.donation.aggregate({ where: { date: { gte: from, lte: to } }, _sum: { amount: true }, _count: true }),
      // Total gastos del año pagados
      prisma.expense.aggregate({ where: { date: { gte: from, lte: to }, status: 'PAGADO' }, _sum: { amount: true }, _count: true }),
      // Total compras
      prisma.purchase.aggregate({ where: { date: { gte: from, lte: to }, status: 'RECIBIDO' }, _sum: { total: true }, _count: true }),
      // Beneficiarios activos
      prisma.beneficiary.count({ where: { status: 'ACTIVO' } }),
      // Voluntarios activos
      prisma.volunteer.count({ where: { status: 'ACTIVO' } }),
      // Proyectos activos
      prisma.project.count({ where: { active: true } }),
      // Planillas del año
      prisma.payroll.findMany({ where: { year, status: { not: 'BORRADOR' } }, include: { details: true } }),
      // Donaciones por mes (raw para gráfica)
      prisma.donation.findMany({
        where: { date: { gte: from, lte: to } },
        select: { date: true, amount: true },
      }),
      // Gastos por mes
      prisma.expense.findMany({
        where: { date: { gte: from, lte: to }, status: 'PAGADO' },
        select: { date: true, amount: true },
      }),
    ]);

    // Agrupar por mes
    const byMonth = (items: { date: Date; amount: unknown }[]) => {
      const months = Array(12).fill(0);
      for (const item of items) {
        const m = new Date(item.date).getMonth();
        months[m] += Number(item.amount);
      }
      return months;
    };

    const donPorMes   = byMonth(donacionesPorMes);
    const gastPorMes  = byMonth(gastosPorMes);

    // Planilla resumen
    const totalPlanilla = planillas.reduce((s, p) => s + Number(p.totalGross), 0);
    const totalNeto     = planillas.reduce((s, p) => s + Number(p.totalNet), 0);

    // IVA a declarar
    const [ventasIva, comprasIva] = await prisma.$transaction([
      prisma.invoice.aggregate({
        where: { date: { gte: from, lte: to }, status: 'EMITIDO' },
        _sum: { ivaAmount: true },
      }),
      prisma.purchase.aggregate({
        where: { date: { gte: from, lte: to }, status: 'RECIBIDO' },
        _sum: { iva: true },
      }),
    ]);

    const debitoFiscal  = Number(ventasIva._sum.ivaAmount ?? 0);
    const creditoFiscal = Number(comprasIva._sum.iva ?? 0);
    const ivaAPagar     = Math.max(0, debitoFiscal - creditoFiscal);

    return ok({
      year,
      donaciones: { total: Number(donaciones._sum.amount ?? 0), count: donaciones._count },
      gastos:     { total: Number(gastos._sum.amount ?? 0),    count: gastos._count },
      compras:    { total: Number(compras._sum.total ?? 0),    count: compras._count },
      beneficiarios, voluntarios, proyectos,
      planilla:   { totalGross: totalPlanilla, totalNet: totalNeto, meses: planillas.length },
      iva:        { debitoFiscal, creditoFiscal, ivaAPagar },
      charts: {
        donacionesPorMes: donPorMes,
        gastosPorMes:     gastPorMes,
      },
    });
  } catch (e) { return apiError(e); }
}
