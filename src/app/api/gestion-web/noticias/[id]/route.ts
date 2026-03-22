import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser();
    const { id } = await ctx.params;
    const { title, slug, summary, body, coverImage, published } = await req.json();
    const news = await prisma.webNews.update({
      where: { id },
      data: {
        title, slug, summary, body, coverImage, published,
        publishedAt: published ? new Date() : null,
        updatedAt:   new Date(),
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
