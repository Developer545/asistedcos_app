import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const partners = await prisma.webPartner.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
    });
    return NextResponse.json({ success: true, data: partners });
  } catch { return NextResponse.json({ success: true, data: [] }); }
}
