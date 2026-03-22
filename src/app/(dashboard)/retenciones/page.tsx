'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, InputNumber, Select,
  Space, Tag, Popconfirm, DatePicker, Row, Col, Alert, Statistic, Card,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { FileMinus, Eye, Trash, Printer } from '@phosphor-icons/react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import PageHeader from '@/components/shared/PageHeader';

type Retention = {
  id: string; number: string; status: string; date: string;
  agentName: string; agentNrc: string; agentNit: string;
  subjectName: string; subjectNit?: string; subjectDui?: string;
  serviceDesc: string; grossAmount: number; retentionRate: number;
  retentionAmount: number; ivaRetained: number; notes?: string;
};

const STATUS_COLOR: Record<string, string> = {
  BORRADOR: 'default', EMITIDO: 'success', ANULADO: 'error',
};

// Tasas de retención El Salvador
const RETENTION_RATES = [
  { value: 0.10,   label: '10% — ISR Servicios (Art. 156 LR)' },
  { value: 0.10,   label: '10% — Honorarios profesionales' },
  { value: 0.05,   label: '5% — Transporte de carga' },
  { value: 0.02,   label: '2% — Servicios de vigilancia' },
  { value: 0.13,   label: '13% — Retención IVA' },
];

function fmtUSD(n: number) {
  return new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(Number(n));
}

export default function RetencionesPage() {
  const [data, setData]       = useState<Retention[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal]     = useState(false);
  const [viewDoc, setView]    = useState<Retention | null>(null);
  const [saving, setSaving]   = useState(false);
  const [form]                = Form.useForm();

  /* Cálculo en tiempo real */
  const [grossAmt, setGrossAmt]   = useState(0);
  const [rate, setRate]           = useState(0.10);
  const retention = Math.round(grossAmt * rate * 100) / 100;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/retenciones?limit=100');
      const d = await r.json();
      setData(d.data ?? []);
    } catch { toast.error('Error cargando retenciones'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    form.resetFields();
    form.setFieldsValue({ date: dayjs(), retentionRate: 0.10 });
    setGrossAmt(0);
    setRate(0.10);
    setModal(true);
  }

  async function onSave(values: Record<string, unknown>) {
    setSaving(true);
    try {
      const payload = {
        ...values,
        date:          values.date ? (values.date as dayjs.Dayjs).toISOString() : undefined,
        grossAmount:   grossAmt,
        retentionRate: rate,
      };
      const res = await fetch('/api/retenciones', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Retención registrada');
      setModal(false);
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  }

  async function changeStatus(id: string, status: string) {
    try {
      await fetch(`/api/retenciones/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      });
      toast.success(`Estado: ${status}`);
      load();
      if (viewDoc?.id === id) setView(v => v ? { ...v, status } : v);
    } catch { toast.error('Error'); }
  }

  async function onDelete(id: string) {
    try {
      await fetch(`/api/retenciones/${id}`, { method: 'DELETE' });
      toast.success('Retención eliminada');
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
  }

  /* KPIs */
  const totalEmitido = data.filter(r => r.status === 'EMITIDO')
    .reduce((s, r) => s + Number(r.retentionAmount), 0);

  const columns: ColumnsType<Retention> = [
    { title: 'Número', dataIndex: 'number', width: 150,
      render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: 'Fecha', dataIndex: 'date', width: 100,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
    { title: 'Sujeto retenido', dataIndex: 'subjectName', ellipsis: true },
    { title: 'Servicio', dataIndex: 'serviceDesc', ellipsis: true },
    { title: 'Monto bruto', dataIndex: 'grossAmount', width: 110, align: 'right',
      render: (v: number) => fmtUSD(Number(v)) },
    { title: 'Tasa', dataIndex: 'retentionRate', width: 70, align: 'center',
      render: (v: number) => `${(Number(v) * 100).toFixed(0)}%` },
    { title: 'Retención', dataIndex: 'retentionAmount', width: 110, align: 'right',
      render: (v: number) => <b style={{ color: 'hsl(var(--status-error))' }}>{fmtUSD(Number(v))}</b> },
    { title: 'Estado', dataIndex: 'status', width: 100,
      render: (v: string) => <Tag color={STATUS_COLOR[v]}>{v}</Tag> },
    {
      title: '', width: 100, align: 'center',
      render: (_: unknown, r: Retention) => (
        <Space>
          <Button size="small" icon={<Eye size={13} />} onClick={() => setView(r)} />
          {r.status === 'BORRADOR' && (
            <Button size="small" type="primary" onClick={() => changeStatus(r.id, 'EMITIDO')}>
              Emitir
            </Button>
          )}
          <Popconfirm title="¿Eliminar retención?" onConfirm={() => onDelete(r.id)} okText="Sí" cancelText="No"
            disabled={r.status === 'EMITIDO'}>
            <Button size="small" danger icon={<Trash size={13} />} disabled={r.status === 'EMITIDO'} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Retenciones"
        description="Comprobantes de Retención DTE Tipo 11 — ISR sobre servicios Art. 156 Ley de Renta"
        icon={<FileMinus size={20} />}
        actions={[{ label: 'Emitir retención', onClick: openNew }]}
      />

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title="Total retenciones emitidas" value={totalEmitido} prefix="$" precision={2}
              valueStyle={{ color: 'hsl(var(--status-error))' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title="Documentos emitidos" value={data.filter(r => r.status === 'EMITIDO').length} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title="Borradores" value={data.filter(r => r.status === 'BORRADOR').length} />
          </Card>
        </Col>
      </Row>

      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-default))', borderRadius: 12, padding: 16 }}>
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading}
          size="small" pagination={{ pageSize: 15, showSizeChanger: false }}
          summary={rows => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={6} />
              <Table.Summary.Cell index={6} align="right">
                <b style={{ color: 'hsl(var(--status-error))' }}>
                  {fmtUSD(rows.reduce((s, r) => s + Number(r.retentionAmount), 0))}
                </b>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={7} colSpan={2} />
            </Table.Summary.Row>
          )}
        />
      </div>

      {/* ── Modal Nueva Retención ─────────────────────────── */}
      <Modal title="Nueva Retención — DTE Tipo 11"
        open={modal} onCancel={() => setModal(false)}
        onOk={() => form.submit()} okText="Guardar"
        confirmLoading={saving} destroyOnClose width={660}
      >
        <Alert type="warning" showIcon style={{ marginBottom: 14 }}
          message="Art. 156 Ley de Renta"
          description="La ONG como agente retenedor debe retener el 10% del ISR cuando pague honorarios o servicios a personas naturales por montos superiores a $100. El monto retenido se entrega al MH mediante declaración F-11." />

        <Form form={form} layout="vertical" onFinish={onSave} style={{ marginTop: 8 }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="subjectName" label="Nombre del proveedor / Sujeto retenido"
                rules={[{ required: true, message: 'Requerido' }]}>
                <Input placeholder="Nombre completo" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="subjectNit" label="NIT">
                <Input placeholder="0000-000000-000-0" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="subjectDui" label="DUI">
                <Input placeholder="00000000-0" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="serviceDesc" label="Descripción del servicio"
            rules={[{ required: true, message: 'Requerido' }]}>
            <Input placeholder="Ej. Servicios de capacitación, asesoría jurídica..." />
          </Form.Item>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="date" label="Fecha">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Monto bruto (USD)" required>
                <InputNumber min={0} precision={2} prefix="$" style={{ width: '100%' }}
                  value={grossAmt} onChange={v => setGrossAmt(Number(v))} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="retentionRate" label="Tasa de retención">
                <Select value={rate} onChange={(v) => { setRate(v); form.setFieldValue('retentionRate', v); }}
                  options={RETENTION_RATES.map(r => ({ value: r.value, label: r.label }))} />
              </Form.Item>
            </Col>
          </Row>

          {/* Preview de cálculo */}
          <div style={{
            background: 'hsl(var(--bg-page))', borderRadius: 8, padding: 12,
            marginBottom: 12, display: 'flex', gap: 24,
          }}>
            <Statistic title="Monto bruto" value={grossAmt} prefix="$" precision={2} />
            <Statistic title={`Retención (${(rate * 100).toFixed(0)}%)`}
              value={retention} prefix="$" precision={2}
              valueStyle={{ color: 'hsl(var(--status-error))' }} />
            <Statistic title="Líquido a pagar"
              value={grossAmt - retention} prefix="$" precision={2}
              valueStyle={{ color: 'hsl(var(--status-success))' }} />
          </div>

          <Form.Item name="notes" label="Notas">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal Ver Retención ───────────────────────────── */}
      <Modal
        title={`Retención — ${viewDoc?.number ?? ''}`}
        open={!!viewDoc} onCancel={() => setView(null)}
        width={600}
        footer={[
          viewDoc?.status === 'BORRADOR' && (
            <Button key="emit" type="primary"
              onClick={() => { changeStatus(viewDoc.id, 'EMITIDO'); }}>
              Emitir comprobante
            </Button>
          ),
          <Button key="print" icon={<Printer size={14} />} onClick={() => window.print()}>Imprimir</Button>,
          <Button key="c" onClick={() => setView(null)}>Cerrar</Button>,
        ].filter(Boolean)}
      >
        {viewDoc && (
          <div style={{ fontSize: 13, lineHeight: 2 }}>
            <p><b>Agente retenedor:</b> {viewDoc.agentName}</p>
            <p><b>NRC:</b> {viewDoc.agentNrc} &nbsp;|&nbsp; <b>NIT:</b> {viewDoc.agentNit}</p>
            <hr style={{ border: 'none', borderTop: '1px solid hsl(var(--border-default))', margin: '8px 0' }} />
            <p><b>Sujeto retenido:</b> {viewDoc.subjectName}</p>
            {viewDoc.subjectNit && <p><b>NIT:</b> {viewDoc.subjectNit}</p>}
            {viewDoc.subjectDui && <p><b>DUI:</b> {viewDoc.subjectDui}</p>}
            <p><b>Servicio:</b> {viewDoc.serviceDesc}</p>
            <p><b>Fecha:</b> {dayjs(viewDoc.date).format('DD/MM/YYYY')}</p>
            <hr style={{ border: 'none', borderTop: '1px solid hsl(var(--border-default))', margin: '8px 0' }} />
            <Row gutter={12}>
              <Col span={8}><Statistic title="Monto bruto" value={Number(viewDoc.grossAmount)} prefix="$" precision={2} /></Col>
              <Col span={8}><Statistic title={`Retención ${(Number(viewDoc.retentionRate) * 100).toFixed(0)}%`}
                value={Number(viewDoc.retentionAmount)} prefix="$" precision={2}
                valueStyle={{ color: 'hsl(var(--status-error))' }} /></Col>
              <Col span={8}><Statistic title="Líquido"
                value={Number(viewDoc.grossAmount) - Number(viewDoc.retentionAmount)} prefix="$" precision={2}
                valueStyle={{ color: 'hsl(var(--status-success))' }} /></Col>
            </Row>
            <p style={{ marginTop: 12 }}>
              <b>Estado:</b> <Tag color={STATUS_COLOR[viewDoc.status]}>{viewDoc.status}</Tag>
            </p>
            {viewDoc.notes && <p><b>Notas:</b> {viewDoc.notes}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
