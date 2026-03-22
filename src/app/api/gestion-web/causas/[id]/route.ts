import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, noContent, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getCurrentUser();
    const { id } = await params;
    const cause = await prisma.webCause.findUnique({ where: { id } });
    if (!cause) return apiError('No encontrado', 404);
    return ok(cause);
  } catch (e) { return apiError(e); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getCurrentUser();
    const { id } = await params;
    const body = await req.json();
    const { titulo, descripcion, tag, coverImage, ubicacion, estado, meta, recaudado, active, order } = body;
    const cause = await prisma.webCause.update({
      where: { id },
      data: { titulo, descripcion, tag, coverImage, ubicacion, estado: estado ?? 'Activo', meta: meta ?? 0, recaudado: recaudado ?? 0, active, order },
    });
    return ok(cause);
  } catch (e) { return apiError(e); }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getCurrentUser();
    const { id } = await params;
    await prisma.webCause.delete({ where: { id } });
    return noContent();
  } catch (e) { return apiError(e); }
}
