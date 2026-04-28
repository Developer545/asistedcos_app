import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, created, apiError, paginate, parsePagination } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await getCurrentUser();
    const { page, limit, skip } = parsePagination(req);
    const estado  = req.nextUrl.searchParams.get('estado') ?? '';
    const origen  = req.nextUrl.searchParams.get('origen') ?? '';
    const anio    = req.nextUrl.searchParams.get('anio')   ?? '';

    const where: Record<string, unknown> = {};
    if (estado) where.estado = estado;
    if (origen) where.origen = origen;
    if (anio)   where.anio   = parseInt(anio);

    const [data, total] = await prisma.$transaction([
      prisma.journalEntry.findMany({
        where, skip, take: limit,
        orderBy: [{ anio: 'desc' }, { numero: 'desc' }],
        include: {
          lines: {
            include: { account: { select: { id: true, codigo: true, nombre: true } } },
            orderBy: { orden: 'asc' },
          },
          periodo:  { select: { id: true, nombre: true } },
          project:  { select: { id: true, name: true } },
        },
      }),
      prisma.journalEntry.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    await getCurrentUser();
    const { fecha, concepto, tipo, origen, origenId, periodoId, projectId, lines } = await req.json();

    if (!concepto?.trim())       return apiError('El concepto es requerido', 400);
    if (!lines?.length)          return apiError('Debe incluir al menos una línea', 400);

    // Validar partida doble
    const totalDebe  = lines.reduce((s: number, l: { debe: number }) => s + Number(l.debe  ?? 0), 0);
    const totalHaber = lines.reduce((s: number, l: { haber: number }) => s + Number(l.haber ?? 0), 0);
    const diff = Math.abs(totalDebe - totalHaber);
    if (diff > 0.01) return apiError(`Partida doble no cuadra: Debe ${totalDebe.toFixed(2)} ≠ Haber ${totalHaber.toFixed(2)}`, 400);

    // Número correlativo anual
    const anio = new Date(fecha ?? Date.now()).getFullYear();
    const ultimo = await prisma.journalEntry.findFirst({
      where: { anio },
      orderBy: { numero: 'desc' },
      select: { numero: true },
    });
    const numero = (ultimo?.numero ?? 0) + 1;

    const asiento = await prisma.journalEntry.create({
      data: {
        numero,
        anio,
        fecha:    fecha ? new Date(fecha) : new Date(),
        concepto: concepto.trim(),
        tipo:      tipo      ?? 'DIARIO',
        origen:    origen    ?? 'MANUAL',
        origenId:  origenId  ?? null,
        periodoId: periodoId ?? null,
        projectId: projectId ?? null,
        totalDebe,
        totalHaber,
        lines: {
          create: lines.map((l: {
            accountId: string; descripcion?: string; debe: number; haber: number; orden: number;
          }, i: number) => ({
            accountId:  l.accountId,
            descripcion: l.descripcion ?? null,
            debe:  Number(l.debe  ?? 0),
            haber: Number(l.haber ?? 0),
            orden: l.orden ?? i,
          })),
        },
      },
      include: {
        lines: {
          include: { account: { select: { id: true, codigo: true, nombre: true } } },
          orderBy: { orden: 'asc' },
        },
      },
    });

    return created(asiento);
  } catch (e) { return apiError(e); }
}
