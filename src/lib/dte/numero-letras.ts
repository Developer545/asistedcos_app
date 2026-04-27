/**
 * Convierte un monto numérico a letras (USD) para el campo totalLetras del DTE
 * Ej: 150.75 → "CIENTO CINCUENTA 75/100 DÓLARES"
 */

const UNIDADES = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
  'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE',
  'VEINTE', 'VEINTIUNO', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE',
];

const DECENAS = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];

const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS',
  'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function cientos(n: number): string {
  if (n === 100) return 'CIEN';
  if (n === 0)   return '';
  const c = Math.floor(n / 100);
  const r = n % 100;
  const centena = CENTENAS[c] ?? '';
  if (r === 0) return centena;
  if (r < 30) return `${centena} ${UNIDADES[r]}`.trim();
  const decena = DECENAS[Math.floor(r / 10)] ?? '';
  const unidad = r % 10 ? UNIDADES[r % 10] : '';
  const dec = unidad ? `${decena} Y ${unidad}` : decena;
  return `${centena} ${dec}`.trim();
}

function miles(n: number): string {
  const m = Math.floor(n / 1000);
  const r = n % 1000;
  const mStr = m === 1 ? 'MIL' : m > 1 ? `${cientos(m)} MIL` : '';
  const rStr = cientos(r);
  return `${mStr} ${rStr}`.trim();
}

function millones(n: number): string {
  const m = Math.floor(n / 1_000_000);
  const r = n % 1_000_000;
  const mStr = m === 1 ? 'UN MILLÓN' : m > 1 ? `${cientos(m)} MILLONES` : '';
  const rStr = miles(r);
  return `${mStr} ${rStr}`.trim();
}

export function numeroALetras(monto: number): string {
  if (isNaN(monto) || monto < 0) return 'CERO DÓLARES';
  const parteEntera   = Math.floor(monto);
  const parteCentavos = Math.round((monto - parteEntera) * 100);
  const letras        = parteEntera === 0 ? 'CERO' : millones(parteEntera);
  const centavos      = String(parteCentavos).padStart(2, '0');
  return `${letras} ${centavos}/100 DÓLARES`.trim();
}
