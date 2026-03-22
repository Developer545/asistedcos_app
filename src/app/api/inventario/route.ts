import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, created, apiError, paginate, parsePagination } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await getCurrentUser(req);
    const { page, limit, skip } = parsePagination(req);
    const search    = req.nextUrl.searchParams.get('search')    ?? '';
    const projectId = req.nextUrl.searchParams.get('projectId') ?? '';
    const lowStock  = req.nextUrl.searchParams.get('lowStock')  === 'true';

    const where: Record<string, unknown> = {};
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
    ];
    if (projectId) where.projectId = projectId;
    // lowStock se filtra en JS porque Prisma no soporta comparar dos campos directamente en Decimal
    where.active = true;

    const [raw, total] = await prisma.$transaction([
      prisma.product.findMany({
        where, skip, take: limit,
        orderBy: { name: 'asc' },
        include: { project: { select: { id: true, name: true } } },
      }),
      prisma.product.count({ where }),
    ]);

    const data = lowStock
      ? raw.filter(p => Number(p.stock) <= Number(p.minStock))
      : raw;

    return paginate(data, total, page, limit);
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    await getCurrentUser(req);
    const body = await req.json();
    const { code, name, description, unit, minStock, projectId } = body;
    if (!code?.trim()) return apiError('El código es requerido', 400);
    if (!name?.trim()) return apiError('El nombre es requerido', 400);

    const product = await prisma.product.create({
      data: {
        code:      code.trim().toUpperCase(),
        name:      name.trim(),
        description,
        unit:      unit ?? 'UNIDAD',
        minStock:  minStock ?? 0,
        projectId: projectId || null,
      },
    });
    return created(product);
  } catch (e) { return apiError(e); }
}
