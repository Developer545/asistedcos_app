export function sanitizeString(value: unknown, maxLength = 500): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

export function requireString(value: unknown, fieldName: string, maxLength = 500): string {
  const s = sanitizeString(value, maxLength);
  if (!s) throw new Error(`El campo '${fieldName}' es requerido`);
  return s;
}

export function sanitizeNumber(value: unknown, defaultValue = 0): number {
  const n = Number(value);
  return isNaN(n) || !isFinite(n) ? defaultValue : n;
}
