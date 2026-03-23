/**
 * GET /api/certificados/[id]   — retorna el cert como JSON
 * PUT /api/certificados/[id]   — anular (solo cambio de status)
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError, NotFoundError } from '@/lib/errors';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    const { id } = await params;

    const cert = await prisma.donationCert.findUnique({
      where: { id },
      include: {
        donation: {
          select: {
            id: true,
            paymentMethod: true,
            project: { select: { name: true } },
          },
        },
      },
    });
    if (!cert) throw new NotFoundError('Certificado');
    return ok(cert);
  } catch (err) { return apiError(err); }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    const { id } = await params;
    const { status } = await req.json();

    const allowed = ['EMITIDO', 'ANULADO'];
    if (!allowed.includes(status)) {
      return apiError('Estado inválido', 400);
    }

    const cert = await prisma.donationCert.update({
      where: { id },
      data:  { status },
    });
    return ok(cert);
  } catch (err) { return apiError(err); }
}
