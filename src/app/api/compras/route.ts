import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, created, apiError, paginate, parsePagination } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await getCurrentUser(req);
    const { page, limit, skip } = parsePagination(req);
    const status = req.nextUrl.searchParams.get('status') ?? '';

    const where = status ? { status: status as 'PENDIENTE' | 'RECIBIDO' | 'CANCELADO' } : {};

    const [data, total] = await prisma.$transaction([
      prisma.purchase.findMany({
        where, skip, take: limit,
        orderBy: { date: 'desc' },
        include: {
          supplier: { select: { id: true, name: true } },
          details:  { include: { product: { select: { id: true, name: true, unit: true } } } },
        },
      }),
      prisma.purchase.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    await getCurrentUser(req);
    const body = await req.json();
    const { supplierId, date, invoiceRef, notes, details } = body;

    if (!supplierId)            return apiError('Proveedor requerido', 400);
    if (!details?.length)       return apiError('Debe agregar al menos un producto', 400);

    // Calcular totales
    let subtotal = 0;
    for (const d of details) {
      subtotal += Number(d.quantity) * Number(d.unitPrice);
    }
    const iva   = subtotal * 0.13;
    const total = subtotal + iva;

    const purchase = await prisma.$transaction(async (tx) => {
      const p = await tx.purchase.create({
        data: {
          supplierId,
          date:        date ? new Date(date) : new Date(),
          subtotal,
          iva,
          total,
          invoiceRef,
          notes,
          details: {
            create: details.map((d: { productId: string; quantity: number; unitPrice: number }) => ({
              productId: d.productId,
              quantity:  d.quantity,
              unitPrice: d.unitPrice,
              total:     Number(d.quantity) * Number(d.unitPrice),
            })),
          },
        },
        include: { details: true },
      });
      return p;
    });

    return created(purchase);
  } catch (e) { return apiError(e); }
}
