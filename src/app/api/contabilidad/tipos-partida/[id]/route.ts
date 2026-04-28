/**
 * API Tipos de Partida por ID — /api/contabilidad/tipos-partida/[id]
 * PUT    → editar tipo
 * DELETE → eliminar (solo si no tiene asientos asociados)
 */
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getCurrentUser();
    const { id } = await params;
    const body = await req.json();
    const { nombre, descripcion, activo, orden } = body;

    const tipo = await prisma.journalEntryType.update({
      where: { id },
      data: {
        nombre:      nombre?.trim(),
        descripcion: descripcion?.trim() || null,
        activo:      activo ?? true,
        orden:       orden ?? 0,
      },
    });
    return ok(tipo);
  } catch (e) { return apiError(e); }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getCurrentUser();
    const { id } = await params;

    const tipo = await prisma.journalEntryType.findUniqueOrThrow({ where: { id } });

    // Verificar que no haya asientos usando este tipo
    const enUso = await prisma.journalEntry.count({ where: { tipo: tipo.codigo } });
    if (enUso > 0) {
      return apiError(`No se puede eliminar — existen ${enUso} asiento(s) con este tipo`, 409);
    }

    await prisma.journalEntryType.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) { return apiError(e); }
}
