/**
 * POST /api/donaciones/[id]/certificado
 * Genera un DonationCert para la donación indicada.
 * Si ya existe devuelve el existente.
 *
 * GET /api/donaciones/[id]/certificado
 * Retorna el certificado vinculado a la donación (o 404).
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { ok, apiError } from '@/lib/response';
import { UnauthorizedError, NotFoundError } from '@/lib/errors';

/* ── Helper: siguiente número correlativo CD-YYYY-NNNN ── */
async function nextCertNumber(): Promise<string> {
  const year = new Date().getFullYear();

  const result = await prisma.$transaction(async (tx) => {
    // Usamos el tipo DONACION en la tabla Correlativo
    const corr = await tx.correlativo.upsert({
      where:  { dteType: 'DONACION' },
      create: { dteType: 'DONACION', prefix: 'CD', current: 1 },
      update: { current: { increment: 1 } },
    });
    return corr.current;
  });

  return `CD-${year}-${String(result).padStart(4, '0')}`;
}

/* ── GET ─────────────────────────────────────────────── */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    const { id } = await params;

    const cert = await prisma.donationCert.findUnique({
      where: { donationId: id },
    });
    if (!cert) throw new NotFoundError('Certificado');
    return ok(cert);
  } catch (err) { return apiError(err); }
}

/* ── POST ────────────────────────────────────────────── */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    const { id: donationId } = await params;

    /* 1 — Verificar que la donación existe */
    const donation = await prisma.donation.findUnique({
      where: { id: donationId },
      include: {
        donor:   true,
        project: { select: { id: true, name: true } },
        certificate: true,
      },
    });
    if (!donation) throw new NotFoundError('Donación');

    /* 2 — Si ya tiene certificado, retornarlo */
    if (donation.certificate) {
      return ok(donation.certificate);
    }

    /* 3 — Leer configuración de la organización */
    const configs = await prisma.orgConfig.findMany();
    const cfg = Object.fromEntries(configs.map(c => [c.key, c.value]));

    const orgName       = cfg['org_name']         || 'Fundación ASISTEDCOS';
    const orgNrc        = cfg['org_nrc']           || '';
    const orgNit        = cfg['org_nit']           || '';
    const orgAddress    = cfg['org_address']       || '';
    const authResolution = cfg['cert_resolution']  || cfg['fiscal_resolution'] || null;

    /* 4 — Generar número correlativo */
    const number = await nextCertNumber();

    /* 5 — Descripción de la donación */
    const projectName = donation.project?.name ?? 'Actividades generales de la fundación';
    const description = donation.notes
      ? donation.notes
      : `Donación destinada a: ${projectName}`;

    /* 6 — Crear el certificado */
    const cert = await prisma.donationCert.create({
      data: {
        donationId,
        number,
        status:     'EMITIDO',
        date:       donation.date,

        orgName,
        orgNrc,
        orgNit,
        orgAddress,
        authResolution,

        donorName: donation.donor.name,
        donorNit:  donation.donor.nit  || null,
        donorDui:  donation.donor.dui  || null,

        amount:      donation.amount,
        description,
      },
    });

    return ok(cert);
  } catch (err) { return apiError(err); }
}

/* ── DELETE — anular certificado ────────────────────── */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();
    const { id: donationId } = await params;

    const cert = await prisma.donationCert.findUnique({
      where: { donationId },
    });
    if (!cert) throw new NotFoundError('Certificado');

    const voided = await prisma.donationCert.update({
      where: { id: cert.id },
      data:  { status: 'ANULADO' },
    });
    return ok(voided);
  } catch (err) { return apiError(err); }
}
