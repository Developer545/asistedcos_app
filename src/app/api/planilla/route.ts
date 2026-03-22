import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, created, apiError, paginate, parsePagination } from '@/lib/response';
import { getCurrentUser } from '@/lib/auth';
import { calcularDetalle } from '@/lib/planilla';

export async function GET(req: NextRequest) {
  try {
    await getCurrentUser();
    const { page, limit, skip } = parsePagination(req);
    const [data, total] = await prisma.$transaction([
      prisma.payroll.findMany({
        skip, take: limit,
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        include: { details: true },
      }),
      prisma.payroll.count(),
    ]);
    return paginate(data, total, page, limit);
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    await getCurrentUser();
    const body = await req.json();
    const { month, year, employees } = body;

    if (!month || !year)      return apiError('Mes y año requeridos', 400);
    if (!employees?.length)   return apiError('Debe incluir al menos un empleado', 400);

    // Verificar que no existe planilla para ese mes/año
    const exists = await prisma.payroll.findUnique({ where: { month_year: { month, year } } });
    if (exists) return apiError(`Ya existe una planilla para ${month}/${year}`, 409);

    // Calcular cada línea
    const details = employees.map((e: {
      employeeName: string; position: string;
      grossSalary: number; otherDeductions?: number;
    }) => calcularDetalle(e.employeeName, e.position, e.grossSalary, e.otherDeductions));

    const totalGross = details.reduce((s: number, d: { grossSalary: number }) => s + d.grossSalary, 0);
    const totalNet   = details.reduce((s: number, d: { netSalary: number }) => s + d.netSalary, 0);

    const payroll = await prisma.payroll.create({
      data: {
        month,
        year,
        totalGross,
        totalNet,
        details: { create: details },
      },
      include: { details: true },
    });

    return created(payroll);
  } catch (e) { return apiError(e); }
}
