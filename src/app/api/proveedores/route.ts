import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, created, apiError, paginate, parsePagination } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await getCurrentUser();
    const { page, limit, skip } = parsePagination(req);
    const search = req.nextUrl.searchParams.get('search') ?? '';

    const where = search
      ? { OR: [
          { name:    { contains: search, mode: 'insensitive' as const } },
          { nrc:     { contains: search, mode: 'insensitive' as const } },
          { email:   { contains: search, mode: 'insensitive' as const } },
          { contact: { contains: search, mode: 'insensitive' as const } },
        ]}
      : {};

    const [data, total] = await prisma.$transaction([
      prisma.supplier.findMany({ where, skip, take: limit, orderBy: { name: 'asc' },
        include: { _count: { select: { purchases: true, expenses: true } } } }),
      prisma.supplier.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    await getCurrentUser();
    const body = await req.json();
    const { name, nrc, nit, dui, email, phone, address, contact, notes } = body;
    if (!name?.trim()) return apiError('El nombre es requerido', 400);
    const supplier = await prisma.supplier.create({
      data: { name: name.trim(), nrc, nit, dui, email, phone, address, contact, notes },
    });
    return created(supplier);
  } catch (e) { return apiError(e); }
}
