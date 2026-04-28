/**
 * API Tipos de Partida — /api/contabilidad/tipos-partida
 * GET  → listar todos los tipos
 * POST → crear nuevo tipo
 */
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    await getCurrentUser();
    const tipos = await prisma.journalEntryType.findMany({
      orderBy: [{ orden: 'asc' }, { codigo: 'asc' }],
    });
    return ok(tipos);
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    await getCurrentUser();
    const body = await req.json();
    const { codigo, nombre, descripcion, orden } = body;

    if (!codigo || !nombre) return apiError('Código y nombre son requeridos', 400);

    // Validar que el código no exista
    const existing = await prisma.journalEntryType.findUnique({ where: { codigo: codigo.toUpperCase() } });
    if (existing) return apiError('Ya existe un tipo con ese código', 409);

    const tipo = await prisma.journalEntryType.create({
      data: {
        codigo:      codigo.toUpperCase().trim(),
        nombre:      nombre.trim(),
        descripcion: descripcion?.trim() || null,
        orden:       orden ?? 0,
      },
    });
    return ok(tipo, 201);
  } catch (e) { return apiError(e); }
}
