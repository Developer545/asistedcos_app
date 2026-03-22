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
    const { name, position, dui, nit, email, phone, status, startDate, endDate, notes } = body;
    const member = await prisma.member.update({
      where: { id },
      data: {
        name: name?.trim(), position: position?.trim(),
        dui: dui || null, nit: nit || null,
        email: email || null, phone: phone || null,
        status: status || 'ACTIVO',
        startDate: startDate ? new Date(startDate) : null,
        endDate:   endDate   ? new Date(endDate)   : null,
        notes: notes || null,
      },
    });
    return NextResponse.json(ok(member));
  } catch (err) { return apiError(err); }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    const { id } = await params;
    await prisma.member.delete({ where: { id } });
    return NextResponse.json(ok({ deleted: true }));
  } catch (err) { return apiError(err); }
}
