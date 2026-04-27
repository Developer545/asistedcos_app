/**
 * Generación de identificadores DTE según especificación MH El Salvador
 */
import { DTE_CONFIG, DTE_AMBIENTE } from './config';
import { DTE_TIPO } from './types';
import type { DteIdentificacion } from './types';

/** Genera un UUID v4 para codigoGeneracion */
export function generarCodigoGeneracion(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16).toUpperCase();
  });
}

/**
 * Genera el numeroControl con formato MH:
 * DTE-{tipoDte}-{codEstable}{codPtoVenta}-{secuencial15}
 * Ej: DTE-01-00010001-000000000000001
 */
export function generarNumeroControl(dteType: string, secuencial: number): string {
  const tipoCod = DTE_TIPO[dteType] ?? '01';
  const estab   = DTE_CONFIG.codEstablecimiento.padStart(4, '0');
  const pto     = DTE_CONFIG.codPtoVenta.padStart(4, '0');
  const seq     = String(secuencial).padStart(15, '0');
  return `DTE-${tipoCod}-${estab}${pto}-${seq}`;
}

/** Formatea fecha y hora para DTE */
export function formatearFechaHora(fecha: Date): { fecEmi: string; horEmi: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    fecEmi: `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`,
    horEmi: `${pad(fecha.getHours())}:${pad(fecha.getMinutes())}:${pad(fecha.getSeconds())}`,
  };
}

/** Construye la sección identificacion del DTE */
export function buildIdentificacion(
  dteType: string,
  secuencial: number,
  fecha: Date,
): DteIdentificacion {
  const { fecEmi, horEmi } = formatearFechaHora(fecha);
  return {
    version:          3,
    ambiente:         DTE_AMBIENTE,
    tipoDte:          DTE_TIPO[dteType] ?? '01',
    numeroControl:    generarNumeroControl(dteType, secuencial),
    codigoGeneracion: generarCodigoGeneracion(),
    tipoModelo:       1,
    tipoOperacion:    1,
    tipoContingencia: null,
    motivoConting:    null,
    fecEmi,
    horEmi,
    tipoMoneda:       'USD',
  };
}
