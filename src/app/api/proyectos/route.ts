import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { created, apiError, paginate, parsePagination } from '@/lib/response';
import { UnauthorizedError, ValidationError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    const { page, limit, skip } = parsePagination(req);
    const activeOnly = req.nextUrl.searchParams.get('active') === 'true';
    const where = activeOnly ? { active: true } : {};
    const [data, total] = await Promise.all([
      prisma.project.findMany({
        where, orderBy: { createdAt: 'desc' },
        skip, take: limit,
        include: {
          _count: { select: { donations: true, participations: true } },
        },
      }),
      prisma.project.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  } catch (err) { return apiError(err); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    const body = await req.json();
    const { name, description, startDate, endDate, budget } = body;
    if (!name?.trim()) throw new ValidationError('El nombre del proyecto es requerido');
    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate:   endDate   ? new Date(endDate)   : null,
        budget:    budget ? parseFloat(budget) : 0,
      },
    });
    return created(project);
  } catch (err) { return apiError(err); }
}
