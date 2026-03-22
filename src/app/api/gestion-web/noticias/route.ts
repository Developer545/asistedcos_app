import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, created, apiError, paginate, parsePagination } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await getCurrentUser(req);
    const { page, limit, skip } = parsePagination(req);
    const search = req.nextUrl.searchParams.get('search') ?? '';
    const where  = search
      ? { OR: [{ title: { contains: search, mode: 'insensitive' as const } }] }
      : {};
    const [data, total] = await prisma.$transaction([
      prisma.webNews.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.webNews.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    await getCurrentUser(req);
    const body = await req.json();
    const { title, slug, summary, body: content, coverImage, published } = body;
    if (!title?.trim()) return apiError('El título es requerido', 400);
    if (!slug?.trim())  return apiError('El slug es requerido', 400);
    const news = await prisma.webNews.create({
      data: {
        title, slug, summary, body: content ?? '',
        coverImage, published: published ?? false,
        publishedAt: published ? new Date() : null,
      },
    });
    return created(news);
  } catch (e) { return apiError(e); }
}
