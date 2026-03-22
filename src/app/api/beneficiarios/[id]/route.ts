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
    const { name, dui, birthDate, gender, address, phone, status, program, exitDate, notes } = await req.json();
    const b = await prisma.beneficiary.update({
      where: { id },
      data: {
        name: name?.trim(), dui: dui||null,
        birthDate: birthDate ? new Date(birthDate) : null,
        gender: gender||null, address: address||null, phone: phone||null,
        status: status||'ACTIVO', program: program||null,
        exitDate: exitDate ? new Date(exitDate) : null,
        notes: notes||null,
      },
    });
    return NextResponse.json(ok(b));
  } catch (err) { return apiError(err); }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    const { id } = await params;
    await prisma.beneficiary.delete({ where: { id } });
    return NextResponse.json(ok({ deleted: true }));
  } catch (err) { return apiError(err); }
}
