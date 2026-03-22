import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, noContent, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getCurrentUser();
    const { id } = await params;
    const { question, answer, order, active } = await req.json();
    const faq = await prisma.webFaq.update({ where: { id }, data: { question, answer, order, active } });
    return ok(faq);
  } catch (e) { return apiError(e); }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getCurrentUser();
    const { id } = await params;
    await prisma.webFaq.delete({ where: { id } });
    return noContent();
  } catch (e) { return apiError(e); }
}
