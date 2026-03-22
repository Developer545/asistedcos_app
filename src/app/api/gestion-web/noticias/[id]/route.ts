import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser();
    const { id } = await ctx.params;
    const news = await prisma.webNews.findUnique({ where: { id } });
    if (!news) return apiError('No encontrado', 404);
    return ok(news);
  } catch (e) { return apiError(e); }
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser();
    const { id } = await ctx.params;
    const { title, slug, summary, body, categoria, coverImage, published } = await req.json();

    // Get existing to preserve publishedAt
    const existing = await prisma.webNews.findUnique({ where: { id }, select: { publishedAt: true, published: true } });

    const news = await prisma.webNews.update({
      where: { id },
      data: {
        title, slug, summary, body, categoria, coverImage, published,
        // Only set publishedAt when first publishing, keep it if already set
        publishedAt: published
          ? (existing?.publishedAt ?? new Date())
          : null,
        updatedAt: new Date(),
      },
    });
    return ok(news);
  } catch (e) { return apiError(e); }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser();
    const { id } = await ctx.params;
    await prisma.webNews.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) { return apiError(e); }
}
