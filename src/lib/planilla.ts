/**
 * Cálculos de Planilla — El Salvador 2024
 * Fuente: Ley del ISSS, Ley SAP, Ley de Impuesto sobre la Renta (Art. 37)
 */

/* ─── Tasas vigentes ─────────────────────────────────────────────────────── */
export const RATES = {
  isss_employee:  0.03,   // 3% (tope salario $1,000/mes → máx $30)
  isss_employer:  0.075,  // 7.5%
  isss_salary_cap: 1000,  // Tope de cotización ISSS
  afp_employee:   0.0725, // 7.25%
  afp_employer:   0.0775, // 7.75%
} as const;

/* ─── Tabla ISR mensual (Art. 37 Ley de Renta) ───────────────────────────── */
// Tramos ANUALES → convertir salario mensual a anual para calcular
const ISR_TRAMOS = [
  { desde: 0,         hasta: 4064.00,   cuota: 0,       tasa: 0,    exceso: 0       },
  { desde: 4064.01,   hasta: 9142.86,   cuota: 0,       tasa: 0.10, exceso: 4064.00  },
  { desde: 9142.87,   hasta: 22857.14,  cuota: 508.00,  tasa: 0.20, exceso: 9142.86  },
  { desde: 22857.15,  hasta: Infinity,  cuota: 3051.00, tasa: 0.30, exceso: 22857.14 },
];

/** Calcula el ISR mensual sobre el salario bruto mensual */
export function calcularRenta(salarioBrutoMensual: number): number {
  // Base imponible = bruto − ISSS empleado − AFP empleado
  const isssEmp = Math.min(salarioBrutoMensual, RATES.isss_salary_cap) * RATES.isss_employee;
  const afpEmp  = salarioBrutoMensual * RATES.afp_employee;
  const baseImponible = salarioBrutoMensual - isssEmp - afpEmp;

  // Anualizar
  const baseAnual = baseImponible * 12;

  const tramo = ISR_TRAMOS.findLast(t => baseAnual >= t.desde) ?? ISR_TRAMOS[0];
  const isrAnual = tramo.cuota + (baseAnual - tramo.exceso) * tramo.tasa;
  return Math.max(0, isrAnual / 12); // mensualizar
}

export interface DetallePlanilla {
  employeeName:    string;
  position:        string;
  grossSalary:     number;
  isssEmployee:    number;
  afpEmployee:     number;
  rentaRetention:  number;
  otherDeductions: number;
  netSalary:       number;
  isssEmployer:    number;
  afpEmployer:     number;
  totalCost:       number;
}

/** Calcula todos los valores para una línea de planilla */
export function calcularDetalle(
  employeeName: string,
  position: string,
  grossSalary: number,
  otherDeductions = 0,
): DetallePlanilla {
  const gross = Number(grossSalary);

  const isssEmployee  = Math.min(gross, RATES.isss_salary_cap) * RATES.isss_employee;
  const afpEmployee   = gross * RATES.afp_employee;
  const renta         = calcularRenta(gross);
  const netSalary     = gross - isssEmployee - afpEmployee - renta - Number(otherDeductions);

  const isssEmployer  = Math.min(gross, RATES.isss_salary_cap) * RATES.isss_employer;
  const afpEmployer   = gross * RATES.afp_employer;
  const totalCost     = gross + isssEmployer + afpEmployer;

  const round = (n: number) => Math.round(n * 100) / 100;

  return {
    employeeName,
    position,
    grossSalary:    round(gross),
    isssEmployee:   round(isssEmployee),
    afpEmployee:    round(afpEmployee),
    rentaRetention: round(renta),
    otherDeductions: round(Number(otherDeductions)),
    netSalary:      round(netSalary),
    isssEmployer:   round(isssEmployer),
    afpEmployer:    round(afpEmployer),
    totalCost:      round(totalCost),
  };
}
