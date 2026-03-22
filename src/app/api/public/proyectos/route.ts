import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, description: true, coverImage: true, active: true, createdAt: true },
    });
    return NextResponse.json({ success: true, data: projects });
  } catch { return NextResponse.json({ success: true, data: [] }); }
}
