import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError } from '@/lib/errors';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const now     = new Date();
    const y       = now.getFullYear();
    const m       = now.getMonth();
    const monthStart = new Date(y, m, 1);
    const yearStart  = new Date(y, 0, 1);

    const [
      totalDonors,
      totalDonationsYear,
      totalProjects,
      activeProjects,
      totalBeneficiaries,
      activeBeneficiaries,
      totalVolunteers,
      expensesMonth,
      pendingExpenses,
    ] = await Promise.all([
      prisma.donor.count(),
      prisma.donation.aggregate({
        _sum: { amount: true },
        where: { date: { gte: yearStart } },
      }),
      prisma.project.count(),
      prisma.project.count({ where: { active: true } }),
      prisma.beneficiary.count(),
      prisma.beneficiary.count({ where: { status: 'ACTIVO' } }),
      prisma.volunteer.count({ where: { status: 'ACTIVO' } }),
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: { date: { gte: monthStart }, status: { in: ['APROBADO', 'PAGADO'] } },
      }),
      prisma.expense.count({ where: { status: 'PENDIENTE' } }),
    ]);

    return NextResponse.json(ok({
      donors:          totalDonors,
      donationsYear:   Number(totalDonationsYear._sum.amount ?? 0),
      projects:        totalProjects,
      activeProjects,
      beneficiaries:   totalBeneficiaries,
      activeBeneficiaries,
      volunteers:      totalVolunteers,
      expensesMonth:   Number(expensesMonth._sum.amount ?? 0),
      pendingExpenses,
    }));

  } catch (err) {
    return apiError(err);
  }
}
