import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError, NotFoundError } from '@/lib/errors';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: { photos: { orderBy: { order: 'asc' } }, impactMetrics: true },
    });
    if (!project) throw new NotFoundError('Proyecto');
    return NextResponse.json(ok(project));
  } catch (err) { return apiError(err); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    const { id } = await params;
    const body = await req.json();
    const { name, description, startDate, endDate, budget, active, coverImage, publishOnWeb, tag, ubicacion, estado, meta, recaudado, webOrder } = body;
    const project = await prisma.project.update({
      where: { id },
      data: {
        name:        name         !== undefined ? name.trim()                              : undefined,
        description: description  !== undefined ? (description || null)                    : undefined,
        startDate:   startDate    !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
        endDate:     endDate      !== undefined ? (endDate   ? new Date(endDate)   : null) : undefined,
        budget:      budget       !== undefined ? parseFloat(budget)                       : undefined,
        active:      active       !== undefined ? active                                   : undefined,
        coverImage:  coverImage   !== undefined ? (coverImage || null)                     : undefined,
        publishOnWeb: publishOnWeb !== undefined ? publishOnWeb                            : undefined,
        tag:         tag          !== undefined ? (tag || null)                            : undefined,
        ubicacion:   ubicacion    !== undefined ? (ubicacion || null)                      : undefined,
        estado:      estado       !== undefined ? estado                                   : undefined,
        meta:        meta         !== undefined ? parseFloat(meta)                         : undefined,
        recaudado:   recaudado    !== undefined ? parseFloat(recaudado)                    : undefined,
        webOrder:    webOrder     !== undefined ? webOrder                                 : undefined,
      },
    });
    return NextResponse.json(ok(project));
  } catch (err) { return apiError(err); }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    const { id } = await params;
    await prisma.project.delete({ where: { id } });
    return NextResponse.json(ok({ deleted: true }));
  } catch (err) { return apiError(err); }
}
