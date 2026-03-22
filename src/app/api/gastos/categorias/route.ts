import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError } from '@/lib/errors';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    const cats = await prisma.expenseCategory.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json(ok(cats));
  } catch (err) { return apiError(err); }
}
