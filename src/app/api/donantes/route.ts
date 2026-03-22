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
      ? { OR: [
          { name:  { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { nit:   { contains: search, mode: 'insensitive' as const } },
        ]}
      : {};

    const [data, total] = await Promise.all([
      prisma.donor.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { donations: true } } },
      }),
      prisma.donor.count({ where }),
    ]);

    return NextResponse.json(ok(data, paginate(total, page, limit)));
  } catch (err) { return apiError(err); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const body = await req.json();
    const { name, nit, dui, email, phone, address, isCompany, notes } = body;

    if (!name?.trim()) throw new ValidationError('El nombre es requerido');

    const donor = await prisma.donor.create({
      data: { name: name.trim(), nit: nit || null, dui: dui || null,
              email: email || null, phone: phone || null,
              address: address || null, isCompany: !!isCompany, notes: notes || null },
    });

    return NextResponse.json(created(donor));
  } catch (err) { return apiError(err); }
}
