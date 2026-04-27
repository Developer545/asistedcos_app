import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser();
    const { id } = await ctx.params;
    const { nombre, tipo, naturaleza, nivel, parentId, permiteMovimiento, descripcion } = await req.json();

    const cuenta = await prisma.accountChart.update({
      where: { id },
      data: {
        nombre:            nombre?.trim(),
        tipo,
        naturaleza,
        nivel,
        parentId:          parentId ?? null,
        permiteMovimiento,
        descripcion:       descripcion?.trim() ?? null,
      },
    });
    return ok(cuenta);
  } catch (e) { return apiError(e); }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser();
    const { id } = await ctx.params;

    // No eliminar si tiene movimientos
    const cuenta = await prisma.accountChart.findUniqueOrThrow({
      where: { id },
      include: { _count: { select: { lines: true, hijos: true } } },
    });

    if (cuenta._count.lines > 0)
      return apiError('No se puede eliminar: la cuenta tiene movimientos registrados', 409);
    if (cuenta._count.hijos > 0)
      return apiError('No se puede eliminar: la cuenta tiene subcuentas', 409);

    await prisma.accountChart.update({ where: { id }, data: { activa: false } });
    return ok({ message: 'Cuenta desactivada' });
  } catch (e) { return apiError(e); }
}
