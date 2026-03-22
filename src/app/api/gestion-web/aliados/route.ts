import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, created, apiError, paginate, parsePagination } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await getCurrentUser();
    const { page, limit, skip } = parsePagination(req);
    const [data, total] = await prisma.$transaction([
      prisma.webPartner.findMany({ skip, take: limit, orderBy: { order: 'asc' } }),
      prisma.webPartner.count(),
    ]);
    return paginate(data, total, page, limit);
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    await getCurrentUser();
    const { name, logo, url, active, order } = await req.json();
    if (!name?.trim()) return apiError('El nombre es requerido', 400);
    const partner = await prisma.webPartner.create({ data: { name, logo, url, active: active ?? true, order: order ?? 0 } });
    return created(partner);
  } catch (e) { return apiError(e); }
}
