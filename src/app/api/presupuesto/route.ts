import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, created, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await getCurrentUser();
    const anio = req.nextUrl.searchParams.get('anio');
    const where = anio ? { anio: parseInt(anio) } : {};
    const budgets = await prisma.budget.findMany({
      where,
      include: { lineas: true },
      orderBy: { anio: 'desc' },
    });
    // Compute totals
    const data = budgets.map(b => ({
      ...b,
      totalIngresos: b.lineas.filter(l => l.tipo === 'ingreso').reduce((s, l) => s + Number(l.monto), 0),
      totalGastos:   b.lineas.filter(l => l.tipo === 'gasto').reduce((s, l) => s + Number(l.monto), 0),
      lineas: b.lineas.sort((a, b) => a.orden - b.orden),
    }));
    return ok(data);
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    await getCurrentUser();
    const { nombre, anio, descripcion, estado, lineas } = await req.json();
    if (!nombre?.trim()) return apiError('El nombre es requerido', 400);
    if (!anio || anio < 2000 || anio > 2100) return apiError('Año inválido', 400);

    const budget = await prisma.budget.create({
      data: {
        nombre: nombre.trim().slice(0, 200),
        anio: parseInt(anio),
        descripcion: descripcion?.trim().slice(0, 500) ?? null,
        estado: ['Borrador','Aprobado','Cerrado'].includes(estado) ? estado : 'Borrador',
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
      include: { lineas: true },
    });
    return created(budget);
  } catch (e) { return apiError(e); }
}
