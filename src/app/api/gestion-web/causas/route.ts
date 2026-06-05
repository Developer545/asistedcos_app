import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, created, apiError, paginate, parsePagination } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await getCurrentUser();
    const { page, limit, skip } = parsePagination(req);
    const [projects, total] = await prisma.$transaction([
      prisma.project.findMany({ skip, take: limit, orderBy: { webOrder: 'asc' } }),
      prisma.project.count(),
    ]);

    // Sum real donations per project
    const donationSums = await prisma.donation.groupBy({
      by: ['projectId'],
      _sum: { amount: true },
      where: { projectId: { in: projects.map(p => p.id) } },
    });
    const sumMap = Object.fromEntries(
      donationSums.map(d => [d.projectId, Number(d._sum.amount ?? 0)])
    );

    const data = projects.map(p => ({
      ...p,
      recaudadoReal: sumMap[p.id] ?? 0,
    }));

    return paginate(data, total, page, limit);
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    await getCurrentUser();
    const body = await req.json();
    const { name, description, tag, coverImage, ubicacion, estado, meta, recaudado, active, webOrder, publishOnWeb } = body;
    if (!name?.trim()) return apiError('El nombre es requerido', 400);
    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description || null,
        tag: tag || null,
        coverImage: coverImage || null,
        ubicacion: ubicacion || null,
        estado: estado ?? 'Activo',
        meta: meta ?? 0,
        recaudado: recaudado ?? 0,
        active: active ?? true,
        webOrder: webOrder ?? 0,
        publishOnWeb: publishOnWeb ?? false,
      },
    });
    return created(project);
  } catch (e) { return apiError(e); }
}
