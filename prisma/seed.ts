/**
 * Seed — Datos iniciales para ASISTEDCOS Admin.
 * Crea usuario ADMIN (Lic. Blanca Estela) y configuración base.
 */

import { PrismaClient, DteType } from '@prisma/client';
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

  console.log('\n🎉 Seed completado exitosamente.');
}

main()
  .catch(e => { console.error('❌ Error en seed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
