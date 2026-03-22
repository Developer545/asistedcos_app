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
    const donorId   = req.nextUrl.searchParams.get('donorId') ?? undefined;
    const projectId = req.nextUrl.searchParams.get('projectId') ?? undefined;

    const where = { ...(donorId && { donorId }), ...(projectId && { projectId }) };

    const [data, total] = await Promise.all([
      prisma.donation.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          donor:   { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
      }),
      prisma.donation.count({ where }),
    ]);

    return NextResponse.json(ok(data, paginate(total, page, limit)));
  } catch (err) { return apiError(err); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const body = await req.json();
    const { donorId, projectId, amount, date, paymentMethod, notes } = body;

    if (!donorId)         throw new ValidationError('El donante es requerido');
    if (!amount || amount <= 0) throw new ValidationError('El monto debe ser mayor a 0');

    const donation = await prisma.donation.create({
      data: {
        donorId,
        projectId: projectId || null,
        amount:    parseFloat(amount),
        date:      date ? new Date(date) : new Date(),
        paymentMethod: paymentMethod || 'EFECTIVO',
        notes: notes || null,
      },
      include: {
        donor:   { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(created(donation));
  } catch (err) { return apiError(err); }
}
