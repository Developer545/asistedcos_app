import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, created, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

export async function GET(_req: NextRequest) {
  try {
    await getCurrentUser();
    const data = await prisma.rOS.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        donor:   { select: { id: true, name: true } },
        alertas: { select: { id: true, tipo: true, estado: true } },
      },
    });
    return ok(data);
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    await getCurrentUser();
    const { donorId, descripcion, montoEstimado, fechaOperacion, tipoActividad, mediosUtilizados } = await req.json();

    if (!descripcion?.trim())  return apiError('La descripción es requerida', 400);
    if (!fechaOperacion)       return apiError('La fecha de la operación es requerida', 400);
    if (!tipoActividad?.trim()) return apiError('El tipo de actividad es requerido', 400);

    // Generar número correlativo ROS-YYYY-NNN
    const anio   = new Date().getFullYear();
    const ultimo = await prisma.rOS.findFirst({
      where: { numero: { startsWith: `ROS-${anio}-` } },
      orderBy: { numero: 'desc' },
      select: { numero: true },
    });
    const seq    = ultimo ? parseInt(ultimo.numero.split('-')[2]) + 1 : 1;
    const numero = `ROS-${anio}-${String(seq).padStart(3, '0')}`;

    const ros = await prisma.rOS.create({
      data: {
        numero,
        donorId:          donorId         || null,
        descripcion:      descripcion.trim().slice(0, 2000),
        montoEstimado:    montoEstimado   ? parseFloat(montoEstimado) : null,
        fechaOperacion:   new Date(fechaOperacion),
        tipoActividad:    tipoActividad.trim().slice(0, 300),
        mediosUtilizados: mediosUtilizados ?? null,
      },
      include: { donor: { select: { id: true, name: true } } },
    });
    return created(ros);
  } catch (e) { return apiError(e); }
}
