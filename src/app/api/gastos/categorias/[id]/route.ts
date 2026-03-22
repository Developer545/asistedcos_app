import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (user.role !== 'ADMIN') throw new ForbiddenError();
    const { id } = await params;
    const { name, description } = await req.json();
    const cat = await prisma.expenseCategory.update({
      where: { id },
      data: { name: name?.trim(), description: description || null },
    });
    return NextResponse.json(ok(cat));
  } catch (err) { return apiError(err); }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    if (user.role !== 'ADMIN') throw new ForbiddenError();
    const { id } = await params;
    await prisma.expenseCategory.delete({ where: { id } });
    return NextResponse.json(ok({ deleted: true }));
  } catch (err) { return apiError(err); }
}
