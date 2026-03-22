import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, noContent, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getCurrentUser();
    const { id } = await params;
    const { name, logo, url, active, order } = await req.json();
    const partner = await prisma.webPartner.update({ where: { id }, data: { name, logo, url, active, order } });
    return ok(partner);
  } catch (e) { return apiError(e); }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getCurrentUser();
    const { id } = await params;
    await prisma.webPartner.delete({ where: { id } });
    return noContent();
  } catch (e) { return apiError(e); }
}
