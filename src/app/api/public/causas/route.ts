import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const causes = await prisma.webCause.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
    });
    return NextResponse.json({ success: true, data: causes });
  } catch { return NextResponse.json({ success: true, data: [] }); }
}
