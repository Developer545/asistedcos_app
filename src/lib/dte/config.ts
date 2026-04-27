/**
 * Configuración DTE — Ministerio de Hacienda El Salvador
 *
 * Variables de entorno requeridas (agregar en .env.local):
 *
 * ── Modo de operación ────────────────────────────────────────
 * DTE_MODE=offline           → Sin conexión MH (genera JSON local)
 * DTE_MODE=test              → Ambiente de pruebas MH
 * DTE_MODE=production        → Ambiente producción MH
 *
 * ── Datos del emisor ─────────────────────────────────────────
 * DTE_NIT=                   → NIT de la fundación (sin guiones)
 * DTE_NRC=                   → NRC (si aplica, ONGs exentas pueden dejarlo vacío)
 * DTE_NOMBRE=                → Razón social
 * DTE_NOMBRE_COMERCIAL=      → Nombre comercial (opcional)
 * DTE_ACTIVIDAD=84120        → Código actividad económica (CIIU ONG)
 * DTE_DESC_ACTIVIDAD=        → Descripción actividad
 * DTE_TIPO_ESTABLECIMIENTO=01
 * DTE_COD_ESTABLECIMIENTO=0001
 * DTE_COD_PTO_VENTA=0001
 * DTE_DIRECCION_DEPARTAMENTO=06   → Código departamento (06=San Salvador)
 * DTE_DIRECCION_MUNICIPIO=23      → Código municipio
 * DTE_DIRECCION_COMPLEMENTO=      → Dirección completa
 * DTE_TELEFONO=
 * DTE_CORREO=
 *
 * ── Credenciales API MH ───────────────────────────────────────
 * DTE_MH_USER=               → Usuario MH (para ambiente test/prod)
 * DTE_MH_PASSWORD=           → Contraseña MH
 * DTE_MH_TOKEN=              → Token actual (se renueva automáticamente)
 *
 * ── Firma digital ─────────────────────────────────────────────
 * DTE_SIGNING_URL=           → URL del servicio de firma (MH o propio)
 * DTE_SIGNING_PASSWORD=      → Contraseña del certificado de firma
 */

export type DteMode = 'offline' | 'test' | 'production';

export const DTE_CONFIG = {
  mode: (process.env.DTE_MODE ?? 'offline') as DteMode,

  /* Emisor */
  nit:                  process.env.DTE_NIT                   ?? '',
  nrc:                  process.env.DTE_NRC                   ?? '',
  nombre:               process.env.DTE_NOMBRE                ?? 'Fundación ASISTEDCOS',
  nombreComercial:      process.env.DTE_NOMBRE_COMERCIAL      ?? null,
  codigoActividad:      process.env.DTE_ACTIVIDAD             ?? '84120',
  descActividad:        process.env.DTE_DESC_ACTIVIDAD        ?? 'Actividades de otras organizaciones y asociaciones n.c.p.',
  tipoEstablecimiento:  process.env.DTE_TIPO_ESTABLECIMIENTO  ?? '01',
  codEstablecimiento:   process.env.DTE_COD_ESTABLECIMIENTO   ?? '0001',
  codPtoVenta:          process.env.DTE_COD_PTO_VENTA         ?? '0001',
  telefono:             process.env.DTE_TELEFONO              ?? '',
  correo:               process.env.DTE_CORREO                ?? '',
  direccion: {
    departamento:   process.env.DTE_DIRECCION_DEPARTAMENTO  ?? '06',
    municipio:      process.env.DTE_DIRECCION_MUNICIPIO     ?? '23',
    complemento:    process.env.DTE_DIRECCION_COMPLEMENTO   ?? '',
  },

  /* API MH */
  apiUrl: {
    test:       'https://apitest.dtes.mh.gob.sv',
    production: 'https://api.dtes.mh.gob.sv',
  },
  mhUser:     process.env.DTE_MH_USER       ?? '',
  mhPassword: process.env.DTE_MH_PASSWORD   ?? '',

  /* Firma digital */
  signingUrl:      process.env.DTE_SIGNING_URL      ?? '',
  signingPassword: process.env.DTE_SIGNING_PASSWORD ?? '',
} as const;

/** ¿Está habilitada la conexión real al MH? */
export const DTE_ENABLED =
  DTE_CONFIG.mode !== 'offline' &&
  DTE_CONFIG.mhUser !== '' &&
  DTE_CONFIG.mhPassword !== '';

/** Ambiente MH (00=pruebas, 01=producción) */
export const DTE_AMBIENTE = DTE_CONFIG.mode === 'production' ? '01' : '00';

/** URL base de la API MH según modo */
export const DTE_API_URL = DTE_CONFIG.mode === 'production'
  ? DTE_CONFIG.apiUrl.production
  : DTE_CONFIG.apiUrl.test;
