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
    const [data, total] = await Promise.all([
      prisma.member.findMany({ orderBy: { name: 'asc' }, skip: (page - 1) * limit, take: limit }),
      prisma.member.count(),
    ]);
    return NextResponse.json(ok(data, paginate(total, page, limit)));
  } catch (err) { return apiError(err); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    const body = await req.json();
    const { name, position, dui, nit, email, phone, status, startDate, notes } = body;
    if (!name?.trim())     throw new ValidationError('El nombre es requerido');
    if (!position?.trim()) throw new ValidationError('El cargo es requerido');
    const member = await prisma.member.create({
      data: {
        name: name.trim(), position: position.trim(),
        dui: dui || null, nit: nit || null,
        email: email || null, phone: phone || null,
        status: status || 'ACTIVO',
        startDate: startDate ? new Date(startDate) : null,
        notes: notes || null,
      },
    });
    return NextResponse.json(created(member));
  } catch (err) { return apiError(err); }
}
