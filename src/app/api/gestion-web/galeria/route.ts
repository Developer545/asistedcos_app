import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, created, apiError, paginate, parsePagination } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await getCurrentUser();
    const { page, limit, skip } = parsePagination(req);
    const [data, total] = await prisma.$transaction([
      prisma.webGallery.findMany({ skip, take: limit, orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] }),
      prisma.webGallery.count(),
    ]);
    return paginate(data, total, page, limit);
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    await getCurrentUser();
    const { title, url, category, order } = await req.json();
    if (!url) return apiError('La URL de la imagen es requerida', 400);
    const item = await prisma.webGallery.create({
      data: { title, url, category, order: order ?? 0 },
    });
    return created(item);
  } catch (e) { return apiError(e); }
}
