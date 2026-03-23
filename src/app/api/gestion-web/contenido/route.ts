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
    const body = await req.json();
    const entries = Array.isArray(body.entries) ? body.entries : [];

    const results = [];
    for (const entry of entries.slice(0, 50)) { // max 50 entries at once
      const section = typeof entry.section === 'string' ? entry.section.slice(0, 50)   : '';
      const key     = typeof entry.key     === 'string' ? entry.key.slice(0, 100)      : '';
      const value   = typeof entry.value   === 'string' ? entry.value.slice(0, 5000)   : '';
      const type    = ['text', 'image', 'richtext'].includes(entry.type) ? entry.type  : 'text';
      if (!section || !key) continue;
      const item = await prisma.webContent.upsert({
        where: { section_key: { section, key } },
        update: { value, type },
        create: { section, key, value, type },
      });
      results.push(item);
    }
    return ok(results);
  } catch (e) { return apiError(e); }
}
