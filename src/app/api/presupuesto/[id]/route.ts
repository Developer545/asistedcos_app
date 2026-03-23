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
    return ok({
      ...budget,
      totalIngresos: budget.lineas.filter(l => l.tipo === 'ingreso').reduce((s, l) => s + Number(l.monto), 0),
      totalGastos:   budget.lineas.filter(l => l.tipo === 'gasto').reduce((s, l) => s + Number(l.monto), 0),
    });
  } catch (e) { return apiError(e); }
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser();
    const { id } = await ctx.params;
    const { nombre, anio, descripcion, estado, lineas } = await req.json();
    if (!nombre?.trim()) return apiError('El nombre es requerido', 400);

    // Delete old lines and recreate
    await prisma.budgetLine.deleteMany({ where: { budgetId: id } });

    const budget = await prisma.budget.update({
      where: { id },
      data: {
        nombre:      nombre.trim().slice(0, 200),
        anio:        parseInt(anio),
        descripcion: descripcion?.trim().slice(0, 500) ?? null,
        estado:      ['Borrador','Aprobado','Cerrado'].includes(estado) ? estado : 'Borrador',
        updatedAt:   new Date(),
        lineas: {
          create: (Array.isArray(lineas) ? lineas : []).slice(0, 200).map((l: Record<string, unknown>, i: number) => ({
            tipo:        ['ingreso','gasto'].includes(String(l.tipo)) ? String(l.tipo) : 'gasto',
            categoria:   String(l.categoria ?? '').slice(0, 100),
            descripcion: l.descripcion ? String(l.descripcion).slice(0, 300) : null,
            monto:       Math.max(0, parseFloat(String(l.monto)) || 0),
            orden:       i,
          })),
        },
      },
      include: { lineas: { orderBy: { orden: 'asc' } } },
    });
    return ok(budget);
  } catch (e) { return apiError(e); }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser();
    const { id } = await ctx.params;
    await prisma.budget.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) { return apiError(e); }
}
