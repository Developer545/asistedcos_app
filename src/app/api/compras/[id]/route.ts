import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser(req);
    const { id } = await ctx.params;
    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        details:  { include: { product: true } },
      },
    });
    if (!purchase) return apiError('Compra no encontrada', 404);
    return ok(purchase);
  } catch (e) { return apiError(e); }
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser(req);
    const { id } = await ctx.params;
    const { status, notes, invoiceRef } = await req.json();

    const purchase = await prisma.$transaction(async (tx) => {
      const p = await tx.purchase.update({
        where: { id },
        data:  { status, notes, invoiceRef },
        include: { details: { include: { product: true } } },
      });

      // Si se marca como RECIBIDO → actualizar inventario
      if (status === 'RECIBIDO') {
        for (const d of p.details) {
          const product = await tx.product.findUnique({ where: { id: d.productId } });
          if (!product) continue;
          const newStock = Number(product.stock) + Number(d.quantity);
          await tx.product.update({ where: { id: d.productId }, data: { stock: newStock } });
          await tx.kardex.create({
            data: {
              productId: d.productId,
              type:      'ENTRADA',
              quantity:  d.quantity,
              balance:   newStock,
              reference: `Compra #${id.slice(-6)}`,
              date:      new Date(),
            },
          });
        }
      }
      return p;
    });

    return ok(purchase);
  } catch (e) { return apiError(e); }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    await getCurrentUser(req);
    const { id } = await ctx.params;
    await prisma.purchase.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) { return apiError(e); }
}
