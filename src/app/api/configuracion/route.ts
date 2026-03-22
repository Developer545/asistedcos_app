import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

// GET → todos los configs de la org
export async function GET(req: NextRequest) {
  try {
    await getCurrentUser(req);
    const configs = await prisma.orgConfig.findMany({ orderBy: { key: 'asc' } });
    const map     = Object.fromEntries(configs.map(c => [c.key, c.value]));
    return ok(map);
  } catch (e) { return apiError(e); }
}

// PUT → upsert batch de configs
export async function PUT(req: NextRequest) {
  try {
    await getCurrentUser(req);
    const body: Record<string, string> = await req.json();

    await prisma.$transaction(
      Object.entries(body).map(([key, value]) =>
        prisma.orgConfig.upsert({
          where:  { key },
          create: { key, value: String(value) },
          update: { value: String(value) },
        })
      )
    );
    return ok({ saved: true });
  } catch (e) { return apiError(e); }
}
