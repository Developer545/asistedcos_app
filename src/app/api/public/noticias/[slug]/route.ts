import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const news = await prisma.webNews.findUnique({
      where: { slug, published: true },
    });
    if (!news) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: news });
  } catch { return NextResponse.json({ success: false, error: 'Error' }, { status: 500 }); }
}
