import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    await getCurrentUser();
    const content = await prisma.webContent.findMany({ orderBy: [{ section: 'asc' }, { key: 'asc' }] });
    return ok(content);
  } catch (e) { return apiError(e); }
}

export async function PUT(req: NextRequest) {
  try {
    await getCurrentUser();
    const { section, key, value, type } = await req.json();
    if (!section || !key) return apiError('section y key son requeridos', 400);
    const item = await prisma.webContent.upsert({
      where: { section_key: { section, key } },
      update: { value: value ?? '', type: type ?? 'text' },
      create: { section, key, value: value ?? '', type: type ?? 'text' },
    });
    return ok(item);
  } catch (e) { return apiError(e); }
}

// Bulk upsert — used by Textos del sitio form
export async function POST(req: NextRequest) {
  try {
    await getCurrentUser();
    const { entries } = await req.json();
    if (!Array.isArray(entries)) return apiError('entries debe ser un array', 400);
    const results = await Promise.all(
      entries
        .filter((e: { section: string; key: string }) => e.section && e.key)
        .map(({ section, key, value, type }: { section: string; key: string; value?: string; type?: string }) =>
          prisma.webContent.upsert({
            where: { section_key: { section, key } },
            update: { value: value ?? '', type: type ?? 'text' },
            create: { section, key, value: value ?? '', type: type ?? 'text' },
          })
        )
    );
    return ok(results);
  } catch (e) { return apiError(e); }
}
