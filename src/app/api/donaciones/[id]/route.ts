import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError, NotFoundError } from '@/lib/errors';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    const { id } = await params;
    const body = await req.json();
    const { donorId, projectId, amount, date, paymentMethod, notes } = body;

    const donation = await prisma.donation.update({
      where: { id },
      data: {
        donorId,
        projectId: projectId || null,
        amount:    parseFloat(amount),
        date:      date ? new Date(date) : undefined,
        paymentMethod: paymentMethod || 'EFECTIVO',
        notes: notes || null,
      },
      include: {
        donor:   { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(ok(donation));
  } catch (err) { return apiError(err); }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    const { id } = await params;
    await prisma.donation.delete({ where: { id } });
    return NextResponse.json(ok({ deleted: true }));
  } catch (err) { return apiError(err); }
}
