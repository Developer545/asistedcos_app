import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError } from '@/lib/errors';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    const { id } = await params;
    const body = await req.json();
    const { categoryId, projectId, description, amount, date, status, supplierId, notes } = body;
    const expense = await prisma.expense.update({
      where: { id },
      data: {
        categoryId,
        projectId:  projectId  || null,
        supplierId: supplierId || null,
        description: description?.trim(),
        amount:      amount ? parseFloat(amount) : undefined,
        date:        date ? new Date(date) : undefined,
        status:      status || undefined,
        notes:       notes || null,
      },
      include: {
        category: { select: { id: true, name: true } },
        project:  { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(ok(expense));
  } catch (err) { return apiError(err); }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    const { id } = await params;
    await prisma.expense.delete({ where: { id } });
    return NextResponse.json(ok({ deleted: true }));
  } catch (err) { return apiError(err); }
}
