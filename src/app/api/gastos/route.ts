import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { ok, created, apiError, paginate, parsePagination } from '@/lib/response';
import { UnauthorizedError, ValidationError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    const { page, limit } = parsePagination(req.nextUrl.searchParams);
    const status = req.nextUrl.searchParams.get('status') ?? undefined;
    const where = status ? { status: status as 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'PAGADO' } : {};
    const [data, total] = await Promise.all([
      prisma.expense.findMany({
        where, orderBy: { date: 'desc' },
        skip: (page - 1) * limit, take: limit,
        include: {
          category: { select: { id: true, name: true } },
          project:  { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
        },
      }),
      prisma.expense.count({ where }),
    ]);
    return NextResponse.json(ok(data, paginate(total, page, limit)));
  } catch (err) { return apiError(err); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    const body = await req.json();
    const { categoryId, projectId, description, amount, date, supplierId, notes } = body;
    if (!categoryId)        throw new ValidationError('La categoría es requerida');
    if (!description?.trim()) throw new ValidationError('La descripción es requerida');
    if (!amount || amount <= 0) throw new ValidationError('El monto debe ser mayor a 0');
    const expense = await prisma.expense.create({
      data: {
        categoryId,
        projectId:   projectId  || null,
        supplierId:  supplierId  || null,
        description: description.trim(),
        amount:      parseFloat(amount),
        date:        date ? new Date(date) : new Date(),
        status:      'PENDIENTE',
        notes:       notes || null,
      },
      include: {
        category: { select: { id: true, name: true } },
        project:  { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(created(expense));
  } catch (err) { return apiError(err); }
}
