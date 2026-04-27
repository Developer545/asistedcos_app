/**
 * API Reportes Contables ONG — /api/contabilidad/reportes
 * ?tipo=balance_comprobacion | libro_mayor | libro_diario | estado_actividades
 * ?desde=2026-01-01&hasta=2026-12-31
 * ?accountId=xxx  (solo para libro_mayor)
 */
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await getCurrentUser();
    const tipo      = req.nextUrl.searchParams.get('tipo') ?? 'balance_comprobacion';
    const desde     = req.nextUrl.searchParams.get('desde');
    const hasta     = req.nextUrl.searchParams.get('hasta');
    const accountId = req.nextUrl.searchParams.get('accountId') ?? '';

    const fechaDesde = desde ? new Date(desde) : new Date(new Date().getFullYear(), 0, 1);
    const fechaHasta = hasta ? new Date(hasta) : new Date(new Date().getFullYear(), 11, 31, 23, 59, 59);

    switch (tipo) {
      case 'balance_comprobacion': return ok(await balanceComprobacion(fechaDesde, fechaHasta));
      case 'libro_mayor':         return ok(await libroMayor(accountId, fechaDesde, fechaHasta));
      case 'libro_diario':        return ok(await libroDiario(fechaDesde, fechaHasta));
      case 'estado_actividades':  return ok(await estadoActividades(fechaDesde, fechaHasta));
      default: return apiError('Tipo de reporte no válido', 400);
    }
  } catch (e) { return apiError(e); }
}

/* ── Balance de Comprobación ─────────────────────────────────────── */
async function balanceComprobacion(desde: Date, hasta: Date) {
  const lines = await prisma.journalLine.findMany({
    where: {
      entry: {
        fecha:  { gte: desde, lte: hasta },
        estado: 'PUBLICADO',
      },
    },
    include: {
      account: { select: { id: true, codigo: true, nombre: true, tipo: true, naturaleza: true, nivel: true } },
    },
  });

  // Agrupar por cuenta
  const map = new Map<string, {
    cuenta: typeof lines[0]['account'];
    totalDebe: number; totalHaber: number;
  }>();

  for (const l of lines) {
    const key = l.accountId;
    if (!map.has(key)) map.set(key, { cuenta: l.account, totalDebe: 0, totalHaber: 0 });
    const entry = map.get(key)!;
    entry.totalDebe  += Number(l.debe);
    entry.totalHaber += Number(l.haber);
  }

  const lineas = [...map.values()]
    .map(r => ({
      ...r.cuenta,
      totalDebe:  r.totalDebe,
      totalHaber: r.totalHaber,
      saldoDeudor:  r.cuenta.naturaleza === 'DEUDORA'
        ? Math.max(0, r.totalDebe - r.totalHaber) : 0,
      saldoAcreedor: r.cuenta.naturaleza === 'ACREEDORA'
        ? Math.max(0, r.totalHaber - r.totalDebe) : 0,
    }))
    .sort((a, b) => a.codigo.localeCompare(b.codigo));

  const totales = lineas.reduce((acc, l) => ({
    totalDebe:     acc.totalDebe     + l.totalDebe,
    totalHaber:    acc.totalHaber    + l.totalHaber,
    saldoDeudor:   acc.saldoDeudor   + l.saldoDeudor,
    saldoAcreedor: acc.saldoAcreedor + l.saldoAcreedor,
  }), { totalDebe: 0, totalHaber: 0, saldoDeudor: 0, saldoAcreedor: 0 });

  return {
    tipo: 'balance_comprobacion',
    desde, hasta,
    lineas,
    totales,
    cuadra: Math.abs(totales.totalDebe - totales.totalHaber) < 0.01,
  };
}

/* ── Libro Mayor ────────────────────────────────────────────────── */
async function libroMayor(accountId: string, desde: Date, hasta: Date) {
  if (!accountId) throw new Error('accountId requerido para libro mayor');

  const cuenta = await prisma.accountChart.findUniqueOrThrow({
    where: { id: accountId },
    select: { id: true, codigo: true, nombre: true, tipo: true, naturaleza: true },
  });

  const lines = await prisma.journalLine.findMany({
    where: {
      accountId,
      entry: { fecha: { gte: desde, lte: hasta }, estado: 'PUBLICADO' },
    },
    include: {
      entry: { select: { numero: true, fecha: true, concepto: true, tipo: true } },
    },
    orderBy: { entry: { fecha: 'asc' } },
  });

  let saldoAcumulado = 0;
  const movimientos = lines.map(l => {
    const debe  = Number(l.debe);
    const haber = Number(l.haber);
    saldoAcumulado += cuenta.naturaleza === 'DEUDORA' ? debe - haber : haber - debe;
    return {
      fecha:     l.entry.fecha,
      numero:    l.entry.numero,
      concepto:  l.entry.concepto,
      tipo:      l.entry.tipo,
      descripcion: l.descripcion,
      debe,
      haber,
      saldo: saldoAcumulado,
    };
  });

  return {
    tipo: 'libro_mayor',
    cuenta,
    desde, hasta,
    saldoInicial: 0,
    movimientos,
    saldoFinal: saldoAcumulado,
    totalDebe:  lines.reduce((s, l) => s + Number(l.debe),  0),
    totalHaber: lines.reduce((s, l) => s + Number(l.haber), 0),
  };
}

/* ── Libro Diario ───────────────────────────────────────────────── */
async function libroDiario(desde: Date, hasta: Date) {
  const asientos = await prisma.journalEntry.findMany({
    where: { fecha: { gte: desde, lte: hasta }, estado: 'PUBLICADO' },
    orderBy: [{ fecha: 'asc' }, { numero: 'asc' }],
    include: {
      lines: {
        include: { account: { select: { codigo: true, nombre: true } } },
        orderBy: { orden: 'asc' },
      },
    },
  });

  return {
    tipo: 'libro_diario',
    desde, hasta,
    asientos: asientos.map(a => ({
      numero:    a.numero,
      fecha:     a.fecha,
      concepto:  a.concepto,
      tipo:      a.tipo,
      origen:    a.origen,
      totalDebe:  Number(a.totalDebe),
      totalHaber: Number(a.totalHaber),
      lines: a.lines.map(l => ({
        codigo:     l.account.codigo,
        cuenta:     l.account.nombre,
        descripcion: l.descripcion,
        debe:  Number(l.debe),
        haber: Number(l.haber),
      })),
    })),
    totalAsientos: asientos.length,
  };
}

/* ── Estado de Actividades ONG ──────────────────────────────────── */
// Equivalente al Estado de Resultados para empresas sin fines de lucro
// Clasifica: Ingresos (donaciones, coop, servicios) vs Gastos (programa + admin)
async function estadoActividades(desde: Date, hasta: Date) {
  const lines = await prisma.journalLine.findMany({
    where: {
      entry: { fecha: { gte: desde, lte: hasta }, estado: 'PUBLICADO' },
      account: { tipo: { in: ['INGRESO', 'GASTO'] }, permiteMovimiento: true },
    },
    include: {
      account: {
        select: { id: true, codigo: true, nombre: true, tipo: true, naturaleza: true },
        include: { parent: { select: { codigo: true, nombre: true } } },
      },
    },
  });

  // Agrupar por cuenta y calcular saldos
  const map = new Map<string, { cuenta: typeof lines[0]['account']; debe: number; haber: number }>();
  for (const l of lines) {
    if (!map.has(l.accountId)) map.set(l.accountId, { cuenta: l.account, debe: 0, haber: 0 });
    const e = map.get(l.accountId)!;
    e.debe  += Number(l.debe);
    e.haber += Number(l.haber);
  }

  const ingresos: { codigo: string; nombre: string; monto: number }[] = [];
  const gastos:   { codigo: string; nombre: string; monto: number }[] = [];

  for (const { cuenta, debe, haber } of map.values()) {
    const monto = cuenta.tipo === 'INGRESO'
      ? haber - debe    // ingresos se acreditan
      : debe  - haber;  // gastos se debitan

    if (cuenta.tipo === 'INGRESO') {
      ingresos.push({ codigo: cuenta.codigo, nombre: cuenta.nombre, monto });
    } else {
      gastos.push({ codigo: cuenta.codigo, nombre: cuenta.nombre, monto });
    }
  }

  ingresos.sort((a, b) => a.codigo.localeCompare(b.codigo));
  gastos.sort((a,   b) => a.codigo.localeCompare(b.codigo));

  const totalIngresos = ingresos.reduce((s, i) => s + i.monto, 0);
  const totalGastos   = gastos.reduce((s, g) => s + g.monto, 0);
  const superavit     = totalIngresos - totalGastos;

  // Sub-clasificar gastos: programa (5xxx) vs administrativos (6xxx)
  const gastosPrograma = gastos.filter(g => g.codigo.startsWith('5'));
  const gastosAdmin    = gastos.filter(g => g.codigo.startsWith('6'));

  return {
    tipo:  'estado_actividades',
    desde, hasta,
    ingresos,
    gastos,
    gastosPrograma,
    gastosAdmin,
    resumen: {
      totalIngresos,
      totalGastos,
      totalGastosPrograma: gastosPrograma.reduce((s, g) => s + g.monto, 0),
      totalGastosAdmin:    gastosAdmin.reduce((s, g) => s + g.monto, 0),
      superavitDeficit:    superavit,
      esSupervit:          superavit >= 0,
    },
  };
}
