import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser();
    const { id } = await ctx.params;

    const budget = await prisma.budget.findUniqueOrThrow({
      where: { id },
      include: { lineas: { orderBy: { orden: 'asc' } } },
    });

    const startDate = new Date(`${budget.anio}-01-01`);
    const endDate   = new Date(`${budget.anio}-12-31T23:59:59`);

    // Fetch actual data for the budget year
    const [donaciones, gastos, planillas] = await Promise.all([
      prisma.donation.aggregate({
        where: { date: { gte: startDate, lte: endDate } },
        _sum: { amount: true },
      }),
      prisma.expense.findMany({
        where: { date: { gte: startDate, lte: endDate } },
        include: { category: true },
      }),
      prisma.payroll.findMany({
        where: {
          year:  budget.anio,
        },
      }),
    ]);

    const realIngresos = Number(donaciones._sum.amount ?? 0);
    const realGastos   = gastos.reduce((s, g) => s + Number(g.amount), 0) +
                         planillas.reduce((s, p) => s + Number(p.totalNet ?? 0), 0);

    const presupuestoIngresos = budget.lineas.filter(l => l.tipo === 'ingreso').reduce((s, l) => s + Number(l.monto), 0);
    const presupuestoGastos   = budget.lineas.filter(l => l.tipo === 'gasto').reduce((s, l) => s + Number(l.monto), 0);

    // Group expenses by category for detail
    const gastosPorCategoria = gastos.reduce((acc: Record<string, number>, g) => {
      const cat = g.category?.name ?? 'Sin categoría';
      acc[cat] = (acc[cat] ?? 0) + Number(g.amount);
      return acc;
    }, {});

    return ok({
      budget: {
        id: budget.id,
        nombre: budget.nombre,
        anio: budget.anio,
        estado: budget.estado,
        lineas: budget.lineas,
        presupuestoIngresos,
        presupuestoGastos,
        presupuestoNeto: presupuestoIngresos - presupuestoGastos,
      },
      real: {
        ingresos: realIngresos,
        gastos: realGastos,
        neto: realIngresos - realGastos,
        gastosPorCategoria,
        planillasCount: planillas.length,
      },
      variacion: {
        ingresos: realIngresos - presupuestoIngresos,
        gastos: realGastos - presupuestoGastos,
        neto: (realIngresos - realGastos) - (presupuestoIngresos - presupuestoGastos),
        ingresosPorc: presupuestoIngresos > 0 ? Math.round((realIngresos / presupuestoIngresos) * 100) : 0,
        gastosPorc:   presupuestoGastos   > 0 ? Math.round((realGastos   / presupuestoGastos)   * 100) : 0,
      },
    });
  } catch (e) { return apiError(e); }
}
