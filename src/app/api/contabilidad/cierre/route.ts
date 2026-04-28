/**
 * API Cierre Contable — /api/contabilidad/cierre
 * POST → ejecutar cierre de año fiscal
 *
 * Proceso:
 * 1. Verificar que existan períodos del año y no haya borradores pendientes
 * 2. Calcular superávit/déficit (ingresos - gastos)
 * 3. Generar asiento de cierre: saldar cuentas de resultado y transferir a Patrimonio
 * 4. Cerrar todos los períodos del año
 */
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, apiError } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await getCurrentUser();
    const body = await req.json();
    const { anio, cuentaPatrimonioId } = body;

    if (!anio) return apiError('El año fiscal es requerido', 400);
    if (!cuentaPatrimonioId) return apiError('La cuenta de patrimonio destino es requerida', 400);

    const anioNum = Number(anio);

    // 1. Verificar que no haya asientos en borrador en el año
    const borradores = await prisma.journalEntry.count({
      where: { anio: anioNum, estado: 'BORRADOR' },
    });
    if (borradores > 0) {
      return apiError(
        `Existen ${borradores} asiento(s) en borrador. Publícalos o elimínalos antes del cierre.`,
        409,
      );
    }

    // 2. Verificar que no haya cierre previo para el año
    const cierreExistente = await prisma.journalEntry.findFirst({
      where: { anio: anioNum, tipo: 'CIERRE', estado: 'PUBLICADO' },
    });
    if (cierreExistente) {
      return apiError(`Ya existe un asiento de cierre para el año ${anioNum}`, 409);
    }

    // 3. Obtener cuenta de patrimonio
    const cuentaPatrimonio = await prisma.accountChart.findUniqueOrThrow({
      where: { id: cuentaPatrimonioId },
      select: { id: true, codigo: true, nombre: true, tipo: true },
    });
    if (cuentaPatrimonio.tipo !== 'PATRIMONIO') {
      return apiError('La cuenta seleccionada no es de tipo PATRIMONIO', 400);
    }

    // 4. Calcular saldos de cuentas de resultado (INGRESO, GASTO, COSTO)
    const lineasResultado = await prisma.journalLine.findMany({
      where: {
        entry: { anio: anioNum, estado: 'PUBLICADO' },
        account: { tipo: { in: ['INGRESO', 'GASTO', 'COSTO'] } },
      },
      include: {
        account: { select: { id: true, codigo: true, nombre: true, tipo: true, naturaleza: true } },
      },
    });

    // Agrupar por cuenta
    const cuentasMap = new Map<string, {
      account: typeof lineasResultado[0]['account'];
      totalDebe: number;
      totalHaber: number;
    }>();

    for (const l of lineasResultado) {
      const k = l.accountId;
      if (!cuentasMap.has(k)) cuentasMap.set(k, { account: l.account, totalDebe: 0, totalHaber: 0 });
      const e = cuentasMap.get(k)!;
      e.totalDebe  += Number(l.debe);
      e.totalHaber += Number(l.haber);
    }

    if (cuentasMap.size === 0) {
      return apiError('No hay cuentas de resultado con movimientos en el año para cerrar', 400);
    }

    // 5. Construir líneas del asiento de cierre
    // Para cada cuenta de resultado, la "cerramos" con la operación inversa (saldar a cero)
    // INGRESO (naturaleza ACREEDORA): tiene saldo acreedor → se debita para saldar
    // GASTO/COSTO (naturaleza DEUDORA): tiene saldo deudor → se acredita para saldar
    const lineasCierre: { accountId: string; descripcion: string; debe: number; haber: number; orden: number }[] = [];
    let orden = 0;
    let totalIngresos = 0;
    let totalGastoCosto = 0;

    for (const { account, totalDebe, totalHaber } of cuentasMap.values()) {
      const saldo = account.naturaleza === 'ACREEDORA'
        ? totalHaber - totalDebe   // ingresos: saldo acreedor
        : totalDebe  - totalHaber; // gastos: saldo deudor

      if (Math.abs(saldo) < 0.01) continue; // cuenta ya en cero, omitir

      if (account.tipo === 'INGRESO') {
        // Debitar ingreso para saldar
        lineasCierre.push({ accountId: account.id, descripcion: `Cierre ${account.nombre}`, debe: saldo, haber: 0, orden: orden++ });
        totalIngresos += saldo;
      } else {
        // Acreditar gasto/costo para saldar
        lineasCierre.push({ accountId: account.id, descripcion: `Cierre ${account.nombre}`, debe: 0, haber: saldo, orden: orden++ });
        totalGastoCosto += saldo;
      }
    }

    // Línea de patrimonio: superávit (haber) o déficit (debe)
    const superavit = totalIngresos - totalGastoCosto;
    if (superavit >= 0) {
      lineasCierre.push({
        accountId: cuentaPatrimonioId,
        descripcion: superavit >= 0 ? `Superávit del ejercicio ${anioNum}` : `Déficit del ejercicio ${anioNum}`,
        debe: 0, haber: superavit, orden: orden++,
      });
    } else {
      lineasCierre.push({
        accountId: cuentaPatrimonioId,
        descripcion: `Déficit del ejercicio ${anioNum}`,
        debe: Math.abs(superavit), haber: 0, orden: orden++,
      });
    }

    const totalDebe  = lineasCierre.reduce((s, l) => s + l.debe,  0);
    const totalHaber = lineasCierre.reduce((s, l) => s + l.haber, 0);

    if (Math.abs(totalDebe - totalHaber) > 0.01) {
      return apiError('Error interno: el asiento de cierre no cuadra. Contacte al administrador.', 500);
    }

    // 6. Número correlativo para el asiento
    const ultimo = await prisma.journalEntry.findFirst({
      where: { anio: anioNum },
      orderBy: { numero: 'desc' },
      select: { numero: true },
    });
    const numero = (ultimo?.numero ?? 0) + 1;

    // 7. Crear el asiento de cierre en una transacción
    const asientoCierre = await prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.create({
        data: {
          numero,
          anio: anioNum,
          fecha:     new Date(anioNum, 11, 31), // 31 de diciembre
          concepto:  `Cierre contable del ejercicio ${anioNum}`,
          tipo:      'CIERRE',
          estado:    'PUBLICADO',
          origen:    'MANUAL',
          totalDebe,
          totalHaber,
          lines: { create: lineasCierre },
        },
        include: { lines: { include: { account: { select: { codigo: true, nombre: true } } } } },
      });

      // Cerrar todos los períodos del año
      await tx.accountingPeriod.updateMany({
        where: { anio: anioNum, estado: 'ABIERTO' },
        data:  { estado: 'CERRADO' },
      });

      return entry;
    });

    return ok({
      asiento:         asientoCierre,
      anio:            anioNum,
      totalIngresos,
      totalGastoCosto,
      superavitDeficit: superavit,
      periodiosCerrados: true,
    }, 201);
  } catch (e) { return apiError(e); }
}

/** GET — vista previa del cierre sin ejecutar */
export async function GET(req: NextRequest) {
  try {
    await getCurrentUser();
    const anio = Number(req.nextUrl.searchParams.get('anio') ?? new Date().getFullYear());

    const borradores = await prisma.journalEntry.count({
      where: { anio, estado: 'BORRADOR' },
    });

    const cierreExistente = await prisma.journalEntry.findFirst({
      where: { anio, tipo: 'CIERRE', estado: 'PUBLICADO' },
      select: { id: true, numero: true, fecha: true },
    });

    const lineasResultado = await prisma.journalLine.findMany({
      where: {
        entry: { anio, estado: 'PUBLICADO' },
        account: { tipo: { in: ['INGRESO', 'GASTO', 'COSTO'] } },
      },
      include: {
        account: { select: { codigo: true, nombre: true, tipo: true, naturaleza: true } },
      },
    });

    const cuentasMap = new Map<string, { codigo: string; nombre: string; tipo: string; saldo: number }>();
    for (const l of lineasResultado) {
      const k = l.accountId;
      if (!cuentasMap.has(k)) {
        cuentasMap.set(k, { codigo: l.account.codigo, nombre: l.account.nombre, tipo: l.account.tipo, saldo: 0 });
      }
      const e = cuentasMap.get(k)!;
      e.saldo += l.account.naturaleza === 'ACREEDORA'
        ? Number(l.haber) - Number(l.debe)
        : Number(l.debe)  - Number(l.haber);
    }

    const cuentas = [...cuentasMap.values()].filter(c => Math.abs(c.saldo) > 0.01);
    const totalIngresos   = cuentas.filter(c => c.tipo === 'INGRESO').reduce((s, c) => s + c.saldo, 0);
    const totalGastoCosto = cuentas.filter(c => c.tipo !== 'INGRESO').reduce((s, c) => s + c.saldo, 0);

    return ok({
      anio,
      borradores,
      cierreExistente,
      cuentasResultado: cuentas,
      totalIngresos,
      totalGastoCosto,
      superavitDeficit: totalIngresos - totalGastoCosto,
      puedeEjecutar:   borradores === 0 && !cierreExistente && cuentas.length > 0,
    });
  } catch (e) { return apiError(e); }
}
