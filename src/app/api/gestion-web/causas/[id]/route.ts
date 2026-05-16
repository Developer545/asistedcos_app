import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, noContent, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getCurrentUser();
    const { id } = await params;
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return apiError('No encontrado', 404);
    return ok(project);
  } catch (e) { return apiError(e); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getCurrentUser();
    const { id } = await params;
    const body = await req.json();
    const { name, description, tag, coverImage, ubicacion, estado, meta, recaudado, active, webOrder, publishOnWeb } = body;
    const project = await prisma.project.update({
      where: { id },
      data: {
        name:        name         !== undefined ? name.trim()           : undefined,
        description: description  !== undefined ? (description || null) : undefined,
        tag:         tag          !== undefined ? (tag || null)         : undefined,
        coverImage:  coverImage   !== undefined ? (coverImage || null)  : undefined,
        ubicacion:   ubicacion    !== undefined ? (ubicacion || null)   : undefined,
        estado:      estado       !== undefined ? estado                : undefined,
        meta:        meta         !== undefined ? meta                  : undefined,
        recaudado:   recaudado    !== undefined ? recaudado             : undefined,
        active:      active       !== undefined ? active                : undefined,
        webOrder:    webOrder     !== undefined ? webOrder              : undefined,
        publishOnWeb: publishOnWeb !== undefined ? publishOnWeb         : undefined,
      },
    });
    return ok(project);
  } catch (e) { return apiError(e); }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getCurrentUser();
    const { id } = await params;
    await prisma.project.delete({ where: { id } });
    return noContent();
  } catch (e) { return apiError(e); }
}
