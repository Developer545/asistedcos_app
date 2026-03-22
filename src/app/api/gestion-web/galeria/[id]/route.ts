import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser();
    const { id } = await ctx.params;
    const { title, url, category, order } = await req.json();
    const item = await prisma.webGallery.update({ where: { id }, data: { title, url, category, order } });
    return ok(item);
  } catch (e) { return apiError(e); }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser();
    const { id } = await ctx.params;
    await prisma.webGallery.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) { return apiError(e); }
}
