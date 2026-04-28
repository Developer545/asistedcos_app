import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> };

// Publicar asiento (BORRADOR → PUBLICADO)
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser();
    const { id } = await ctx.params;
    const { action } = await req.json(); // action: 'publicar' | 'anular'

    const asiento = await prisma.journalEntry.findUniqueOrThrow({
      where: { id },
      include: { lines: { include: { account: true } } },
    });

    if (action === 'publicar') {
      if (asiento.estado !== 'BORRADOR')
        return apiError('Solo se pueden publicar asientos en estado BORRADOR', 400);

      await prisma.journalEntry.update({
        where: { id },
        data: { estado: 'PUBLICADO' },
      });

      return ok({ message: 'Asiento publicado correctamente' });
    }

    if (action === 'anular') {
      if (asiento.estado === 'ANULADO')
        return apiError('El asiento ya está anulado', 400);

      // Si estaba publicado, crear asiento de reversión automático
      if (asiento.estado === 'PUBLICADO') {
        const anio = new Date().getFullYear();
        const ultimo = await prisma.journalEntry.findFirst({
          where: { anio }, orderBy: { numero: 'desc' }, select: { numero: true },
        });
        const numero = (ultimo?.numero ?? 0) + 1;

        await prisma.journalEntry.create({
          data: {
            numero,
            anio,
            fecha:     new Date(),
            concepto:  `REVERSIÓN — ${asiento.concepto}`,
            tipo:      'AJUSTE',
            origen:    'MANUAL',
            origenId:  asiento.id,
            totalDebe:  asiento.totalHaber,
            totalHaber: asiento.totalDebe,
            estado:    'PUBLICADO',
            lines: {
              create: asiento.lines.map((l, i) => ({
                accountId:   l.accountId,
                descripcion: `Reversión: ${l.descripcion ?? ''}`,
                debe:        Number(l.haber),
                haber:       Number(l.debe),
                orden:       i,
              })),
            },
          },
        });
      }

      await prisma.journalEntry.update({ where: { id }, data: { estado: 'ANULADO' } });
      return ok({ message: 'Asiento anulado y reversión generada' });
    }

    return apiError('Acción no válida. Use: publicar | anular', 400);
  } catch (e) { return apiError(e); }
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser();
    const { id } = await ctx.params;
    const { fecha, concepto, tipo, periodoId, projectId, lines } = await req.json();

    const asiento = await prisma.journalEntry.findUniqueOrThrow({ where: { id } });
    if (asiento.estado !== 'BORRADOR')
      return apiError('Solo se pueden editar asientos en estado BORRADOR', 400);

    const totalDebe  = lines.reduce((s: number, l: { debe: number }) => s + Number(l.debe  ?? 0), 0);
    const totalHaber = lines.reduce((s: number, l: { haber: number }) => s + Number(l.haber ?? 0), 0);
    if (Math.abs(totalDebe - totalHaber) > 0.01)
      return apiError(`Partida doble no cuadra: Debe ${totalDebe.toFixed(2)} ≠ Haber ${totalHaber.toFixed(2)}`, 400);

    // Reemplazar líneas
    await prisma.journalLine.deleteMany({ where: { entryId: id } });

    const updated = await prisma.journalEntry.update({
      where: { id },
      data: {
        fecha:     fecha ? new Date(fecha) : undefined,
        concepto:  concepto?.trim(),
        tipo:      tipo      ?? undefined,
        periodoId: periodoId ?? null,
        projectId: projectId ?? null,
        totalDebe,
        totalHaber,
        lines: {
          create: lines.map((l: {
            accountId: string; descripcion?: string; debe: number; haber: number; orden: number;
          }, i: number) => ({
            accountId:   l.accountId,
            descripcion: l.descripcion ?? null,
            debe:  Number(l.debe  ?? 0),
            haber: Number(l.haber ?? 0),
            orden: l.orden ?? i,
          })),
        },
      },
      include: {
        lines: { include: { account: { select: { id: true, codigo: true, nombre: true } } }, orderBy: { orden: 'asc' } },
      },
    });

    return ok(updated);
  } catch (e) { return apiError(e); }
}
