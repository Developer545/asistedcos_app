/**
 * Tipos TypeScript para DTEs El Salvador — MH API v3
 * Basado en catálogos y esquemas oficiales de factura.gob.sv
 */

/* ── Catálogos ──────────────────────────────────────────── */

/** CAT_002 — Tipo de Documento */
export const DTE_TIPO: Record<string, string> = {
  FACTURA:      '01',
  CCF:          '03',
  NOTA_REMISION:'04',
  NOTA_CREDITO: '05',
  NOTA_DEBITO:  '06',
  RETENCION:    '07',
  LIQUIDACION:  '08',
  DOC_CONTABLE: '09',
  FAC_EXPORTACION: '11',
  FAC_SUJETO_EXCLUIDO: '14',
  DONACION:     '15',
};

/** CAT_017 — Tipo de Item */
export const TIPO_ITEM = {
  BIEN:     1,
  SERVICIO: 2,
  AMBOS:    3,
  OTRO:     4,
} as const;

/** CAT_042 — Tipo Documento de identificación receptor */
export const TIPO_DOC_RECEPTOR = {
  NIT:        '36',
  DUI:        '13',
  PASAPORTE:  '03',
  OTRO:       '37',
  EXTRANJERO: '02',
} as const;

/** CAT_026 — Código forma de pago */
export const COD_PAGO: Record<string, string> = {
  EFECTIVO:       '01',
  TARJETA:        '02',
  TRANSFERENCIA:  '04',
  CHEQUE:         '05',
  OTRO:           '99',
};

/* ── Interfaces DTE ─────────────────────────────────────── */

export interface DteIdentificacion {
  version:           number;        // 3
  ambiente:          string;        // "00" | "01"
  tipoDte:           string;        // "01", "03", "15", etc.
  numeroControl:     string;        // DTE-XX-XXXXXXXXXX-XXXXXXXXXXXXXXX
  codigoGeneracion:  string;        // UUID v4
  tipoModelo:        number;        // 1=previo, 2=diferido
  tipoOperacion:     number;        // 1=normal, 2=contingencia
  tipoContingencia:  null;
  motivoConting:     null;
  fecEmi:            string;        // "YYYY-MM-DD"
  horEmi:            string;        // "HH:mm:ss"
  tipoMoneda:        string;        // "USD"
}

export interface DteDireccion {
  departamento: string;
  municipio:    string;
  complemento:  string;
}

export interface DteEmisor {
  nit:                 string;
  nrc:                 string;
  nombre:              string;
  codActividad:        string;
  descActividad:       string;
  nombreComercial:     string | null;
  tipoEstablecimiento: string;
  direccion:           DteDireccion;
  telefono:            string;
  correo:              string;
  codEstableMH?:       string;
  codEstable?:         string;
  codPuntoVentaMH?:    string;
  codPuntoVenta?:      string;
}

export interface DteReceptor {
  tipoDocumento:  string | null;
  numDocumento:   string | null;
  nrc:            string | null;
  nombre:         string;
  codActividad:   string | null;
  descActividad:  string | null;
  direccion:      DteDireccion | null;
  telefono:       string | null;
  correo:         string | null;
}

export interface DteItemCuerpo {
  numItem:         number;
  tipoItem:        number;
  numeroDocumento: null;
  codigo:          null;
  codTributo:      null;
  descripcion:     string;
  cantidad:        number;
  uniMedida:       number;  // 99 = "Otro"
  precioUni:       number;
  montoDescu:      number;
  ventaNoSuj:      number;
  ventaExenta:     number;
  ventaGravada:    number;
  tributos:        null;
  psv:             number;
  noGravado:       number;
  ivaItem?:        number;  // Solo en CCF
}

export interface DtePago {
  codigo:      string;
  montoPago:   number;
  referencia:  null;
  plazo:       null;
  periodo:     null;
}

export interface DteResumen {
  totalNoSuj:           number;
  totalExenta:          number;
  totalGravada:         number;
  subTotalVentas:       number;
  descuNoSuj:           number;
  descuExenta:          number;
  descuGravada:         number;
  porcentajeDescuento:  number;
  totalDescu:           number;
  tributos:             null;
  subTotal:             number;
  ivaRete1:             number;
  reteRenta:            number;
  montoTotalOperacion:  number;
  totalNoGravado:       number;
  totalPagar:           number;
  totalLetras:          string;
  totalIva:             number;
  saldoFavor:           number;
  condicionOperacion:   number;  // 1=contado, 2=crédito
  pagos:                DtePago[];
  numPagoElectronico:   null;
}

export interface DteJson {
  identificacion:    DteIdentificacion;
  documentoRelacionado: null;
  emisor:            DteEmisor;
  receptor:          DteReceptor;
  otrosDocumentos:   null;
  ventaTercero:      null;
  cuerpoDocumento:   DteItemCuerpo[];
  resumen:           DteResumen;
  extension:         null;
  apendice:          null;
}

/* ── Respuesta del MH ───────────────────────────────────── */
export interface MhAuthResponse {
  status:  string;
  body:    { token: string };
}

export interface MhReceiveResponse {
  version:         number;
  ambiente:        string;
  versionApp:      number;
  estado:          string;  // "RECIBIDO" | "RECHAZADO" | "PROCESADO"
  codigoGeneracion: string;
  selloRecibido:   string | null;
  fhProcesamiento: string;
  clasificaMsg:    string;
  codigoMsg:       string;
  descripcionMsg:  string;
  observaciones:   string[];
}
