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
      case 'libro_auxiliar':      return ok(await libroAuxiliar(accountId, fechaDesde, fechaHasta));
      case 'libro_diario':        return ok(await libroDiario(fechaDesde, fechaHasta));
      case 'estado_actividades':  return ok(await estadoActividades(fechaDesde, fechaHasta));
      case 'balance_general':     return ok(await balanceGeneral(fechaDesde, fechaHasta));
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

/* ── Libro Auxiliar ─────────────────────────────────────────────── */
// Muestra una cuenta agrupadora con todos sus movimientos por subcuenta
async function libroAuxiliar(accountId: string, desde: Date, hasta: Date) {
  if (!accountId) throw new Error('accountId requerido para libro auxiliar');

  // Cargar la cuenta raíz y todos sus descendientes
  const cuentaRaiz = await prisma.accountChart.findUniqueOrThrow({
    where: { id: accountId },
    select: { id: true, codigo: true, nombre: true, tipo: true, naturaleza: true, nivel: true },
  });

  // Obtener todos los descendientes (hijos, nietos, etc.) usando la jerarquía
  const todasLasCuentas = await prisma.accountChart.findMany({
    where: { activa: true },
    select: { id: true, codigo: true, nombre: true, tipo: true, naturaleza: true, nivel: true, parentId: true, permiteMovimiento: true },
    orderBy: { codigo: 'asc' },
  });

  // Construir árbol y obtener IDs descendientes de la cuenta raíz
  function getDescendantIds(rootId: string): string[] {
    const ids: string[] = [rootId];
    const hijos = todasLasCuentas.filter(c => c.parentId === rootId);
    for (const hijo of hijos) ids.push(...getDescendantIds(hijo.id));
    return ids;
  }
  const descendantIds = getDescendantIds(accountId);
  const cuentasMovimiento = todasLasCuentas.filter(
    c => descendantIds.includes(c.id) && c.permiteMovimiento,
  );

  // Obtener movimientos para cada subcuenta
  const subcuentas = await Promise.all(
    cuentasMovimiento.map(async (cuenta) => {
      const lines = await prisma.journalLine.findMany({
        where: {
          accountId: cuenta.id,
          entry: { fecha: { gte: desde, lte: hasta }, estado: 'PUBLICADO' },
        },
        include: {
          entry: { select: { numero: true, anio: true, fecha: true, concepto: true, tipo: true } },
        },
        orderBy: { entry: { fecha: 'asc' } },
      });

      let saldo = 0;
      const movimientos = lines.map(l => {
        const debe  = Number(l.debe);
        const haber = Number(l.haber);
        saldo += cuenta.naturaleza === 'DEUDORA' ? debe - haber : haber - debe;
        return {
          fecha:       l.entry.fecha,
          numero:      `${l.entry.anio}-${String(l.entry.numero).padStart(4, '0')}`,
          concepto:    l.entry.concepto,
          tipo:        l.entry.tipo,
          descripcion: l.descripcion,
          debe, haber,
          saldo,
        };
      });

      return {
        cuenta:     { id: cuenta.id, codigo: cuenta.codigo, nombre: cuenta.nombre, naturaleza: cuenta.naturaleza },
        movimientos,
        totalDebe:  lines.reduce((s, l) => s + Number(l.debe),  0),
        totalHaber: lines.reduce((s, l) => s + Number(l.haber), 0),
        saldoFinal: saldo,
      };
    }),
  );

  const subcuentasConMovimientos = subcuentas.filter(s => s.movimientos.length > 0);

  return {
    tipo:       'libro_auxiliar',
    cuentaRaiz,
    desde, hasta,
    subcuentas: subcuentasConMovimientos,
    totales: {
      totalDebe:  subcuentasConMovimientos.reduce((s, c) => s + c.totalDebe,  0),
      totalHaber: subcuentasConMovimientos.reduce((s, c) => s + c.totalHaber, 0),
      saldoFinal: subcuentasConMovimientos.reduce((s, c) => s + c.saldoFinal, 0),
    },
  };
}

/* ── Balance General ─────────────────────────────────────────────── */
// Estado de Situación Financiera ONG: Activo = Pasivo + Patrimonio
async function balanceGeneral(desde: Date, hasta: Date) {
  // Obtener todos los movimientos publicados hasta la fecha "hasta"
  const lines = await prisma.journalLine.findMany({
    where: {
      entry: { fecha: { lte: hasta }, estado: 'PUBLICADO' },
      account: {
        tipo:             { in: ['ACTIVO', 'PASIVO', 'PATRIMONIO'] },
        permiteMovimiento: true,
      },
    },
    include: {
      account: {
        select: { id: true, codigo: true, nombre: true, tipo: true, naturaleza: true, nivel: true, parentId: true },
      },
    },
  });

  // Agrupar por cuenta
  const map = new Map<string, { account: typeof lines[0]['account']; debe: number; haber: number }>();
  for (const l of lines) {
    const k = l.accountId;
    if (!map.has(k)) map.set(k, { account: l.account, debe: 0, haber: 0 });
    const e = map.get(k)!;
    e.debe  += Number(l.debe);
    e.haber += Number(l.haber);
  }

  // Calcular saldo según naturaleza
  const calcSaldo = (naturaleza: string, debe: number, haber: number) =>
    naturaleza === 'DEUDORA' ? debe - haber : haber - debe;

  type LineaBG = { codigo: string; nombre: string; saldo: number; nivel: number };

  const activos:     LineaBG[] = [];
  const pasivos:     LineaBG[] = [];
  const patrimonios: LineaBG[] = [];

  for (const { account, debe, haber } of map.values()) {
    const saldo = calcSaldo(account.naturaleza, debe, haber);
    if (Math.abs(saldo) < 0.001) continue;

    const linea: LineaBG = { codigo: account.codigo, nombre: account.nombre, saldo, nivel: account.nivel };
    if      (account.tipo === 'ACTIVO')     activos.push(linea);
    else if (account.tipo === 'PASIVO')     pasivos.push(linea);
    else if (account.tipo === 'PATRIMONIO') patrimonios.push(linea);
  }

  // Agregar superávit/déficit acumulado (cuentas de resultado)
  const linesResultado = await prisma.journalLine.findMany({
    where: {
      entry: { fecha: { lte: hasta }, estado: 'PUBLICADO' },
      account: { tipo: { in: ['INGRESO', 'GASTO', 'COSTO'] }, permiteMovimiento: true },
    },
    include: {
      account: { select: { tipo: true, naturaleza: true } },
    },
  });

  let resultadoAcumulado = 0;
  for (const l of linesResultado) {
    const debe  = Number(l.debe);
    const haber = Number(l.haber);
    resultadoAcumulado += l.account.tipo === 'INGRESO'
      ? haber - debe   // ingreso: saldo acreedor
      : debe  - haber; // gasto/costo: negativo
  }

  if (Math.abs(resultadoAcumulado) > 0.01) {
    patrimonios.push({
      codigo: '—',
      nombre: resultadoAcumulado >= 0 ? 'Superávit/Déficit del Período' : 'Déficit del Período',
      saldo:  resultadoAcumulado,
      nivel:  4,
    });
  }

  activos.sort((a, b)     => a.codigo.localeCompare(b.codigo));
  pasivos.sort((a, b)     => a.codigo.localeCompare(b.codigo));
  patrimonios.sort((a, b) => a.codigo.localeCompare(b.codigo));

  const totalActivo     = activos.reduce((s, l) => s + l.saldo, 0);
  const totalPasivo     = pasivos.reduce((s, l) => s + l.saldo, 0);
  const totalPatrimonio = patrimonios.reduce((s, l) => s + l.saldo, 0);
  const cuadra          = Math.abs(totalActivo - (totalPasivo + totalPatrimonio)) < 0.05;

  return {
    tipo: 'balance_general',
    hasta,
    activos,
    pasivos,
    patrimonios,
    totales: { totalActivo, totalPasivo, totalPatrimonio },
    cuadra,
  };
}
