import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_: NextRequest, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const news = await prisma.webNews.findFirst({
      where: { slug, published: true },
    });
    if (!news) return NextResponse.json({ success: false }, { status: 404 });

    // Get 3 related articles (same categoria if possible, else latest)
    const related = await prisma.webNews.findMany({
      where: { published: true, id: { not: news.id } },
      orderBy: [
        { categoria: news.categoria ? 'asc' : 'desc' },
        { publishedAt: 'desc' },
      ],
      take: 3,
      select: { id: true, title: true, slug: true, summary: true, coverImage: true, publishedAt: true, categoria: true },
    });

    return NextResponse.json({ success: true, data: { ...news, related } });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
