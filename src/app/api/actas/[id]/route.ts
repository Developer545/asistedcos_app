import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser(req);
    const { id } = await ctx.params;
    const acta = await prisma.actaRecord.findUnique({ where: { id } });
    if (!acta) return apiError('Acta no encontrada', 404);
    return ok(acta);
  } catch (e) { return apiError(e); }
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser(req);
    const { id } = await ctx.params;
    const body = await req.json();
    const { number, title, date, attendees, agenda, agreements, fileUrl } = body;
    const acta = await prisma.actaRecord.update({
      where: { id },
      data: {
        number, title,
        date:       date ? new Date(date) : undefined,
        attendees, agenda, agreements, fileUrl,
      },
    });
    return ok(acta);
  } catch (e) { return apiError(e); }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser(req);
    const { id } = await ctx.params;
    await prisma.actaRecord.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) { return apiError(e); }
}
