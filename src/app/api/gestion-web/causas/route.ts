import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, created, apiError, paginate, parsePagination } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await getCurrentUser();
    const { page, limit, skip } = parsePagination(req);
    const [data, total] = await prisma.$transaction([
      prisma.webCause.findMany({ skip, take: limit, orderBy: { order: 'asc' } }),
      prisma.webCause.count(),
    ]);
    return paginate(data, total, page, limit);
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    await getCurrentUser();
    const body = await req.json();
    const { titulo, descripcion, tag, coverImage, ubicacion, estado, meta, recaudado, active, order } = body;
    if (!titulo?.trim()) return apiError('El título es requerido', 400);
    const cause = await prisma.webCause.create({
      data: { titulo, descripcion, tag, coverImage, ubicacion, estado: estado ?? 'Activo', meta: meta ?? 0, recaudado: recaudado ?? 0, active: active ?? true, order: order ?? 0 },
    });
    return created(cause);
  } catch (e) { return apiError(e); }
}
