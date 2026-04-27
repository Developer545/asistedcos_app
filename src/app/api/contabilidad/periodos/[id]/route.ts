import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser();
    const { id } = await ctx.params;
    const { estado } = await req.json();

    if (!['ABIERTO', 'CERRADO'].includes(estado))
      return apiError('Estado debe ser ABIERTO o CERRADO', 400);

    const periodo = await prisma.accountingPeriod.update({
      where: { id },
      data:  { estado },
    });

    return ok(periodo);
  } catch (e) { return apiError(e); }
}
