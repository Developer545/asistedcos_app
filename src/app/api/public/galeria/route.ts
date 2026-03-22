import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const gallery = await prisma.webGallery.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] });
    return NextResponse.json({ success: true, data: gallery });
  } catch { return NextResponse.json({ success: true, data: [] }); }
}
