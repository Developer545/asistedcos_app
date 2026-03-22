import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { ok, created, apiError } from '@/lib/response';
import { UnauthorizedError, ValidationError, ForbiddenError } from '@/lib/errors';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    const cats = await prisma.expenseCategory.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { expenses: true } } },
    });
    return NextResponse.json(ok(cats));
  } catch (err) { return apiError(err); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (user.role !== 'ADMIN') throw new ForbiddenError();
    const { name, description } = await req.json();
    if (!name?.trim()) throw new ValidationError('El nombre de la categoría es requerido');
    const cat = await prisma.expenseCategory.create({
      data: { name: name.trim(), description: description || null },
    });
    return NextResponse.json(created(cat));
  } catch (err) { return apiError(err); }
}
