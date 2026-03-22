import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, created, apiError, paginate, parsePagination } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await getCurrentUser();
    const { page, limit, skip } = parsePagination(req);
    const [data, total] = await prisma.$transaction([
      prisma.webFaq.findMany({ skip, take: limit, orderBy: { order: 'asc' } }),
      prisma.webFaq.count(),
    ]);
    return paginate(data, total, page, limit);
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    await getCurrentUser();
    const { question, answer, order, active } = await req.json();
    if (!question?.trim()) return apiError('La pregunta es requerida', 400);
    if (!answer?.trim()) return apiError('La respuesta es requerida', 400);
    const faq = await prisma.webFaq.create({ data: { question, answer, order: order ?? 0, active: active ?? true } });
    return created(faq);
  } catch (e) { return apiError(e); }
}
