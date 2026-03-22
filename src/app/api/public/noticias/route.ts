import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const limit = Math.min(50, parseInt(req.nextUrl.searchParams.get('limit') ?? '10', 10));
    const news = await prisma.webNews.findMany({
      where: { published: true },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      select: { id: true, title: true, slug: true, summary: true, coverImage: true, publishedAt: true },
    });
    return NextResponse.json({ success: true, data: news });
  } catch { return NextResponse.json({ success: false, data: [] }); }
}
