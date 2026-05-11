import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getCurrentUser();
    const { id } = await params;
    const body = await req.json();
    const item = await prisma.webTestimonial.update({
      where: { id },
      data: {
        ...(body.quote    !== undefined && { quote:    body.quote.trim() }),
        ...(body.name     !== undefined && { name:     body.name.trim() }),
        ...(body.role     !== undefined && { role:     body.role.trim() }),
        ...(body.initials !== undefined && { initials: body.initials.trim().slice(0, 3) }),
        ...(body.photo    !== undefined && { photo:    body.photo }),
        ...(body.active   !== undefined && { active:   body.active }),
        ...(body.order    !== undefined && { order:    body.order }),
      },
    });
    return ok(item);
  } catch (e) { return apiError(e); }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getCurrentUser();
    const { id } = await params;
    await prisma.webTestimonial.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) { return apiError(e); }
}
