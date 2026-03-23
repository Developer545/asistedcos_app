/**
 * GET /api/certificados
 * Lista todos los certificados de donación con paginación y filtros.
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { paginate, parsePagination, apiError } from '@/lib/response';
import { UnauthorizedError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const { page, limit, skip } = parsePagination(req);
    const search = req.nextUrl.searchParams.get('search') ?? '';
    const status = req.nextUrl.searchParams.get('status') ?? '';
    const year   = req.nextUrl.searchParams.get('year')   ?? '';

    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (year)   where.date   = {
      gte: new Date(`${year}-01-01`),
      lte: new Date(`${year}-12-31T23:59:59`),
    };
    if (search) where.OR = [
      { number:    { contains: search, mode: 'insensitive' } },
      { donorName: { contains: search, mode: 'insensitive' } },
    ];

    const [data, total] = await Promise.all([
      prisma.donationCert.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit,
        include: {
          donation: {
            select: {
              id: true,
              paymentMethod: true,
              project: { select: { name: true } },
            },
          },
        },
      }),
      prisma.donationCert.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  } catch (err) { return apiError(err); }
}
