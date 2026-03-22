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
    const donor = await prisma.donor.findUnique({
      where: { id },
      include: { donations: { orderBy: { date: 'desc' }, take: 10 } },
    });
    if (!donor) throw new NotFoundError('Donante');
    return NextResponse.json(ok(donor));
  } catch (err) { return apiError(err); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    const { id } = await params;
    const body = await req.json();
    const { name, nit, dui, email, phone, address, isCompany, notes } = body;

    const donor = await prisma.donor.update({
      where: { id },
      data: { name: name?.trim(), nit: nit || null, dui: dui || null,
              email: email || null, phone: phone || null,
              address: address || null, isCompany: !!isCompany, notes: notes || null },
    });
    return NextResponse.json(ok(donor));
  } catch (err) { return apiError(err); }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    const { id } = await params;
    await prisma.donor.delete({ where: { id } });
    return NextResponse.json(ok({ deleted: true }));
  } catch (err) { return apiError(err); }
}
