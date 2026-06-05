import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://asistedcosong.vercel.app',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function GET() {
  try {
    const campaign = await prisma.webCampaign.findFirst({
      where: { activo: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, data: campaign ?? null });
  } catch { return NextResponse.json({ success: true, data: null }); }
}
