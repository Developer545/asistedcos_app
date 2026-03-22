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
    const search = req.nextUrl.searchParams.get('search') ?? '';
    const where = search
      ? { name: { contains: search, mode: 'insensitive' as const } }
      : {};
    const [data, total] = await Promise.all([
      prisma.volunteer.findMany({
        where, orderBy: { name: 'asc' },
        skip: (page - 1) * limit, take: limit,
        include: { _count: { select: { participations: true } } },
      }),
      prisma.volunteer.count({ where }),
    ]);
    return NextResponse.json(ok(data, paginate(total, page, limit)));
  } catch (err) { return apiError(err); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    const body = await req.json();
    const { name, dui, email, phone, skills, notes } = body;
    if (!name?.trim()) throw new ValidationError('El nombre es requerido');
    const volunteer = await prisma.volunteer.create({
      data: {
        name: name.trim(),
        dui:    dui    || null,
        email:  email  || null,
        phone:  phone  || null,
        skills: skills || null,
        notes:  notes  || null,
        status: 'ACTIVO',
      },
    });
    return NextResponse.json(created(volunteer));
  } catch (err) { return apiError(err); }
}
