/**
 * Auto-alertas AML — Decreto 426 El Salvador (oct 2025)
 * Se ejecutan de forma fire-and-forget tras operaciones críticas.
 */
import { prisma } from '@/lib/prisma';

/**
 * Disparar alertas AML tras una donación.
 * 1. Efectivo >= $10,000 → EFECTIVO_ALTO
 * 2. Donante sin debida diligencia → DONANTE_SIN_DD (si no existe alerta pendiente)
 */
export function triggerAmlDonacion(donationId: string) {
  void (async () => {
    try {
      const don = await prisma.donation.findUnique({
        where: { id: donationId },
        select: { id: true, donorId: true, amount: true, paymentMethod: true, donor: { select: { name: true } } },
      });
      if (!don) return;

      const alertas: {
        tipo: 'EFECTIVO_ALTO' | 'DONANTE_SIN_DD';
        donorId: string;
        donationId: string;
        descripcion: string;
        montoInvolucrado?: number;
      }[] = [];

      // Alerta 1: efectivo >= $10,000
      if (don.paymentMethod === 'EFECTIVO' && Number(don.amount) >= 10000) {
        alertas.push({
          tipo:             'EFECTIVO_ALTO',
          donorId:          don.donorId,
          donationId:       don.id,
          descripcion:      `Donación en efectivo de $${Number(don.amount).toFixed(2)} recibida de "${don.donor.name}". Supera el umbral de $10,000 requerido por Decreto 426.`,
          montoInvolucrado: Number(don.amount),
        });
      }

      // Alerta 2: donante sin diligencia aprobada
      const diligencia = await prisma.donorDiligencia.findUnique({
        where:  { donorId: don.donorId },
        select: { estado: true },
      });
      const sinDD = !diligencia || diligencia.estado !== 'APROBADA';

      if (sinDD) {
        // Solo crear si no hay ya una alerta PENDIENTE para este donante
        const yaExiste = await prisma.amlAlerta.findFirst({
          where: { donorId: don.donorId, tipo: 'DONANTE_SIN_DD', estado: 'PENDIENTE' },
        });
        if (!yaExiste) {
          alertas.push({
            tipo:        'DONANTE_SIN_DD',
            donorId:     don.donorId,
            donationId:  don.id,
            descripcion: `El donante "${don.donor.name}" no tiene debida diligencia ${diligencia ? 'aprobada' : 'registrada'}. Requerido por KYD (Decreto 426).`,
          });
        }
      }

      if (alertas.length > 0) {
        await prisma.amlAlerta.createMany({ data: alertas });
      }
    } catch (err) {
      console.error('[AML] Error generando alertas:', err);
    }
  })();
}
