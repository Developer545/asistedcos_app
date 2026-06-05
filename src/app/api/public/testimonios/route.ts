import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const items = await prisma.webTestimonial.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
      select: { id: true, quote: true, name: true, role: true, initials: true, photo: true },
    });
    return NextResponse.json({ success: true, data: items });
  } catch {
    return NextResponse.json({ success: true, data: [] });
  }
}
