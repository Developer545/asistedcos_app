/**
 * Auto-asientos contables — ASISTEDCOS ONG
 * Genera asientos de partida doble automáticamente cuando se finalizan
 * documentos en facturación, gastos, compras, planilla y donaciones.
 *
 * Las funciones son "fire-and-forget": capturan errores internamente para
 * que un fallo contable NUNCA rompa la operación principal del negocio.
 */
import { prisma } from '@/lib/prisma';
import { OrigenAsiento } from '@prisma/client';

/* ─── Tipos locales ──────────────────────────────────────── */
interface LineInput {
  accountId:   string;
  descripcion: string;
  debe:        number;
  haber:       number;
  orden:       number;
}

/* ─── Helpers ────────────────────────────────────────────── */

/** Busca el ID de una cuenta por código exacto. Devuelve null si no existe. */
async function cuentaId(codigo: string): Promise<string | null> {
  const c = await prisma.accountChart.findUnique({
    where:  { codigo },
    select: { id: true },
  });
  return c?.id ?? null;
}

/** Obtiene el siguiente número de asiento del año actual. */
async function nextNumero(anio: number): Promise<number> {
  const ultimo = await prisma.journalEntry.findFirst({
    where:   { anio },
    orderBy: { numero: 'desc' },
    select:  { numero: true },
  });
  return (ultimo?.numero ?? 0) + 1;
}

/** Crea el asiento en estado PUBLICADO directamente. */
async function crearAsiento(opts: {
  concepto:   string;
  tipo:       string;
  origen:     OrigenAsiento;
  origenId:   string;
  fecha:      Date;
  lines:      LineInput[];
  projectId?: string | null;
}): Promise<void> {
  const { concepto, tipo, origen, origenId, fecha, lines, projectId } = opts;
  const anio  = fecha.getFullYear();
  const numero = await nextNumero(anio);

  const totalDebe  = lines.reduce((s, l) => s + l.debe,  0);
  const totalHaber = lines.reduce((s, l) => s + l.haber, 0);

  if (Math.abs(totalDebe - totalHaber) > 0.01) {
    console.error('[auto-asiento] No cuadra partida doble', { totalDebe, totalHaber, origenId });
    return;
  }

  await prisma.journalEntry.create({
    data: {
      numero,
      anio,
      fecha,
      concepto,
      tipo,
      origen,
      origenId,
      projectId: projectId ?? null,
      totalDebe,
      totalHaber,
      estado: 'PUBLICADO',
      lines:  { create: lines },
    },
  });
}

/* ════════════════════════════════════════════════════════════
   FACTURA / DTE  — cuando se emite (status → EMITIDO)
   ════════════════════════════════════════════════════════════ */
export async function asientoFactura(invoiceId: string): Promise<void> {
  try {
    const inv = await prisma.invoice.findUnique({
      where:   { id: invoiceId },
      select:  { id: true, number: true, date: true, dteType: true,
                 subtotal: true, ivaAmount: true, total: true,
                 receiverName: true },
    });
    if (!inv) return;

    const subtotal  = Number(inv.subtotal);
    const iva       = Number(inv.ivaAmount);
    const total     = Number(inv.total);
    const fecha     = new Date(inv.date);

    // Cuentas del catálogo ONG
    const [cxcId, ingrServId, ingrDonId, ivaDebId] = await Promise.all([
      cuentaId('1120'), // Cuentas por Cobrar
      cuentaId('4100'), // Ingresos por Servicios
      cuentaId('4200'), // Donaciones Recibidas
      cuentaId('2120'), // IVA Débito Fiscal
    ]);

    if (!cxcId) { console.warn('[auto-asiento] Cuenta 1120 no encontrada'); return; }

    const lines: LineInput[] = [];

    if (inv.dteType === 'DONACION') {
      // Donación recibida → Banco/CxC / Donaciones
      const bancoId = await cuentaId('1110');
      const targetId = bancoId ?? cxcId;
      const ingId  = ingrDonId ?? ingrServId;
      if (!ingId) { console.warn('[auto-asiento] Cuenta 4200/4100 no encontrada'); return; }
      lines.push(
        { accountId: targetId,  descripcion: `Donación recibida ${inv.number}`, debe: total, haber: 0, orden: 0 },
        { accountId: ingId,     descripcion: `Donación ${inv.number} — ${inv.receiverName}`, debe: 0, haber: total, orden: 1 },
      );
    } else {
      // Factura o CCF de servicios
      if (!ingrServId) { console.warn('[auto-asiento] Cuenta 4100 no encontrada'); return; }
      lines.push({ accountId: cxcId, descripcion: `${inv.dteType} ${inv.number} — ${inv.receiverName}`, debe: total, haber: 0, orden: 0 });

      if (iva > 0 && ivaDebId) {
        lines.push({ accountId: ingrServId, descripcion: `Ingreso neto ${inv.number}`, debe: 0, haber: subtotal, orden: 1 });
        lines.push({ accountId: ivaDebId,   descripcion: `IVA débito fiscal ${inv.number}`, debe: 0, haber: iva, orden: 2 });
      } else {
        lines.push({ accountId: ingrServId, descripcion: `Ingreso ${inv.number}`, debe: 0, haber: total, orden: 1 });
      }
    }

    await crearAsiento({
      concepto:  `Emisión ${inv.dteType} ${inv.number} — ${inv.receiverName}`,
      tipo:      'FACTURA',
      origen:    'FACTURA_DTE',
      origenId:  inv.id,
      fecha,
      lines,
    });
  } catch (e) {
    console.error('[auto-asiento] Error en asientoFactura:', e);
  }
}

/* ════════════════════════════════════════════════════════════
   GASTO  — cuando se aprueba (status → APROBADO)
   ════════════════════════════════════════════════════════════ */
export async function asientoGasto(expenseId: string): Promise<void> {
  try {
    const exp = await prisma.expense.findUnique({
      where:   { id: expenseId },
      select:  { id: true, description: true, amount: true, date: true,
                 supplierId: true, projectId: true },
    });
    if (!exp) return;

    const monto = Number(exp.amount);
    const fecha = new Date(exp.date);

    // Debit: Gastos Admin (6200) — si no existe, usar 6100
    // Credit: CxP Proveedores (2110) si hay proveedor, sino Banco (1110)
    const [gastoId, cxpId, bancoId] = await Promise.all([
      cuentaId('6200').then(id => id ?? cuentaId('6100')),
      cuentaId('2110'),
      cuentaId('1110'),
    ]);

    if (!gastoId) { console.warn('[auto-asiento] Cuenta gasto no encontrada'); return; }

    const creditId = exp.supplierId && cxpId ? cxpId : (bancoId ?? cxpId);
    if (!creditId) { console.warn('[auto-asiento] Cuenta crédito no encontrada'); return; }

    await crearAsiento({
      concepto:   `Gasto aprobado: ${exp.description}`,
      tipo:       'GASTO',
      origen:     'GASTO',
      origenId:   exp.id,
      projectId:  exp.projectId,
      fecha,
      lines: [
        { accountId: gastoId,  descripcion: exp.description, debe: monto, haber: 0,     orden: 0 },
        { accountId: creditId, descripcion: exp.description, debe: 0,     haber: monto, orden: 1 },
      ],
    });
  } catch (e) {
    console.error('[auto-asiento] Error en asientoGasto:', e);
  }
}

/* ════════════════════════════════════════════════════════════
   COMPRA  — cuando se recibe (status → RECIBIDO)
   ════════════════════════════════════════════════════════════ */
export async function asientoCompra(purchaseId: string): Promise<void> {
  try {
    const purch = await prisma.purchase.findUnique({
      where:   { id: purchaseId },
      select:  { id: true, date: true, subtotal: true, iva: true, total: true,
                 invoiceRef: true, supplier: { select: { name: true } } },
    });
    if (!purch) return;

    const subtotal = Number(purch.subtotal);
    const iva      = Number(purch.iva);
    const total    = Number(purch.total);
    const fecha    = new Date(purch.date);

    const [invId, ivaCrId, cxpId] = await Promise.all([
      cuentaId('1140'), // Inventario de Insumos
      cuentaId('1170'), // IVA Crédito Fiscal
      cuentaId('2110'), // CxP Proveedores
    ]);

    if (!invId || !cxpId) { console.warn('[auto-asiento] Cuentas compra no encontradas'); return; }

    const lines: LineInput[] = [
      { accountId: invId, descripcion: `Compra recibida — ${purch.supplier.name}`, debe: subtotal, haber: 0, orden: 0 },
    ];

    if (iva > 0 && ivaCrId) {
      lines.push({ accountId: ivaCrId, descripcion: `IVA crédito fiscal — ${purch.invoiceRef ?? ''}`, debe: iva, haber: 0, orden: 1 });
    }

    lines.push({ accountId: cxpId, descripcion: `Factura proveedor ${purch.invoiceRef ?? ''} — ${purch.supplier.name}`, debe: 0, haber: total, orden: lines.length });

    await crearAsiento({
      concepto:  `Recepción compra ${purch.invoiceRef ?? purch.id.slice(-6)} — ${purch.supplier.name}`,
      tipo:      'COMPRA',
      origen:    'COMPRA',
      origenId:  purch.id,
      fecha,
      lines,
    });
  } catch (e) {
    console.error('[auto-asiento] Error en asientoCompra:', e);
  }
}

/* ════════════════════════════════════════════════════════════
   PLANILLA  — cuando se cierra (status → CERRADO)
   ════════════════════════════════════════════════════════════
   Asiento de provisión de planilla:
     Debe:  Sueldos Programa + Sueldos Admin + Cuotas Patronales
     Haber: Sueldos por Pagar + ISSS + AFP + ISR
   ════════════════════════════════════════════════════════════ */
export async function asientoPlanilla(payrollId: string): Promise<void> {
  try {
    const payroll = await prisma.payroll.findUnique({
      where:   { id: payrollId },
      include: { details: true },
    });
    if (!payroll || !payroll.details.length) return;

    const fecha = new Date(payroll.year, payroll.month - 1, 28); // último día hábil

    // Totales
    let totalBruto   = 0;
    let totalNeto    = 0;
    let totalIsssEmp = 0; // Empleado
    let totalAfpEmp  = 0;
    let totalIsr     = 0;
    let totalIsssPatr = 0; // Patronal
    let totalAfpPatr  = 0;

    for (const d of payroll.details) {
      totalBruto    += Number(d.grossSalary);
      totalNeto     += Number(d.netSalary);
      totalIsssEmp  += Number(d.isssEmployee);
      totalAfpEmp   += Number(d.afpEmployee);
      totalIsr      += Number(d.rentaRetention);
      totalIsssPatr += Number(d.isssEmployer);
      totalAfpPatr  += Number(d.afpEmployer);
    }

    // Cuentas
    const [sueldoProgId, sueldoAdmId, sueldosPorPagarId,
           isssId, afpId, isrId] = await Promise.all([
      cuentaId('5100'), // Sueldos Personal de Programa
      cuentaId('6100'), // Sueldos Personal Administrativo
      cuentaId('2130'), // Sueldos por Pagar
      cuentaId('2140'), // ISSS por Pagar
      cuentaId('2150'), // AFP por Pagar
      cuentaId('2160'), // ISR por Pagar
    ]);

    if (!sueldosPorPagarId) { console.warn('[auto-asiento] Cuenta 2130 no encontrada'); return; }

    // Distribuir sueldos 50/50 programa/admin (si no hay datos de puesto por área)
    const mitad = totalBruto / 2;
    const sueldoProgMonto = sueldoProgId ? mitad : 0;
    const sueldoAdmMonto  = sueldoAdmId  ? totalBruto - sueldoProgMonto : totalBruto;

    const lines: LineInput[] = [];

    if (sueldoProgId && sueldoProgMonto > 0)
      lines.push({ accountId: sueldoProgId, descripcion: `Sueldos programa ${payroll.month}/${payroll.year}`, debe: sueldoProgMonto, haber: 0, orden: 0 });

    if (sueldoAdmId)
      lines.push({ accountId: sueldoAdmId, descripcion: `Sueldos admin ${payroll.month}/${payroll.year}`, debe: sueldoAdmMonto, haber: 0, orden: lines.length });

    // Cuotas patronales al debe
    if (isssId && totalIsssPatr > 0)
      lines.push({ accountId: isssId, descripcion: `ISSS patronal ${payroll.month}/${payroll.year}`, debe: totalIsssPatr, haber: 0, orden: lines.length });
    if (afpId && totalAfpPatr > 0)
      lines.push({ accountId: afpId, descripcion: `AFP patronal ${payroll.month}/${payroll.year}`, debe: totalAfpPatr, haber: 0, orden: lines.length });

    // Créditos
    lines.push({ accountId: sueldosPorPagarId, descripcion: `Sueldos netos por pagar ${payroll.month}/${payroll.year}`, debe: 0, haber: totalNeto, orden: lines.length });

    if (isssId) {
      const totalIsss = totalIsssEmp + totalIsssPatr;
      if (totalIsss > 0)
        lines.push({ accountId: isssId, descripcion: `ISSS empleado+patronal ${payroll.month}/${payroll.year}`, debe: 0, haber: totalIsss, orden: lines.length });
    }
    if (afpId) {
      const totalAfp = totalAfpEmp + totalAfpPatr;
      if (totalAfp > 0)
        lines.push({ accountId: afpId, descripcion: `AFP empleado+patronal ${payroll.month}/${payroll.year}`, debe: 0, haber: totalAfp, orden: lines.length });
    }
    if (isrId && totalIsr > 0)
      lines.push({ accountId: isrId, descripcion: `ISR retenido ${payroll.month}/${payroll.year}`, debe: 0, haber: totalIsr, orden: lines.length });

    await crearAsiento({
      concepto:  `Provisión planilla ${payroll.month}/${payroll.year}`,
      tipo:      'PLANILLA',
      origen:    'PLANILLA',
      origenId:  payroll.id,
      fecha,
      lines,
    });
  } catch (e) {
    console.error('[auto-asiento] Error en asientoPlanilla:', e);
  }
}

/* ════════════════════════════════════════════════════════════
   DONACIÓN  — registrar al crear
   ════════════════════════════════════════════════════════════ */
export async function asientoDonacion(donationId: string): Promise<void> {
  try {
    const don = await prisma.donation.findUnique({
      where:   { id: donationId },
      include: { donor: { select: { name: true } } },
    });
    if (!don) return;

    const monto = Number(don.amount);
    const fecha = new Date(don.date);

    const [bancoId, donacionId_] = await Promise.all([
      cuentaId('1110'), // Banco
      cuentaId('4200'), // Donaciones Recibidas
    ]);

    if (!bancoId || !donacionId_) { console.warn('[auto-asiento] Cuentas donación no encontradas'); return; }

    await crearAsiento({
      concepto:   `Donación recibida — ${don.donor.name}`,
      tipo:       'DONACION',
      origen:     'DONACION',
      origenId:   don.id,
      projectId:  don.projectId,
      fecha,
      lines: [
        { accountId: bancoId,    descripcion: `Donación ${don.receiptNumber ?? ''} — ${don.donor.name}`, debe: monto, haber: 0,     orden: 0 },
        { accountId: donacionId_, descripcion: `Donación ${don.receiptNumber ?? ''} — ${don.donor.name}`, debe: 0,     haber: monto, orden: 1 },
      ],
    });
  } catch (e) {
    console.error('[auto-asiento] Error en asientoDonacion:', e);
  }
}
