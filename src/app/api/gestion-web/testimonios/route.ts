import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    await getCurrentUser();
    const items = await prisma.webTestimonial.findMany({ orderBy: { order: 'asc' } });
    return ok(items);
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    await getCurrentUser();
    const { quote, name, role, initials, photo, active, order } = await req.json();
    if (!quote?.trim() || !name?.trim() || !role?.trim()) return apiError('quote, name y role son requeridos', 400);
    const item = await prisma.webTestimonial.create({
      data: {
        quote: quote.trim(),
        name:  name.trim(),
        role:  role.trim(),
        initials: (initials ?? '').trim().slice(0, 3),
        photo:  photo ?? null,
        active: active ?? true,
        order:  order  ?? 0,
      },
    });
    return ok(item);
  } catch (e) { return apiError(e); }
}
