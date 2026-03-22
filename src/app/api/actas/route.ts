import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, created, apiError, paginate, parsePagination } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await getCurrentUser();
    const { page, limit, skip } = parsePagination(req);
    const search = req.nextUrl.searchParams.get('search') ?? '';
    const year   = req.nextUrl.searchParams.get('year')   ?? '';

    const where: Record<string, unknown> = {};
    if (search) where.OR = [
      { title:  { contains: search, mode: 'insensitive' } },
      { number: { contains: search, mode: 'insensitive' } },
    ];
    if (year) where.date = {
      gte: new Date(`${year}-01-01`),
      lte: new Date(`${year}-12-31`),
    };

    const [data, total] = await prisma.$transaction([
      prisma.actaRecord.findMany({ where, skip, take: limit, orderBy: { date: 'desc' } }),
      prisma.actaRecord.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    await getCurrentUser();
    const body = await req.json();
    const { number, title, date, attendees, agenda, agreements, notes, fileUrl } = body;
    if (!number?.trim()) return apiError('El número de acta es requerido', 400);
    if (!title?.trim())  return apiError('El título es requerido', 400);
    if (!date)           return apiError('La fecha es requerida', 400);

    const acta = await prisma.actaRecord.create({
      data: {
        number:     number.trim(),
        title:      title.trim(),
        date:       new Date(date),
        attendees:  attendees ?? '',
        agenda:     agenda    ?? '',
        agreements: agreements ?? '',
        fileUrl,
      },
    });
    return created(acta);
  } catch (e) { return apiError(e); }
}
