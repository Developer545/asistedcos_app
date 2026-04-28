/**
 * Seed — Datos iniciales para ASISTEDCOS Admin.
 * Crea usuario ADMIN (Lic. Blanca Estela) y configuración base.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient, DteType, TipoCuenta, NaturalezaCuenta } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool    = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma  = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

async function main() {
  console.log('🌱 Iniciando seed...');

  /* ── Usuario administrador ─────────────────────── */
  const hashed = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where:  { email: 'admin@asistedcos.org' },
    update: {},
    create: {
      email:    'admin@asistedcos.org',
      password: hashed,
      name:     'Lic. Blanca Estela',
      role:     'ADMIN',
    },
  });
  console.log('✅ Admin creado:', admin.email);

  /* ── Configuración organizacional ─────────────── */
  const orgData = [
    { key: 'ORG_NAME',         value: 'Fundación ASISTEDCOS El Salvador',  description: 'Nombre legal de la organización' },
    { key: 'ORG_NRC',          value: '000000-0',                          description: 'NRC (IVA)' },
    { key: 'ORG_NIT',          value: '0000-000000-000-0',                 description: 'NIT de la organización' },
    { key: 'ORG_ADDRESS',      value: 'San Salvador, El Salvador',         description: 'Dirección fiscal' },
    { key: 'ORG_PHONE',        value: '',                                  description: 'Teléfono' },
    { key: 'ORG_EMAIL',        value: 'info@asistedcos.org',               description: 'Correo institucional' },
    { key: 'ORG_WEBSITE',      value: 'https://asistedcos.org',            description: 'Sitio web' },
    { key: 'IVA_RATE',         value: '0.13',                              description: 'Tasa IVA El Salvador' },
    { key: 'RENTA_RATE',       value: '0.10',                              description: 'Retención ISR por servicios' },
    { key: 'DONATION_RESOLUTION', value: '',                               description: 'Resolución DGII para Comprobantes de Donación' },
  ];

  for (const item of orgData) {
    await prisma.orgConfig.upsert({
      where:  { key: item.key },
      update: { value: item.value },
      create: item,
    });
  }
  console.log('✅ Configuración organizacional creada');

  /* ── Configuración de planilla ─────────────────── */
  const payrollConfig = [
    { key: 'ISSS_EMPLOYEE_RATE', value: '0.03',  },
    { key: 'ISSS_EMPLOYER_RATE', value: '0.075', },
    { key: 'AFP_EMPLOYEE_RATE',  value: '0.0725', },
    { key: 'AFP_EMPLOYER_RATE',  value: '0.0875', },
    // Tabla de renta El Salvador 2024 (en USD, rangos mensuales)
    {
      key: 'RENTA_TABLE',
      value: JSON.stringify([
        { min: 0,       max: 472.00,  rate: 0,      fixed: 0      },
        { min: 472.01,  max: 895.24,  rate: 0.10,   fixed: 0      },
        { min: 895.25,  max: 2038.10, rate: 0.20,   fixed: 42.32  },
        { min: 2038.11, max: null,    rate: 0.30,   fixed: 271.12 },
      ]),
    },
  ];

  for (const item of payrollConfig) {
    await prisma.payrollConfig.upsert({
      where:  { key: item.key },
      update: { value: item.value },
      create: item,
    });
  }
  console.log('✅ Configuración de planilla creada');

  /* ── Correlativos DTE ──────────────────────────── */
  const correlativos = [
    { dteType: DteType.FACTURA,      prefix: 'FAC', current: 0 },
    { dteType: DteType.CCF,          prefix: 'CCF', current: 0 },
    { dteType: DteType.NOTA_CREDITO, prefix: 'NCF', current: 0 },
    { dteType: DteType.NOTA_DEBITO,  prefix: 'NDF', current: 0 },
    { dteType: DteType.RETENCION,    prefix: 'RET', current: 0 },
    { dteType: DteType.DONACION,     prefix: 'DON', current: 0 },
  ];

  for (const corr of correlativos) {
    await prisma.correlativo.upsert({
      where:  { dteType: corr.dteType },
      update: {},
      create: corr,
    });
  }
  console.log('✅ Correlativos DTE creados');

  /* ── Categorías de gastos ──────────────────────── */
  const categories = [
    'Servicios básicos',
    'Alquiler',
    'Suministros de oficina',
    'Transporte y logística',
    'Alimentación',
    'Capacitaciones',
    'Material educativo',
    'Equipos y herramientas',
    'Mantenimiento',
    'Comunicaciones',
    'Honorarios profesionales',
    'Otros gastos',
  ];

  for (const name of categories) {
    await prisma.expenseCategory.upsert({
      where:  { name },
      update: {},
      create: { name },
    });
  }
  console.log('✅ Categorías de gastos creadas');

  /* ── WebCause (Causas homepage) ───────────────── */
  await prisma.webCause.deleteMany();
  await prisma.webCause.createMany({ data: [
    { titulo: 'Conservación Costa del Bálsamo', descripcion: 'Protección y restauración del manglar en Playa San Diego, La Libertad, en alianza con Concentrix.', tag: 'Manglar', meta: 15000, recaudado: 8550, order: 1, active: true },
    { titulo: 'Distribución de Plántulas Nativas', descripcion: 'Entregamos miles de plántulas nativas a familias rurales para reforestar sus terrenos y recuperar biodiversidad.', tag: 'Reforestación', meta: 8000, recaudado: 6560, order: 2, active: true },
    { titulo: 'Monitoreo de Cuencas Hidrográficas', descripcion: 'Vigilancia continua de ríos y cuerpos de agua para asegurar la salud hídrica de las comunidades rurales.', tag: 'Agua', meta: 12000, recaudado: 5160, order: 3, active: true },
  ]});
  console.log('✅ WebCauses creadas');

  /* ── WebFaq ────────────────────────────────────── */
  await prisma.webFaq.deleteMany();
  await prisma.webFaq.createMany({ data: [
    { question: '¿Cómo puedo donar a ASISTEDCOS?', answer: 'Puedes donar a través de nuestra página web usando tarjeta de crédito/débito, o contactarnos directamente por WhatsApp para coordinar una transferencia bancaria.', order: 1, active: true },
    { question: '¿Son deducibles de impuestos mis donaciones?', answer: 'Sí. ASISTEDCOS es una fundación sin fines de lucro legalmente reconocida en El Salvador. Emitimos recibos oficiales que pueden utilizarse para deducciones fiscales conforme a la Ley de Impuesto sobre la Renta.', order: 2, active: true },
    { question: '¿Cómo puedo ser voluntario?', answer: 'Puedes registrarte a través de nuestro formulario de contacto o escribirnos por WhatsApp. Organizamos jornadas de reforestación, limpieza de playas y monitoreo ambiental a lo largo del año.', order: 3, active: true },
    { question: '¿En qué zonas trabajan?', answer: 'Trabajamos principalmente en La Libertad, Sonsonate y La Paz — departamentos costeros de El Salvador con alta biodiversidad y comunidades rurales vulnerables.', order: 4, active: true },
    { question: '¿Cómo pueden aliarse las empresas con ASISTEDCOS?', answer: 'Ofrecemos programas de responsabilidad social empresarial con impacto ambiental medible. Contáctenos para conocer las modalidades de alianza y los reportes de impacto que entregamos.', order: 5, active: true },
  ]});
  console.log('✅ WebFaqs creadas');

  /* ── WebPartner ────────────────────────────────── */
  await prisma.webPartner.deleteMany();
  await prisma.webPartner.createMany({ data: [
    { name: 'Concentrix El Salvador', url: 'https://concentrix.com', active: true, order: 1 },
    { name: 'Ministerio de Medio Ambiente', url: 'https://marn.gob.sv', active: true, order: 2 },
    { name: 'MINED', url: 'https://www.mined.gob.sv', active: true, order: 3 },
  ]});
  console.log('✅ WebPartners creados');

  /* ── Catálogo de Cuentas ONG El Salvador ─────────── */
  await seedCatalogoCuentasONG();
  console.log('✅ Catálogo de cuentas ONG creado');

  /* ── Tipos de partida contable ──────────────────── */
  await seedTiposPartida();

  console.log('\n🎉 Seed completado exitosamente.');
}

// ═══════════════════════════════════════════════════════════════════
// CATÁLOGO DE CUENTAS ADAPTADO PARA ONG — El Salvador (NIIF PYMES)
// Diferencias vs empresa comercial:
//   - Patrimonio Fundacional en lugar de Capital Social
//   - Fondos Restringidos / No Restringidos
//   - Ingresos por Donaciones / Cooperación / Subvenciones
//   - Gastos de Programa vs Gastos Administrativos (por función)
// ═══════════════════════════════════════════════════════════════════

type CuentaInput = {
  codigo: string; nombre: string; tipo: TipoCuenta;
  naturaleza: NaturalezaCuenta; nivel: number;
  permiteMovimiento: boolean; descripcion?: string;
};

const CATALOGO_ONG: CuentaInput[] = [
  // ─── 1. ACTIVO ───────────────────────────────────────────────────
  { codigo:'1',        nombre:'ACTIVO',                                  tipo:'ACTIVO',     naturaleza:'DEUDORA',   nivel:1, permiteMovimiento:false },
  { codigo:'11',       nombre:'ACTIVO CORRIENTE',                        tipo:'ACTIVO',     naturaleza:'DEUDORA',   nivel:2, permiteMovimiento:false },
  { codigo:'1101',     nombre:'Efectivo y Equivalentes de Efectivo',     tipo:'ACTIVO',     naturaleza:'DEUDORA',   nivel:3, permiteMovimiento:false },
  { codigo:'110101',   nombre:'Caja General',                            tipo:'ACTIVO',     naturaleza:'DEUDORA',   nivel:4, permiteMovimiento:true,  descripcion:'Efectivo en caja' },
  { codigo:'110102',   nombre:'Caja Chica',                              tipo:'ACTIVO',     naturaleza:'DEUDORA',   nivel:4, permiteMovimiento:true,  descripcion:'Fondo fijo para gastos menores' },
  { codigo:'110103',   nombre:'Banco — Cuenta Corriente Operacional',    tipo:'ACTIVO',     naturaleza:'DEUDORA',   nivel:4, permiteMovimiento:true },
  { codigo:'110104',   nombre:'Banco — Cuenta de Fondos Restringidos',   tipo:'ACTIVO',     naturaleza:'DEUDORA',   nivel:4, permiteMovimiento:true,  descripcion:'Cuenta exclusiva para fondos de cooperación' },
  { codigo:'110105',   nombre:'Banco — Cuenta de Donaciones',            tipo:'ACTIVO',     naturaleza:'DEUDORA',   nivel:4, permiteMovimiento:true },
  { codigo:'1102',     nombre:'Cuentas por Cobrar',                      tipo:'ACTIVO',     naturaleza:'DEUDORA',   nivel:3, permiteMovimiento:false },
  { codigo:'110201',   nombre:'CxC — Donaciones Prometidas',             tipo:'ACTIVO',     naturaleza:'DEUDORA',   nivel:4, permiteMovimiento:true,  descripcion:'Donaciones formalizadas pendientes de cobro' },
  { codigo:'110202',   nombre:'CxC — Subvenciones por Cobrar',           tipo:'ACTIVO',     naturaleza:'DEUDORA',   nivel:4, permiteMovimiento:true,  descripcion:'Fondos de cooperación aprobados no desembolsados' },
  { codigo:'110203',   nombre:'CxC — Servicios Prestados',               tipo:'ACTIVO',     naturaleza:'DEUDORA',   nivel:4, permiteMovimiento:true },
  { codigo:'1103',     nombre:'IVA Crédito Fiscal',                      tipo:'ACTIVO',     naturaleza:'DEUDORA',   nivel:3, permiteMovimiento:false },
  { codigo:'110301',   nombre:'IVA Crédito Fiscal Compras',              tipo:'ACTIVO',     naturaleza:'DEUDORA',   nivel:4, permiteMovimiento:true,  descripcion:'IVA pagado en compras (crédito fiscal)' },
  { codigo:'1104',     nombre:'Anticipos y Gastos Pagados por Anticipado',tipo:'ACTIVO',    naturaleza:'DEUDORA',   nivel:3, permiteMovimiento:false },
  { codigo:'110401',   nombre:'Anticipos a Proveedores',                  tipo:'ACTIVO',    naturaleza:'DEUDORA',   nivel:4, permiteMovimiento:true },
  { codigo:'110402',   nombre:'Alquileres Pagados por Anticipado',        tipo:'ACTIVO',    naturaleza:'DEUDORA',   nivel:4, permiteMovimiento:true },
  { codigo:'110403',   nombre:'Seguros Pagados por Anticipado',           tipo:'ACTIVO',    naturaleza:'DEUDORA',   nivel:4, permiteMovimiento:true },
  { codigo:'1105',     nombre:'Inventario de Suministros',                tipo:'ACTIVO',    naturaleza:'DEUDORA',   nivel:3, permiteMovimiento:false },
  { codigo:'110501',   nombre:'Suministros de Oficina',                   tipo:'ACTIVO',    naturaleza:'DEUDORA',   nivel:4, permiteMovimiento:true },
  { codigo:'110502',   nombre:'Materiales de Programas',                  tipo:'ACTIVO',    naturaleza:'DEUDORA',   nivel:4, permiteMovimiento:true,  descripcion:'Insumos para proyectos de impacto' },
  { codigo:'12',       nombre:'ACTIVO NO CORRIENTE',                      tipo:'ACTIVO',    naturaleza:'DEUDORA',   nivel:2, permiteMovimiento:false },
  { codigo:'1201',     nombre:'Propiedad, Planta y Equipo',               tipo:'ACTIVO',    naturaleza:'DEUDORA',   nivel:3, permiteMovimiento:false },
  { codigo:'120101',   nombre:'Mobiliario y Equipo de Oficina',           tipo:'ACTIVO',    naturaleza:'DEUDORA',   nivel:4, permiteMovimiento:true },
  { codigo:'120102',   nombre:'Equipo de Cómputo',                        tipo:'ACTIVO',    naturaleza:'DEUDORA',   nivel:4, permiteMovimiento:true },
  { codigo:'120103',   nombre:'Vehículos',                                tipo:'ACTIVO',    naturaleza:'DEUDORA',   nivel:4, permiteMovimiento:true },
  { codigo:'120104',   nombre:'Equipo de Campo / Herramientas',           tipo:'ACTIVO',    naturaleza:'DEUDORA',   nivel:4, permiteMovimiento:true,  descripcion:'Equipos para proyectos ambientales' },
  { codigo:'1202',     nombre:'Depreciación Acumulada',                   tipo:'ACTIVO',    naturaleza:'ACREEDORA', nivel:3, permiteMovimiento:false },
  { codigo:'120201',   nombre:'Depreciación — Mobiliario y Equipo',       tipo:'ACTIVO',    naturaleza:'ACREEDORA', nivel:4, permiteMovimiento:true },
  { codigo:'120202',   nombre:'Depreciación — Equipo de Cómputo',         tipo:'ACTIVO',    naturaleza:'ACREEDORA', nivel:4, permiteMovimiento:true },
  { codigo:'120203',   nombre:'Depreciación — Vehículos',                 tipo:'ACTIVO',    naturaleza:'ACREEDORA', nivel:4, permiteMovimiento:true },
  { codigo:'120204',   nombre:'Depreciación — Equipo de Campo',           tipo:'ACTIVO',    naturaleza:'ACREEDORA', nivel:4, permiteMovimiento:true },

  // ─── 2. PASIVO ───────────────────────────────────────────────────
  { codigo:'2',        nombre:'PASIVO',                                   tipo:'PASIVO',    naturaleza:'ACREEDORA', nivel:1, permiteMovimiento:false },
  { codigo:'21',       nombre:'PASIVO CORRIENTE',                         tipo:'PASIVO',    naturaleza:'ACREEDORA', nivel:2, permiteMovimiento:false },
  { codigo:'2101',     nombre:'Cuentas por Pagar Comerciales',            tipo:'PASIVO',    naturaleza:'ACREEDORA', nivel:3, permiteMovimiento:false },
  { codigo:'210101',   nombre:'Proveedores Nacionales',                   tipo:'PASIVO',    naturaleza:'ACREEDORA', nivel:4, permiteMovimiento:true },
  { codigo:'210102',   nombre:'Documentos por Pagar Corto Plazo',         tipo:'PASIVO',    naturaleza:'ACREEDORA', nivel:4, permiteMovimiento:true },
  { codigo:'2102',     nombre:'Obligaciones con Empleados',               tipo:'PASIVO',    naturaleza:'ACREEDORA', nivel:3, permiteMovimiento:false },
  { codigo:'210201',   nombre:'Sueldos por Pagar',                        tipo:'PASIVO',    naturaleza:'ACREEDORA', nivel:4, permiteMovimiento:true },
  { codigo:'210202',   nombre:'Vacaciones por Pagar',                     tipo:'PASIVO',    naturaleza:'ACREEDORA', nivel:4, permiteMovimiento:true },
  { codigo:'210203',   nombre:'Aguinaldo por Pagar',                      tipo:'PASIVO',    naturaleza:'ACREEDORA', nivel:4, permiteMovimiento:true },
  { codigo:'2103',     nombre:'Retenciones y Cotizaciones por Pagar',     tipo:'PASIVO',    naturaleza:'ACREEDORA', nivel:3, permiteMovimiento:false },
  { codigo:'210301',   nombre:'ISSS por Pagar — Empleado',                tipo:'PASIVO',    naturaleza:'ACREEDORA', nivel:4, permiteMovimiento:true },
  { codigo:'210302',   nombre:'ISSS por Pagar — Patronal',                tipo:'PASIVO',    naturaleza:'ACREEDORA', nivel:4, permiteMovimiento:true },
  { codigo:'210303',   nombre:'AFP por Pagar — Empleado',                 tipo:'PASIVO',    naturaleza:'ACREEDORA', nivel:4, permiteMovimiento:true },
  { codigo:'210304',   nombre:'AFP por Pagar — Patronal',                 tipo:'PASIVO',    naturaleza:'ACREEDORA', nivel:4, permiteMovimiento:true },
  { codigo:'210305',   nombre:'ISR (Renta) por Pagar',                    tipo:'PASIVO',    naturaleza:'ACREEDORA', nivel:4, permiteMovimiento:true },
  { codigo:'210306',   nombre:'INSAFORP por Pagar',                       tipo:'PASIVO',    naturaleza:'ACREEDORA', nivel:4, permiteMovimiento:true },
  { codigo:'2104',     nombre:'IVA Débito Fiscal',                        tipo:'PASIVO',    naturaleza:'ACREEDORA', nivel:3, permiteMovimiento:false },
  { codigo:'210401',   nombre:'IVA Débito Fiscal por Pagar',              tipo:'PASIVO',    naturaleza:'ACREEDORA', nivel:4, permiteMovimiento:true,  descripcion:'IVA cobrado en ventas/servicios gravados' },
  { codigo:'2105',     nombre:'Fondos de Cooperación Recibidos por Anticipado', tipo:'PASIVO', naturaleza:'ACREEDORA', nivel:3, permiteMovimiento:false },
  { codigo:'210501',   nombre:'Fondos Internacionales No Ejecutados',     tipo:'PASIVO',    naturaleza:'ACREEDORA', nivel:4, permiteMovimiento:true,  descripcion:'Recursos de cooperantes pendientes de ejecución' },
  { codigo:'210502',   nombre:'Donaciones Condicionadas No Devengadas',   tipo:'PASIVO',    naturaleza:'ACREEDORA', nivel:4, permiteMovimiento:true },
  { codigo:'2106',     nombre:'Retenciones a Terceros por Pagar',         tipo:'PASIVO',    naturaleza:'ACREEDORA', nivel:3, permiteMovimiento:false },
  { codigo:'210601',   nombre:'Retención ISR Servicios por Pagar',        tipo:'PASIVO',    naturaleza:'ACREEDORA', nivel:4, permiteMovimiento:true,  descripcion:'Retenciones de renta aplicadas a proveedores' },
  { codigo:'22',       nombre:'PASIVO NO CORRIENTE',                      tipo:'PASIVO',    naturaleza:'ACREEDORA', nivel:2, permiteMovimiento:false },
  { codigo:'2201',     nombre:'Préstamos a Largo Plazo',                  tipo:'PASIVO',    naturaleza:'ACREEDORA', nivel:3, permiteMovimiento:false },
  { codigo:'220101',   nombre:'Préstamos Bancarios L/P',                  tipo:'PASIVO',    naturaleza:'ACREEDORA', nivel:4, permiteMovimiento:true },

  // ─── 3. PATRIMONIO ───────────────────────────────────────────────
  { codigo:'3',        nombre:'PATRIMONIO NETO',                          tipo:'PATRIMONIO', naturaleza:'ACREEDORA', nivel:1, permiteMovimiento:false, descripcion:'Patrimonio de la fundación sin fines de lucro' },
  { codigo:'31',       nombre:'PATRIMONIO FUNDACIONAL',                   tipo:'PATRIMONIO', naturaleza:'ACREEDORA', nivel:2, permiteMovimiento:false },
  { codigo:'3101',     nombre:'Patrimonio Fundacional Inicial',           tipo:'PATRIMONIO', naturaleza:'ACREEDORA', nivel:3, permiteMovimiento:true,  descripcion:'Aporte inicial de los fundadores' },
  { codigo:'32',       nombre:'FONDOS CON RESTRICCIONES PERMANENTES',     tipo:'PATRIMONIO', naturaleza:'ACREEDORA', nivel:2, permiteMovimiento:false, descripcion:'Fondos cuyo uso está restringido permanentemente por el donante' },
  { codigo:'3201',     nombre:'Fondos para Proyectos Específicos',        tipo:'PATRIMONIO', naturaleza:'ACREEDORA', nivel:3, permiteMovimiento:true },
  { codigo:'33',       nombre:'FONDOS CON RESTRICCIONES TEMPORALES',      tipo:'PATRIMONIO', naturaleza:'ACREEDORA', nivel:2, permiteMovimiento:false, descripcion:'Fondos con restricción que se libera al cumplir condición' },
  { codigo:'3301',     nombre:'Fondos de Cooperación Internacional',      tipo:'PATRIMONIO', naturaleza:'ACREEDORA', nivel:3, permiteMovimiento:true },
  { codigo:'3302',     nombre:'Fondos de Subvenciones Gubernamentales',   tipo:'PATRIMONIO', naturaleza:'ACREEDORA', nivel:3, permiteMovimiento:true },
  { codigo:'34',       nombre:'FONDOS SIN RESTRICCIONES',                 tipo:'PATRIMONIO', naturaleza:'ACREEDORA', nivel:2, permiteMovimiento:false },
  { codigo:'3401',     nombre:'Superávit / Déficit Ejercicios Anteriores',tipo:'PATRIMONIO', naturaleza:'ACREEDORA', nivel:3, permiteMovimiento:true },
  { codigo:'3402',     nombre:'Superávit / Déficit del Ejercicio',        tipo:'PATRIMONIO', naturaleza:'ACREEDORA', nivel:3, permiteMovimiento:true,  descripcion:'Resultado del período actual' },

  // ─── 4. INGRESOS ─────────────────────────────────────────────────
  { codigo:'4',        nombre:'INGRESOS',                                 tipo:'INGRESO',   naturaleza:'ACREEDORA', nivel:1, permiteMovimiento:false },
  { codigo:'41',       nombre:'INGRESOS POR DONACIONES',                  tipo:'INGRESO',   naturaleza:'ACREEDORA', nivel:2, permiteMovimiento:false, descripcion:'Principal fuente de fondos de la ONG' },
  { codigo:'4101',     nombre:'Donaciones Nacionales — Personas Naturales',tipo:'INGRESO',  naturaleza:'ACREEDORA', nivel:3, permiteMovimiento:true,  descripcion:'Donaciones individuales de personas naturales SV' },
  { codigo:'4102',     nombre:'Donaciones Nacionales — Empresas',         tipo:'INGRESO',   naturaleza:'ACREEDORA', nivel:3, permiteMovimiento:true,  descripcion:'Donaciones corporativas nacionales (RSE)' },
  { codigo:'4103',     nombre:'Donaciones Internacionales',               tipo:'INGRESO',   naturaleza:'ACREEDORA', nivel:3, permiteMovimiento:true,  descripcion:'Fondos de organismos internacionales y ONG extranjeras' },
  { codigo:'42',       nombre:'INGRESOS POR COOPERACIÓN Y SUBVENCIONES',  tipo:'INGRESO',   naturaleza:'ACREEDORA', nivel:2, permiteMovimiento:false },
  { codigo:'4201',     nombre:'Subvenciones Gubernamentales',             tipo:'INGRESO',   naturaleza:'ACREEDORA', nivel:3, permiteMovimiento:true,  descripcion:'Fondos de gobierno SV (MARN, FISDL, etc.)' },
  { codigo:'4202',     nombre:'Cooperación Internacional (Convenios)',    tipo:'INGRESO',   naturaleza:'ACREEDORA', nivel:3, permiteMovimiento:true,  descripcion:'Fondos de agencias de cooperación (USAID, GIZ, UE, etc.)' },
  { codigo:'43',       nombre:'INGRESOS POR SERVICIOS',                   tipo:'INGRESO',   naturaleza:'ACREEDORA', nivel:2, permiteMovimiento:false },
  { codigo:'4301',     nombre:'Capacitaciones y Talleres',                tipo:'INGRESO',   naturaleza:'ACREEDORA', nivel:3, permiteMovimiento:true },
  { codigo:'4302',     nombre:'Consultorías y Asistencia Técnica',        tipo:'INGRESO',   naturaleza:'ACREEDORA', nivel:3, permiteMovimiento:true },
  { codigo:'44',       nombre:'OTROS INGRESOS',                           tipo:'INGRESO',   naturaleza:'ACREEDORA', nivel:2, permiteMovimiento:false },
  { codigo:'4401',     nombre:'Ingresos Financieros (intereses)',         tipo:'INGRESO',   naturaleza:'ACREEDORA', nivel:3, permiteMovimiento:true },
  { codigo:'4402',     nombre:'Ingresos por Venta de Activos',            tipo:'INGRESO',   naturaleza:'ACREEDORA', nivel:3, permiteMovimiento:true },
  { codigo:'4403',     nombre:'Otros Ingresos Varios',                    tipo:'INGRESO',   naturaleza:'ACREEDORA', nivel:3, permiteMovimiento:true },

  // ─── 5. GASTOS DE PROGRAMA ───────────────────────────────────────
  { codigo:'5',        nombre:'GASTOS DE PROGRAMA',                       tipo:'GASTO',     naturaleza:'DEUDORA',   nivel:1, permiteMovimiento:false, descripcion:'Gastos directamente relacionados con la misión de la ONG' },
  { codigo:'51',       nombre:'PROGRAMA — CONSERVACIÓN AMBIENTAL',        tipo:'GASTO',     naturaleza:'DEUDORA',   nivel:2, permiteMovimiento:false },
  { codigo:'5101',     nombre:'Personal de Campo — Programa Ambiental',   tipo:'GASTO',     naturaleza:'DEUDORA',   nivel:3, permiteMovimiento:true },
  { codigo:'5102',     nombre:'Materiales y Suministros — Reforestación', tipo:'GASTO',     naturaleza:'DEUDORA',   nivel:3, permiteMovimiento:true },
  { codigo:'5103',     nombre:'Transporte y Logística — Proyectos',       tipo:'GASTO',     naturaleza:'DEUDORA',   nivel:3, permiteMovimiento:true },
  { codigo:'5104',     nombre:'Capacitación Comunitaria',                 tipo:'GASTO',     naturaleza:'DEUDORA',   nivel:3, permiteMovimiento:true },
  { codigo:'5105',     nombre:'Equipos y Herramientas — Programas',       tipo:'GASTO',     naturaleza:'DEUDORA',   nivel:3, permiteMovimiento:true },
  { codigo:'52',       nombre:'PROGRAMA — DESARROLLO COMUNITARIO',        tipo:'GASTO',     naturaleza:'DEUDORA',   nivel:2, permiteMovimiento:false },
  { codigo:'5201',     nombre:'Personal — Programa Comunitario',          tipo:'GASTO',     naturaleza:'DEUDORA',   nivel:3, permiteMovimiento:true },
  { codigo:'5202',     nombre:'Materiales Educativos',                    tipo:'GASTO',     naturaleza:'DEUDORA',   nivel:3, permiteMovimiento:true },
  { codigo:'5203',     nombre:'Atención a Beneficiarios',                 tipo:'GASTO',     naturaleza:'DEUDORA',   nivel:3, permiteMovimiento:true },
  { codigo:'5204',     nombre:'Eventos y Actividades Comunitarias',       tipo:'GASTO',     naturaleza:'DEUDORA',   nivel:3, permiteMovimiento:true },
  { codigo:'53',       nombre:'PROGRAMA — VOLUNTARIADO',                  tipo:'GASTO',     naturaleza:'DEUDORA',   nivel:2, permiteMovimiento:false },
  { codigo:'5301',     nombre:'Gastos Coordinación Voluntarios',          tipo:'GASTO',     naturaleza:'DEUDORA',   nivel:3, permiteMovimiento:true },
  { codigo:'5302',     nombre:'Uniformes y Materiales Voluntarios',       tipo:'GASTO',     naturaleza:'DEUDORA',   nivel:3, permiteMovimiento:true },

  // ─── 6. GASTOS ADMINISTRATIVOS ───────────────────────────────────
  { codigo:'6',        nombre:'GASTOS ADMINISTRATIVOS Y GENERALES',       tipo:'GASTO',     naturaleza:'DEUDORA',   nivel:1, permiteMovimiento:false, descripcion:'Gastos de operación y administración de la fundación' },
  { codigo:'61',       nombre:'GASTOS DE PERSONAL ADMINISTRATIVO',        tipo:'GASTO',     naturaleza:'DEUDORA',   nivel:2, permiteMovimiento:false },
  { codigo:'6101',     nombre:'Sueldos y Salarios — Administrativos',     tipo:'GASTO',     naturaleza:'DEUDORA',   nivel:3, permiteMovimiento:true },
  { codigo:'6102',     nombre:'ISSS Patronal — Administrativos',          tipo:'GASTO',     naturaleza:'DEUDORA',   nivel:3, permiteMovimiento:true },
  { codigo:'6103',     nombre:'AFP Patronal — Administrativos',           tipo:'GASTO',     naturaleza:'DEUDORA',   nivel:3, permiteMovimiento:true },
  { codigo:'6104',     nombre:'INSAFORP',                                 tipo:'GASTO',     naturaleza:'DEUDORA',   nivel:3, permiteMovimiento:true },
  { codigo:'6105',     nombre:'Vacaciones y Aguinaldo',                   tipo:'GASTO',     naturaleza:'DEUDORA',   nivel:3, permiteMovimiento:true },
  { codigo:'62',       nombre:'GASTOS GENERALES DE OPERACIÓN',            tipo:'GASTO',     naturaleza:'DEUDORA',   nivel:2, permiteMovimiento:false },
  { codigo:'6201',     nombre:'Alquiler de Instalaciones',                tipo:'GASTO',     naturaleza:'DEUDORA',   nivel:3, permiteMovimiento:true },
  { codigo:'6202',     nombre:'Servicios Básicos (agua, luz, internet)',   tipo:'GASTO',     naturaleza:'DEUDORA',   nivel:3, permiteMovimiento:true },
  { codigo:'6203',     nombre:'Comunicaciones y Telefonía',               tipo:'GASTO',     naturaleza:'DEUDORA',   nivel:3, permiteMovimiento:true },
  { codigo:'6204',     nombre:'Suministros de Oficina',                   tipo:'GASTO',     naturaleza:'DEUDORA',   nivel:3, permiteMovimiento:true },
  { codigo:'6205',     nombre:'Mantenimiento y Reparaciones',             tipo:'GASTO',     naturaleza:'DEUDORA',   nivel:3, permiteMovimiento:true },
  { codigo:'6206',     nombre:'Depreciación de Activos',                  tipo:'GASTO',     naturaleza:'DEUDORA',   nivel:3, permiteMovimiento:true },
  { codigo:'6207',     nombre:'Seguros',                                  tipo:'GASTO',     naturaleza:'DEUDORA',   nivel:3, permiteMovimiento:true },
  { codigo:'63',       nombre:'GASTOS DE CAPTACIÓN DE FONDOS',            tipo:'GASTO',     naturaleza:'DEUDORA',   nivel:2, permiteMovimiento:false, descripcion:'Costos de recaudación y comunicación institucional' },
  { codigo:'6301',     nombre:'Comunicación y Marketing Institucional',   tipo:'GASTO',     naturaleza:'DEUDORA',   nivel:3, permiteMovimiento:true },
  { codigo:'6302',     nombre:'Eventos de Recaudación',                   tipo:'GASTO',     naturaleza:'DEUDORA',   nivel:3, permiteMovimiento:true },
  { codigo:'6303',     nombre:'Honorarios Profesionales Externos',        tipo:'GASTO',     naturaleza:'DEUDORA',   nivel:3, permiteMovimiento:true },
  { codigo:'64',       nombre:'GASTOS FINANCIEROS',                       tipo:'GASTO',     naturaleza:'DEUDORA',   nivel:2, permiteMovimiento:false },
  { codigo:'6401',     nombre:'Comisiones Bancarias',                     tipo:'GASTO',     naturaleza:'DEUDORA',   nivel:3, permiteMovimiento:true },
  { codigo:'6402',     nombre:'Intereses y Cargos Financieros',           tipo:'GASTO',     naturaleza:'DEUDORA',   nivel:3, permiteMovimiento:true },
];

async function seedCatalogoCuentasONG() {
  // Limpiar catálogo existente para re-seed limpio
  const existentes = await prisma.accountChart.count();
  if (existentes > 0) {
    console.log(`  ℹ Catálogo ya tiene ${existentes} cuentas — omitiendo re-seed`);
    return;
  }

  // Crear todas las cuentas (primero las de nivel 1 y 2 sin parent)
  const created = new Map<string, string>(); // codigo → id

  // Ordenar por código para garantizar que los padres se crean primero
  const sorted = [...CATALOGO_ONG].sort((a, b) => a.codigo.localeCompare(b.codigo));

  for (const cuenta of sorted) {
    // Determinar parentId buscando por prefijo del código
    let parentId: string | null = null;
    if (cuenta.nivel > 1) {
      // El padre tiene el mismo código sin el último segmento
      const codigoPadre = cuenta.codigo.slice(0, cuenta.nivel === 2 ? 1 : cuenta.nivel === 3 ? 2 : 4);
      parentId = created.get(codigoPadre) ?? null;
    }

    const registro = await prisma.accountChart.create({
      data: {
        codigo:            cuenta.codigo,
        nombre:            cuenta.nombre,
        tipo:              cuenta.tipo,
        naturaleza:        cuenta.naturaleza,
        nivel:             cuenta.nivel,
        permiteMovimiento: cuenta.permiteMovimiento,
        descripcion:       cuenta.descripcion ?? null,
        parentId,
        activa:            true,
      },
    });
    created.set(cuenta.codigo, registro.id);
  }

  console.log(`  ✅ ${sorted.length} cuentas creadas en el catálogo ONG`);
}

async function seedTiposPartida() {
  const tipos = [
    { codigo: 'DIARIO',        nombre: 'Diario',                      descripcion: 'Asiento contable general del día',               orden: 1 },
    { codigo: 'AJUSTE',        nombre: 'Ajuste de período',            descripcion: 'Corrección o ajuste de fin de período',          orden: 2 },
    { codigo: 'APERTURA',      nombre: 'Apertura',                     descripcion: 'Asiento de apertura del ejercicio fiscal',        orden: 3 },
    { codigo: 'CIERRE',        nombre: 'Cierre',                       descripcion: 'Asiento de cierre del ejercicio fiscal',          orden: 4 },
    { codigo: 'VENTA',         nombre: 'Venta / Ingreso',              descripcion: 'Registro de ingresos por servicios o DTE',        orden: 5 },
    { codigo: 'COMPRA',        nombre: 'Compra',                       descripcion: 'Registro de adquisición de bienes o servicios',   orden: 6 },
    { codigo: 'GASTO',         nombre: 'Gasto',                        descripcion: 'Registro de gastos operativos o administrativos', orden: 7 },
    { codigo: 'PLANILLA',      nombre: 'Planilla',                     descripcion: 'Provisión y pago de nómina',                     orden: 8 },
    { codigo: 'DONACION',      nombre: 'Donación',                     descripcion: 'Registro de donaciones recibidas',               orden: 9 },
    { codigo: 'DEPRECIACION',  nombre: 'Depreciación',                 descripcion: 'Gasto de depreciación de activos fijos',          orden: 10 },
    { codigo: 'PROVISION',     nombre: 'Provisión',                    descripcion: 'Provisión de obligaciones futuras',              orden: 11 },
    { codigo: 'TRANSFERENCIA', nombre: 'Transferencia entre cuentas',  descripcion: 'Movimiento interno entre cuentas bancarias',     orden: 12 },
  ];

  for (const t of tipos) {
    await prisma.journalEntryType.upsert({
      where:  { codigo: t.codigo },
      update: { nombre: t.nombre, descripcion: t.descripcion, orden: t.orden },
      create: t,
    });
  }
  console.log(`  ✅ ${tipos.length} tipos de partida creados`);
}

main()
  .catch(e => { console.error('❌ Error en seed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
