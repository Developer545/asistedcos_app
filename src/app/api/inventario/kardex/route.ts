// POST → registrar movimiento de kardex (entrada / salida / ajuste)
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, created, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await getCurrentUser();
    const productId = req.nextUrl.searchParams.get('productId') ?? '';
    if (!productId) return apiError('productId requerido', 400);
    const kardex = await prisma.kardex.findMany({
      where: { productId },
      orderBy: { date: 'desc' },
      take: 100,
    });
    return ok(kardex);
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    await getCurrentUser();
    const body = await req.json();
    const { productId, type, quantity, reference, notes, date } = body;
    if (!productId) return apiError('productId requerido', 400);
    if (!type)      return apiError('type requerido', 400);
    if (!quantity || Number(quantity) <= 0) return apiError('quantity debe ser > 0', 400);

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return apiError('Producto no encontrado', 404);

    const currentStock = Number(product.stock);
    const qty          = Number(quantity);
    let newBalance: number;

    if (type === 'ENTRADA') {
      newBalance = currentStock + qty;
    } else if (type === 'SALIDA') {
      if (currentStock < qty) return apiError('Stock insuficiente', 400);
      newBalance = currentStock - qty;
    } else {
      // AJUSTE: quantity puede ser negativo para bajar
      newBalance = qty; // ajuste directo al valor
    }

    const [kardex] = await prisma.$transaction([
      prisma.kardex.create({
        data: {
          productId,
          type,
          quantity: type === 'AJUSTE' ? Math.abs(qty - currentStock) : qty,
          balance:  newBalance,
          reference,
          notes,
          date: date ? new Date(date) : new Date(),
        },
      }),
      prisma.product.update({
        where: { id: productId },
        data:  { stock: newBalance },
      }),
    ]);

    return created(kardex);
  } catch (e) { return apiError(e); }
}
