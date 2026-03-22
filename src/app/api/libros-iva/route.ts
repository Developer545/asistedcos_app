// Genera el libro de ventas (F-07) o compras (F-14) para un mes/año
// Obtiene datos desde invoices (ventas) y purchases (compras)
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await getCurrentUser();
    const book  = req.nextUrl.searchParams.get('book')  ?? 'VENTAS'; // VENTAS | COMPRAS
    const month = parseInt(req.nextUrl.searchParams.get('month') ?? String(new Date().getMonth() + 1));
    const year  = parseInt(req.nextUrl.searchParams.get('year')  ?? String(new Date().getFullYear()));

    const from = new Date(year, month - 1, 1);
    const to   = new Date(year, month, 0, 23, 59, 59);

    if (book === 'VENTAS') {
      // Libro de Ventas = facturas emitidas (DTE tipo 01, 03, 05, 06, 46)
      const invoices = await prisma.invoice.findMany({
        where: {
          date:   { gte: from, lte: to },
          status: { not: 'ANULADO' },
          dteType: { in: ['FACTURA', 'CCF', 'NOTA_CREDITO', 'NOTA_DEBITO', 'DONACION'] },
        },
        orderBy: { date: 'asc' },
      });

      const rows = invoices.map(inv => ({
        date:           inv.date,
        dteType:        inv.dteType,
        number:         inv.number,
        receiverName:   inv.receiverName,
        receiverNrc:    inv.receiverNrc ?? '',
        receiverNit:    inv.receiverNit ?? '',
        subtotal:       Number(inv.subtotal),
        ivaAmount:      Number(inv.ivaAmount),
        total:          Number(inv.total),
        // Exento = total si es FACTURA o DONACION (no lleva IVA separado)
        exemptSales:    inv.dteType === 'FACTURA' || inv.dteType === 'DONACION'
                          ? Number(inv.total) : 0,
        taxableSales:   inv.dteType === 'CCF' ? Number(inv.subtotal) : 0,
        ivaCollected:   Number(inv.ivaAmount),
      }));

      const totals = rows.reduce((acc, r) => ({
        subtotal:     acc.subtotal     + r.subtotal,
        ivaAmount:    acc.ivaAmount    + r.ivaAmount,
        total:        acc.total        + r.total,
        exemptSales:  acc.exemptSales  + r.exemptSales,
        taxableSales: acc.taxableSales + r.taxableSales,
        ivaCollected: acc.ivaCollected + r.ivaCollected,
      }), { subtotal: 0, ivaAmount: 0, total: 0, exemptSales: 0, taxableSales: 0, ivaCollected: 0 });

      return ok({ book: 'VENTAS', month, year, rows, totals });
    } else {
      // Libro de Compras = compras recibidas con IVA
      const purchases = await prisma.purchase.findMany({
        where: { date: { gte: from, lte: to }, status: 'RECIBIDO' },
        include: { supplier: { select: { name: true, nrc: true, nit: true } } },
        orderBy: { date: 'asc' },
      });

      const rows = purchases.map(p => ({
        date:           p.date,
        number:         p.invoiceRef ?? `COMP-${p.id.slice(-6)}`,
        supplierName:   p.supplier.name,
        supplierNrc:    p.supplier.nrc ?? '',
        supplierNit:    p.supplier.nit ?? '',
        subtotal:       Number(p.subtotal),
        iva:            Number(p.iva),
        total:          Number(p.total),
        ivaCredited:    Number(p.iva),
      }));

      const totals = rows.reduce((acc, r) => ({
        subtotal:   acc.subtotal   + r.subtotal,
        iva:        acc.iva        + r.iva,
        total:      acc.total      + r.total,
        ivaCredited:acc.ivaCredited + r.ivaCredited,
      }), { subtotal: 0, iva: 0, total: 0, ivaCredited: 0 });

      // Calcular débito vs crédito fiscal
      const debitoFiscal  = totals.ivaCredited; // IVA en compras = crédito fiscal
      return ok({ book: 'COMPRAS', month, year, rows, totals, debitoFiscal });
    }
  } catch (e) { return apiError(e); }
}
