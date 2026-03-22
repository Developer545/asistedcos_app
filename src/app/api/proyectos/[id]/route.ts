import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError, NotFoundError } from '@/lib/errors';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: { photos: { orderBy: { order: 'asc' } }, impactMetrics: true },
    });
    if (!project) throw new NotFoundError('Proyecto');
    return NextResponse.json(ok(project));
  } catch (err) { return apiError(err); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    const { id } = await params;
    const body = await req.json();
    const { name, description, startDate, endDate, budget, active } = body;
    const project = await prisma.project.update({
      where: { id },
      data: {
        name: name?.trim(),
        description: description || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate:   endDate   ? new Date(endDate)   : null,
        budget:    budget !== undefined ? parseFloat(budget) : undefined,
        active:    active !== undefined ? active : undefined,
      },
    });
    return NextResponse.json(ok(project));
  } catch (err) { return apiError(err); }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    const { id } = await params;
    await prisma.project.delete({ where: { id } });
    return NextResponse.json(ok({ deleted: true }));
  } catch (err) { return apiError(err); }
}
