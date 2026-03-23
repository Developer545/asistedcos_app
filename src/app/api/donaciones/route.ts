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
    const donorId   = req.nextUrl.searchParams.get('donorId') ?? undefined;
    const projectId = req.nextUrl.searchParams.get('projectId') ?? undefined;

    const where = { ...(donorId && { donorId }), ...(projectId && { projectId }) };

    const [data, total] = await Promise.all([
      prisma.donation.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit,
        include: {
          donor:       { select: { id: true, name: true } },
          project:     { select: { id: true, name: true } },
          certificate: { select: { id: true, number: true, status: true } },
        },
      }),
      prisma.donation.count({ where }),
    ]);

    return paginate(data, total, page, limit);
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

    return created(donation);
  } catch (err) { return apiError(err); }
}
