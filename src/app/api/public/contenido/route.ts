import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const content = await prisma.webContent.findMany({ orderBy: [{ section: 'asc' }, { key: 'asc' }] });
    return NextResponse.json({ success: true, data: content });
  } catch { return NextResponse.json({ success: true, data: [] }); }
}
