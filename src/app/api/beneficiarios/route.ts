import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { created, apiError, paginate, parsePagination } from '@/lib/response';
import { UnauthorizedError, ValidationError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    const { page, limit, skip } = parsePagination(req);
    const search = req.nextUrl.searchParams.get('search') ?? '';
    const status = req.nextUrl.searchParams.get('status') ?? '';
    const where: Record<string, unknown> = {};
    if (search) where['name'] = { contains: search, mode: 'insensitive' };
    if (status) where['status'] = status;
    const [data, total] = await Promise.all([
      prisma.beneficiary.findMany({ where, orderBy: { name: 'asc' }, skip, take: limit }),
      prisma.beneficiary.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  } catch (err) { return apiError(err); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    const body = await req.json();
    const { name, dui, birthDate, gender, address, phone, program, notes } = body;
    if (!name?.trim()) throw new ValidationError('El nombre es requerido');
    const b = await prisma.beneficiary.create({
      data: {
        name: name.trim(),
        dui:      dui      || null,
        birthDate:birthDate ? new Date(birthDate) : null,
        gender:   gender   || null,
        address:  address  || null,
        phone:    phone    || null,
        program:  program  || null,
        notes:    notes    || null,
        status:   'ACTIVO',
      },
    });
    return created(b);
  } catch (err) { return apiError(err); }
}
