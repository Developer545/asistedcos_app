import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, created, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await getCurrentUser();
    const tipo   = req.nextUrl.searchParams.get('tipo') ?? '';
    const search = req.nextUrl.searchParams.get('search') ?? '';
    const soloMovimiento = req.nextUrl.searchParams.get('soloMovimiento') === '1';

    const where: Record<string, unknown> = { activa: true };
    if (tipo)           where.tipo = tipo;
    if (soloMovimiento) where.permiteMovimiento = true;
    if (search)         where.OR = [
      { codigo: { contains: search, mode: 'insensitive' } },
      { nombre: { contains: search, mode: 'insensitive' } },
    ];

    const cuentas = await prisma.accountChart.findMany({
      where,
      orderBy: { codigo: 'asc' },
      include: {
        parent: { select: { id: true, codigo: true, nombre: true } },
        _count:  { select: { lines: true } },
      },
    });

    return ok(cuentas);
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    await getCurrentUser();
    const { codigo, nombre, tipo, naturaleza, nivel, parentId, permiteMovimiento, descripcion } = await req.json();

    if (!codigo?.trim()) return apiError('El código es requerido', 400);
    if (!nombre?.trim()) return apiError('El nombre es requerido', 400);
    if (!tipo)           return apiError('El tipo de cuenta es requerido', 400);
    if (!naturaleza)     return apiError('La naturaleza de cuenta es requerida', 400);

    const cuenta = await prisma.accountChart.create({
      data: {
        codigo:            codigo.trim(),
        nombre:            nombre.trim(),
        tipo,
        naturaleza,
        nivel:             nivel ?? 4,
        parentId:          parentId ?? null,
        permiteMovimiento: permiteMovimiento ?? true,
        descripcion:       descripcion?.trim() ?? null,
        activa:            true,
      },
    });

    return created(cuenta);
  } catch (e) { return apiError(e); }
}
