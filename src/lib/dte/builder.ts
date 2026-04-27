/**
 * Constructor de JSON DTE — El Salvador
 * Soporta tipos: 01 (Factura), 03 (CCF), 05 (Nota Crédito),
 *                06 (Nota Débito), 07 (Retención), 15 (Donación)
 */
import { DTE_CONFIG } from './config';
import { buildIdentificacion } from './numeracion';
import { COD_PAGO, TIPO_DOC_RECEPTOR, TIPO_ITEM } from './types';
import type {
  DteJson, DteEmisor, DteReceptor, DteItemCuerpo, DteResumen, DtePago,
} from './types';
import { numeroALetras } from './numero-letras';

/* ── Datos de entrada ───────────────────────────────────── */
export interface DteInvoiceInput {
  dteType:        string;
  secuencial:     number;
  fecha:          Date;
  receiverName:   string;
  receiverNrc?:   string | null;
  receiverNit?:   string | null;
  receiverDui?:   string | null;
  receiverAddress?: string | null;
  subtotal:       number;
  ivaAmount:      number;
  total:          number;
  paymentMethod:  string;
  details: Array<{
    description: string;
    quantity:    number;
    unitPrice:   number;
    subtotal:    number;
    taxable?:    boolean;
  }>;
}

/* ── Emisor (de la configuración) ──────────────────────── */
function buildEmisor(): DteEmisor {
  return {
    nit:                 DTE_CONFIG.nit,
    nrc:                 DTE_CONFIG.nrc,
    nombre:              DTE_CONFIG.nombre,
    codActividad:        DTE_CONFIG.codigoActividad,
    descActividad:       DTE_CONFIG.descActividad,
    nombreComercial:     DTE_CONFIG.nombreComercial,
    tipoEstablecimiento: DTE_CONFIG.tipoEstablecimiento,
    direccion: {
      departamento: DTE_CONFIG.direccion.departamento,
      municipio:    DTE_CONFIG.direccion.municipio,
      complemento:  DTE_CONFIG.direccion.complemento,
    },
    telefono:        DTE_CONFIG.telefono,
    correo:          DTE_CONFIG.correo,
    codEstableMH:    DTE_CONFIG.codEstablecimiento,
    codEstable:      DTE_CONFIG.codEstablecimiento,
    codPuntoVentaMH: DTE_CONFIG.codPtoVenta,
    codPuntoVenta:   DTE_CONFIG.codPtoVenta,
  };
}

/* ── Receptor ───────────────────────────────────────────── */
function buildReceptor(inv: DteInvoiceInput): DteReceptor {
  // Determinar tipo de documento del receptor
  let tipoDoc: string | null = null;
  let numDoc:  string | null = null;

  if (inv.receiverNit) {
    tipoDoc = TIPO_DOC_RECEPTOR.NIT;
    numDoc  = inv.receiverNit.replace(/[^0-9]/g, '');
  } else if (inv.receiverDui) {
    tipoDoc = TIPO_DOC_RECEPTOR.DUI;
    numDoc  = inv.receiverDui.replace(/[^0-9]/g, '');
  }

  return {
    tipoDocumento: tipoDoc,
    numDocumento:  numDoc,
    nrc:           inv.receiverNrc ?? null,
    nombre:        inv.receiverName,
    codActividad:  null,
    descActividad: null,
    direccion:     inv.receiverAddress
      ? { departamento: '06', municipio: '23', complemento: inv.receiverAddress }
      : null,
    telefono: null,
    correo:   null,
  };
}

/* ── Cuerpo del documento ───────────────────────────────── */
function buildCuerpo(inv: DteInvoiceInput): DteItemCuerpo[] {
  const esCCF      = inv.dteType === 'CCF';
  const esDonacion = inv.dteType === 'DONACION';

  return inv.details.map((d, i) => {
    const subtotalItem = Number(d.quantity) * Number(d.unitPrice);
    const taxable      = d.taxable !== false && !esDonacion;
    const ivaItem      = esCCF && taxable ? subtotalItem * 0.13 : 0;

    return {
      numItem:          i + 1,
      tipoItem:         TIPO_ITEM.SERVICIO,
      numeroDocumento:  null,
      codigo:           null,
      codTributo:       null,
      descripcion:      d.description,
      cantidad:         Number(d.quantity),
      uniMedida:        99,
      precioUni:        Number(d.unitPrice),
      montoDescu:       0,
      ventaNoSuj:       0,
      ventaExenta:      esDonacion ? subtotalItem : (!taxable ? subtotalItem : 0),
      ventaGravada:     esDonacion ? 0 : (taxable ? subtotalItem : 0),
      tributos:         null,
      psv:              0,
      noGravado:        0,
      ...(esCCF ? { ivaItem } : {}),
    };
  });
}

/* ── Resumen ────────────────────────────────────────────── */
function buildResumen(inv: DteInvoiceInput): DteResumen {
  const esDonacion      = inv.dteType === 'DONACION';
  const totalExenta     = esDonacion ? inv.total : 0;
  const totalGravada    = esDonacion ? 0 : inv.subtotal;
  const codPago         = COD_PAGO[inv.paymentMethod] ?? COD_PAGO.OTRO;

  const pagos: DtePago[] = [{
    codigo:     codPago,
    montoPago:  inv.total,
    referencia: null,
    plazo:      null,
    periodo:    null,
  }];

  return {
    totalNoSuj:           0,
    totalExenta,
    totalGravada,
    subTotalVentas:       inv.subtotal,
    descuNoSuj:           0,
    descuExenta:          0,
    descuGravada:         0,
    porcentajeDescuento:  0,
    totalDescu:           0,
    tributos:             null,
    subTotal:             inv.subtotal,
    ivaRete1:             0,
    reteRenta:            0,
    montoTotalOperacion:  inv.total,
    totalNoGravado:       0,
    totalPagar:           inv.total,
    totalLetras:          numeroALetras(inv.total),
    totalIva:             inv.ivaAmount,
    saldoFavor:           0,
    condicionOperacion:   1,
    pagos,
    numPagoElectronico:   null,
  };
}

/* ── Builder principal ──────────────────────────────────── */
export function buildDteJson(inv: DteInvoiceInput): DteJson {
  return {
    identificacion:    buildIdentificacion(inv.dteType, inv.secuencial, inv.fecha),
    documentoRelacionado: null,
    emisor:            buildEmisor(),
    receptor:          buildReceptor(inv),
    otrosDocumentos:   null,
    ventaTercero:      null,
    cuerpoDocumento:   buildCuerpo(inv),
    resumen:           buildResumen(inv),
    extension:         null,
    apendice:          null,
  };
}
