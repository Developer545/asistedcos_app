'use client';

/**
 * /certificados/[id]
 * Vista HTML del Comprobante de Donación.
 * Botón "Descargar PDF" = window.print() con CSS @media print.
 */

import React, { useEffect, useState } from 'react';
import { Button, Spin, Alert, Tag } from 'antd';
import { Printer, ArrowLeft, Prohibit, Stamp } from '@phosphor-icons/react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

/* ── Tipos ─────────────────────────────────────────── */
type Cert = {
  id:            string;
  number:        string;
  status:        'BORRADOR' | 'EMITIDO' | 'ANULADO';
  date:          string;
  orgName:       string;
  orgNrc:        string;
  orgNit:        string;
  orgAddress:    string;
  authResolution: string | null;
  donorName:     string;
  donorNit:      string | null;
  donorDui:      string | null;
  amount:        number | string;
  description:   string;
  notes:         string | null;
  donation?: {
    id:            string;
    paymentMethod: string;
    project?:      { name: string } | null;
  };
};

const PAYMENT_LABELS: Record<string, string> = {
  EFECTIVO: 'Efectivo', TRANSFERENCIA: 'Transferencia bancaria',
  CHEQUE: 'Cheque', TARJETA: 'Tarjeta', OTRO: 'Otro',
};

function fmtUSD(n: number | string) {
  return new Intl.NumberFormat('es-SV', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2,
  }).format(Number(n));
}

function numToWords(n: number): string {
  // Simple converter for USD amounts — good enough for certificates
  const ones = ['','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve',
    'diez','once','doce','trece','catorce','quince','dieciséis','diecisiete',
    'dieciocho','diecinueve'];
  const tens = ['','','veinte','treinta','cuarenta','cincuenta','sesenta','setenta','ochenta','noventa'];

  if (n === 0) return 'cero';
  if (n < 0)   return 'menos ' + numToWords(-n);

  let result = '';
  if (n >= 1000) {
    const k = Math.floor(n / 1000);
    result += (k === 1 ? 'mil' : numToWords(k) + ' mil');
    n %= 1000;
    if (n > 0) result += ' ';
  }
  if (n >= 100) {
    const hundreds = ['','cien','doscientos','trescientos','cuatrocientos','quinientos',
      'seiscientos','setecientos','ochocientos','novecientos'];
    const h = Math.floor(n / 100);
    result += (n === 100 ? 'cien' : hundreds[h]);
    n %= 100;
    if (n > 0) result += ' ';
  }
  if (n >= 20) {
    result += tens[Math.floor(n / 10)];
    n %= 10;
    if (n > 0) result += ' y ' + ones[n];
  } else if (n > 0) {
    result += ones[n];
  }
  return result;
}

function amountInWords(amount: number): string {
  const dollars = Math.floor(amount);
  const cents   = Math.round((amount - dollars) * 100);
  const word    = numToWords(dollars).toUpperCase();
  return `${word} ${fmtUSD(dollars).split('$')[1]?.split('.')[0] ?? ''} CON ${String(cents).padStart(2, '0')}/100 DÓLARES`;
}

/* ── Componente ─────────────────────────────────────── */
export default function CertificadoPage() {
  const { id }      = useParams<{ id: string }>();
  const router      = useRouter();
  const [cert, setCert]     = useState<Cert | null>(null);
  const [loading, setLoading] = useState(true);
  const [voiding, setVoiding] = useState(false);

  useEffect(() => {
    fetch(`/api/certificados/${id}`)
      .then(r => r.json())
      .then(d => setCert(d.data))
      .catch(() => toast.error('Error cargando certificado'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleVoid() {
    if (!cert) return;
    setVoiding(true);
    try {
      const r = await fetch(`/api/certificados/${cert.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ANULADO' }),
      });
      if (!r.ok) throw new Error();
      toast.success('Certificado anulado');
      setCert(prev => prev ? { ...prev, status: 'ANULADO' } : prev);
    } catch { toast.error('Error anulando certificado'); }
    finally { setVoiding(false); }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <Spin size="large" />
    </div>
  );

  if (!cert) return (
    <Alert type="error" message="Certificado no encontrado" style={{ margin: 40 }} />
  );

  const issuedDate = new Date(cert.date);
  const dateStr    = issuedDate.toLocaleDateString('es-SV', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const amount = Number(cert.amount);

  return (
    <>
      {/* ── Barra de acciones (no se imprime) ─────── */}
      <div className="no-print" style={{
        display: 'flex', gap: 12, alignItems: 'center',
        padding: '16px 32px',
        background: 'hsl(var(--bg-surface))',
        borderBottom: '1px solid hsl(var(--border-default))',
        marginBottom: 32,
      }}>
        <Button icon={<ArrowLeft size={15} />} onClick={() => router.back()}>
          Volver
        </Button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          {cert.status === 'ANULADO' && (
            <Tag color="error" style={{ fontSize: 13, padding: '4px 12px' }}>ANULADO</Tag>
          )}
          {cert.status === 'EMITIDO' && (
            <Tag color="success" style={{ fontSize: 13, padding: '4px 12px' }}>EMITIDO</Tag>
          )}

          {cert.status === 'EMITIDO' && (
            <Button
              danger
              icon={<Prohibit size={15} />}
              loading={voiding}
              onClick={handleVoid}
            >
              Anular
            </Button>
          )}

          <Button
            type="primary"
            icon={<Printer size={15} />}
            onClick={() => window.print()}
            disabled={cert.status === 'ANULADO'}
          >
            Descargar / Imprimir PDF
          </Button>
        </div>
      </div>

      {/* ── Documento (se imprime) ─────────────────── */}
      <div className="cert-wrapper" style={{
        maxWidth: 800,
        margin: '0 auto 60px',
        padding: '0 24px',
        fontFamily: '"Times New Roman", Times, serif',
      }}>
        <div className="cert-document" style={{
          background: '#fff',
          border: '2px solid #1a5c2e',
          borderRadius: 4,
          padding: '48px 60px',
          position: 'relative',
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
        }}>

          {/* Marca de agua ANULADO */}
          {cert.status === 'ANULADO' && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              zIndex: 10, pointerEvents: 'none',
              transform: 'rotate(-30deg)',
            }}>
              <span style={{
                fontSize: 120, fontWeight: 900, color: 'rgba(200,0,0,0.12)',
                letterSpacing: 8, textTransform: 'uppercase', userSelect: 'none',
              }}>
                ANULADO
              </span>
            </div>
          )}

          {/* ─── Encabezado ─────────────────────── */}
          <div style={{ textAlign: 'center', borderBottom: '3px double #1a5c2e', paddingBottom: 24, marginBottom: 28 }}>
            {/* Logo / nombre organización */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 12,
            }}>
              <Stamp size={36} color="#1a5c2e" weight="duotone" />
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#1a5c2e', letterSpacing: 1 }}>
                  {cert.orgName}
                </div>
                <div style={{ fontSize: 12, color: '#555', letterSpacing: 0.5 }}>
                  NIT: {cert.orgNit || '—'} &nbsp;|&nbsp; NRC: {cert.orgNrc || '—'}
                </div>
              </div>
            </div>

            <div style={{
              fontSize: 22, fontWeight: 900, color: '#1a5c2e',
              textTransform: 'uppercase', letterSpacing: 3, marginBottom: 6,
            }}>
              Comprobante de Donación
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 32, fontSize: 13 }}>
              <span><strong>N°:</strong> {cert.number}</span>
              <span><strong>Fecha:</strong> {dateStr}</span>
              {cert.authResolution && (
                <span><strong>Autorización:</strong> {cert.authResolution}</span>
              )}
            </div>
          </div>

          {/* ─── Cuerpo ─────────────────────────── */}

          {/* Datos del donante */}
          <section style={{ marginBottom: 24 }}>
            <div style={{
              background: '#f0f7f2', border: '1px solid #c3dece',
              borderRadius: 4, padding: '12px 18px', marginBottom: 4,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#1a5c2e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Datos del Donante
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <tbody>
                  <tr>
                    <td style={{ width: '30%', color: '#555', paddingBottom: 4 }}>Nombre completo:</td>
                    <td style={{ fontWeight: 700 }}>{cert.donorName}</td>
                  </tr>
                  {cert.donorNit && (
                    <tr>
                      <td style={{ color: '#555', paddingBottom: 4 }}>NIT:</td>
                      <td>{cert.donorNit}</td>
                    </tr>
                  )}
                  {cert.donorDui && (
                    <tr>
                      <td style={{ color: '#555', paddingBottom: 4 }}>DUI:</td>
                      <td>{cert.donorDui}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Datos de la donación */}
          <section style={{ marginBottom: 24 }}>
            <div style={{
              border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#1a5c2e', color: '#fff' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Descripción
                    </th>
                    <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, width: 160 }}>
                      Monto (USD)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '14px 16px', lineHeight: 1.5 }}>
                      {cert.description}
                      {cert.donation?.project && (
                        <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                          Proyecto: {cert.donation.project.name}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, fontSize: 16 }}>
                      {fmtUSD(amount)}
                    </td>
                  </tr>
                  <tr style={{ background: '#f9fafb' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 700, fontSize: 13, textAlign: 'right', color: '#333' }}>
                      TOTAL DONADO:
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 900, fontSize: 18, color: '#1a5c2e' }}>
                      {fmtUSD(amount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Monto en letras */}
            <div style={{
              marginTop: 8, padding: '8px 16px',
              background: '#fffbeb', border: '1px solid #fde68a',
              borderRadius: 4, fontSize: 13,
            }}>
              <strong>Son:</strong> {amountInWords(amount)}
            </div>
          </section>

          {/* Forma de pago */}
          {cert.donation?.paymentMethod && (
            <section style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 14 }}>
                <strong>Forma de pago:</strong>&nbsp;
                {PAYMENT_LABELS[cert.donation.paymentMethod] ?? cert.donation.paymentMethod}
              </div>
            </section>
          )}

          {/* Texto legal */}
          <section style={{
            marginBottom: 32, padding: '12px 16px',
            background: '#f9fafb', border: '1px solid #e5e7eb',
            borderRadius: 4, fontSize: 12, color: '#555', lineHeight: 1.6,
          }}>
            La presente donación ha sido recibida por <strong>{cert.orgName}</strong>,
            organización sin fines de lucro legalmente constituida conforme a las leyes de
            la República de El Salvador. Este comprobante podrá ser utilizado como respaldo
            para fines fiscales de conformidad con lo establecido en el Código Tributario
            y la Ley de Impuesto Sobre la Renta vigentes.
            {cert.authResolution && (
              <> Autorizado mediante resolución N° <strong>{cert.authResolution}</strong>.</>
            )}
          </section>

          {/* Firmas */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 40, marginTop: 8,
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                borderTop: '1.5px solid #333', paddingTop: 8, marginTop: 48,
                fontSize: 13,
              }}>
                <div style={{ fontWeight: 700 }}>Representante Legal</div>
                <div style={{ color: '#555', fontSize: 12 }}>{cert.orgName}</div>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                borderTop: '1.5px solid #333', paddingTop: 8, marginTop: 48,
                fontSize: 13,
              }}>
                <div style={{ fontWeight: 700 }}>Donante</div>
                <div style={{ color: '#555', fontSize: 12 }}>{cert.donorName}</div>
              </div>
            </div>
          </div>

          {/* Pie */}
          <div style={{
            marginTop: 32, paddingTop: 16,
            borderTop: '2px solid #1a5c2e',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: 11, color: '#666',
          }}>
            <span>{cert.orgAddress}</span>
            <span style={{ fontWeight: 700, color: '#1a5c2e' }}>{cert.number}</span>
          </div>
        </div>
      </div>

      {/* ── CSS de impresión ────────────────────────── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }

          body { margin: 0; background: #fff !important; }

          .cert-wrapper {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .cert-document {
            border: 2px solid #1a5c2e !important;
            box-shadow: none !important;
            page-break-inside: avoid;
          }

          @page {
            size: A4;
            margin: 15mm 15mm 20mm 15mm;
          }
        }
      `}</style>
    </>
  );
}
