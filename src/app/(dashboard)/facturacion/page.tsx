'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, InputNumber, Select,
  Space, Tag, Popconfirm, DatePicker, Row, Col, Tabs,
  Divider, Alert,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { FileText, Plus, X, Eye, Trash, Printer } from '@phosphor-icons/react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import PageHeader from '@/components/shared/PageHeader';

/* ─── Tipos ──────────────────────────────────────────── */
type InvoiceDetail = {
  description: string; quantity: number; unitPrice: number; subtotal: number; taxable: boolean;
};
type Invoice = {
  id: string; dteType: string; number: string; status: string; date: string;
  receiverName: string; receiverNrc?: string; receiverNit?: string; receiverDui?: string;
  receiverAddress?: string;
  issuerName: string; issuerNrc: string; issuerNit: string; issuerAddress: string;
  subtotal: number; ivaAmount: number; total: number;
  paymentMethod: string; notes?: string; voidReason?: string;
  details: InvoiceDetail[];
};

const DTE_LABELS: Record<string, string> = {
  FACTURA:      'Factura (01)',
  CCF:          'CCF (03)',
  NOTA_CREDITO: 'Nota de Crédito (05)',
  NOTA_DEBITO:  'Nota de Débito (06)',
  DONACION:     'Comp. Donación (46)',
};

const STATUS_COLOR: Record<string, string> = {
  BORRADOR: 'default', EMITIDO: 'success', ANULADO: 'error',
};

const PAYMENT_LABELS: Record<string, string> = {
  EFECTIVO: 'Efectivo', TRANSFERENCIA: 'Transferencia',
  CHEQUE: 'Cheque', TARJETA: 'Tarjeta', OTRO: 'Otro',
};

function fmtUSD(n: number) {
  return new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(Number(n));
}

/* ─── Componente ─────────────────────────────────────── */
export default function FacturacionPage() {
  const [tab, setTab]           = useState('FACTURA');
  const [data, setData]         = useState<Invoice[]>([]);
  const [loading, setLoading]   = useState(false);
  const [modal, setModal]       = useState(false);
  const [viewDoc, setView]      = useState<Invoice | null>(null);
  const [saving, setSaving]     = useState(false);
  const [form]                  = Form.useForm();
  const [lines, setLines]       = useState<{ description: string; quantity: number; unitPrice: number; taxable: boolean }[]>([
    { description: '', quantity: 1, unitPrice: 0, taxable: true },
  ]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/facturacion?limit=100&dteType=${tab}`);
      const d = await r.json();
      setData(d.data ?? []);
    } catch { toast.error('Error cargando documentos'); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setLines([{ description: '', quantity: 1, unitPrice: 0, taxable: true }]);
    form.resetFields();
    form.setFieldsValue({ dteType: tab, date: dayjs(), paymentMethod: 'EFECTIVO' });
    setModal(true);
  }

  function addLine() {
    setLines(l => [...l, { description: '', quantity: 1, unitPrice: 0, taxable: true }]);
  }
  function removeLine(i: number) { setLines(l => l.filter((_, idx) => idx !== i)); }
  function updateLine(i: number, field: string, value: string | number | boolean) {
    setLines(l => l.map((line, idx) => idx === i ? { ...line, [field]: value } : line));
  }

  const needsIva    = tab === 'CCF' || tab === 'NOTA_CREDITO' || tab === 'NOTA_DEBITO';
  const lineTotal   = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const lineIva     = needsIva ? lines.filter(l => l.taxable).reduce((s, l) => s + l.quantity * l.unitPrice * 0.13, 0) : 0;
  const lineGrand   = lineTotal + lineIva;

  async function onSave(values: Record<string, unknown>) {
    if (lines.some(l => !l.description.trim())) {
      toast.error('Complete la descripción de todos los ítems');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...values,
        date:    values.date ? (values.date as dayjs.Dayjs).toISOString() : undefined,
        details: lines,
      };
      const res = await fetch('/api/facturacion', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Documento creado correctamente');
      setModal(false);
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  }

  async function changeStatus(id: string, status: string, voidReason?: string) {
    try {
      await fetch(`/api/facturacion/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, voidReason }),
      });
      toast.success(`Documento ${status.toLowerCase()}`);
      load();
    } catch { toast.error('Error al actualizar estado'); }
  }

  async function onDelete(id: string) {
    try {
      await fetch(`/api/facturacion/${id}`, { method: 'DELETE' });
      toast.success('Documento eliminado');
      load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al eliminar';
      toast.error(msg);
    }
  }

  const columns: ColumnsType<Invoice> = [
    { title: 'Número', dataIndex: 'number', width: 140,
      render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: 'Fecha', dataIndex: 'date', width: 100,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
    { title: 'Receptor', dataIndex: 'receiverName', ellipsis: true },
    { title: 'NRC / NIT', width: 130,
      render: (_: unknown, r: Invoice) => r.receiverNrc || r.receiverNit || r.receiverDui || '—' },
    { title: 'Método', dataIndex: 'paymentMethod', width: 110,
      render: (v: string) => PAYMENT_LABELS[v] ?? v },
    { title: tab === 'CCF' ? 'Subtotal' : 'Total', dataIndex: 'subtotal', width: 100, align: 'right',
      render: (v: number) => fmtUSD(Number(v)) },
    ...(needsIva ? [{
      title: 'IVA (13%)', dataIndex: 'ivaAmount', width: 100, align: 'right' as const,
      render: (v: number) => fmtUSD(Number(v)),
    }] : []),
    { title: 'Total', dataIndex: 'total', width: 110, align: 'right',
      render: (v: number) => <b>{fmtUSD(Number(v))}</b> },
    { title: 'Estado', dataIndex: 'status', width: 100,
      render: (v: string) => <Tag color={STATUS_COLOR[v]}>{v}</Tag> },
    {
      title: '', width: 100, align: 'center',
      render: (_: unknown, r: Invoice) => (
        <Space>
          <Button size="small" icon={<Eye size={13} />} onClick={() => setView(r)} />
          {r.status === 'BORRADOR' && (
            <Button size="small" type="primary" onClick={() => changeStatus(r.id, 'EMITIDO')}>
              Emitir
            </Button>
          )}
          {r.status !== 'ANULADO' && (
            <Popconfirm title="¿Eliminar documento?" onConfirm={() => onDelete(r.id)} okText="Sí" cancelText="No"
              disabled={r.status === 'EMITIDO'}>
              <Button size="small" danger icon={<Trash size={13} />} disabled={r.status === 'EMITIDO'} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const tabItems = Object.entries(DTE_LABELS).map(([key, label]) => ({
    key,
    label,
    children: (
      <Table dataSource={data} columns={columns} rowKey="id" loading={loading}
        size="small" pagination={{ pageSize: 12, showSizeChanger: false }}
        summary={rows => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={needsIva ? 5 : 4} />
            <Table.Summary.Cell index={4} align="right"><b>{fmtUSD(rows.reduce((s, r) => s + Number(r.total), 0))}</b></Table.Summary.Cell>
            <Table.Summary.Cell index={5} colSpan={needsIva ? 4 : 3} />
          </Table.Summary.Row>
        )}
      />
    ),
  }));

  return (
    <div>
      <PageHeader
        title="Facturación"
        description="Emisión de Facturas, CCF, Notas de Crédito/Débito y Comprobantes de Donación"
        icon={<FileText size={20} />}
        actions={[{ label: `Nuevo ${DTE_LABELS[tab]?.split(' ')[0]}`, onClick: openNew }]}
      />

      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-default))', borderRadius: 12, padding: '12px 16px 16px' }}>
        <Tabs activeKey={tab} onChange={setTab} items={tabItems} />
      </div>

      {/* ── Modal Nuevo Documento ─────────────────────────── */}
      <Modal title={`Nuevo — ${DTE_LABELS[tab]}`}
        open={modal} onCancel={() => setModal(false)}
        onOk={() => form.submit()} okText="Guardar documento"
        confirmLoading={saving} destroyOnClose width={780}
      >
        {needsIva && (
          <Alert type="info" showIcon style={{ marginBottom: 12 }}
            message="CCF: aplica IVA 13% sobre los ítems gravados. Asegúrate de ingresar el NRC del receptor." />
        )}
        <Form form={form} layout="vertical" onFinish={onSave} style={{ marginTop: 8 }}>
          <Form.Item name="dteType" hidden initialValue={tab}><Input /></Form.Item>

          <Divider style={{ fontSize: 12, margin: '4px 0 10px' }}>Receptor</Divider>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="receiverName" label="Nombre / Razón social"
                rules={[{ required: true, message: 'Requerido' }]}>
                <Input />
              </Form.Item>
            </Col>
            {(tab === 'CCF' || tab === 'NOTA_CREDITO' || tab === 'NOTA_DEBITO') && (
              <Col span={6}>
                <Form.Item name="receiverNrc" label="NRC">
                  <Input placeholder="00000-0" />
                </Form.Item>
              </Col>
            )}
            <Col span={6}>
              <Form.Item name="receiverNit" label={tab === 'FACTURA' || tab === 'DONACION' ? 'NIT / DUI' : 'NIT'}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="receiverAddress" label="Dirección">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="date" label="Fecha">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="paymentMethod" label="Método de pago">
                <Select options={Object.entries(PAYMENT_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ fontSize: 12, margin: '4px 0 10px' }}>Detalle</Divider>

          {lines.map((line, i) => (
            <Row key={i} gutter={8} align="middle" style={{ marginBottom: 8 }}>
              <Col span={12}>
                <Input size="small" placeholder="Descripción del servicio/producto"
                  value={line.description}
                  onChange={e => updateLine(i, 'description', e.target.value)} />
              </Col>
              <Col span={4}>
                <InputNumber size="small" min={0.001} precision={3} placeholder="Cant."
                  style={{ width: '100%' }} value={line.quantity}
                  onChange={v => updateLine(i, 'quantity', Number(v))} />
              </Col>
              <Col span={4}>
                <InputNumber size="small" min={0} precision={2} prefix="$" placeholder="Precio"
                  style={{ width: '100%' }} value={line.unitPrice}
                  onChange={v => updateLine(i, 'unitPrice', Number(v))} />
              </Col>
              <Col span={3} style={{ textAlign: 'right', fontWeight: 600, fontSize: 12 }}>
                {fmtUSD(line.quantity * line.unitPrice)}
              </Col>
              <Col span={1}>
                {lines.length > 1 && (
                  <Button size="small" type="text" danger icon={<X size={12} />} onClick={() => removeLine(i)} />
                )}
              </Col>
            </Row>
          ))}

          <Button type="dashed" icon={<Plus size={13} />} onClick={addLine}
            style={{ width: '100%', marginBottom: 12 }}>
            Agregar ítem
          </Button>

          <div style={{ textAlign: 'right', padding: '4px 0' }}>
            <Space direction="vertical" size={2} style={{ alignItems: 'flex-end', fontSize: 13 }}>
              <span>Subtotal: <b>{fmtUSD(lineTotal)}</b></span>
              {needsIva && <span>IVA (13%): <b>{fmtUSD(lineIva)}</b></span>}
              <span style={{ fontSize: 15 }}>TOTAL: <b>{fmtUSD(lineGrand)}</b></span>
            </Space>
          </div>

          <Form.Item name="notes" label="Observaciones" style={{ marginTop: 8 }}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal Ver Documento ───────────────────────────── */}
      <Modal
        title={`${DTE_LABELS[viewDoc?.dteType ?? ''] ?? ''} — ${viewDoc?.number ?? ''}`}
        open={!!viewDoc}
        onCancel={() => setView(null)}
        width={700}
        footer={[
          viewDoc?.status === 'BORRADOR' && (
            <Button key="emit" type="primary"
              onClick={() => { changeStatus(viewDoc.id, 'EMITIDO'); setView(v => v ? { ...v, status: 'EMITIDO' } : v); }}>
              Emitir documento
            </Button>
          ),
          viewDoc?.status === 'EMITIDO' && (
            <Popconfirm key="void"
              title="¿Anular documento?"
              description="Esta acción no se puede deshacer."
              onConfirm={() => { changeStatus(viewDoc.id, 'ANULADO'); setView(null); }}
              okText="Anular" cancelText="No" okButtonProps={{ danger: true }}
            >
              <Button danger>Anular</Button>
            </Popconfirm>
          ),
          <Button key="print" icon={<Printer size={14} />} onClick={() => window.print()}>Imprimir</Button>,
          <Button key="c" onClick={() => setView(null)}>Cerrar</Button>,
        ].filter(Boolean)}
      >
        {viewDoc && (
          <div style={{ fontSize: 13 }}>
            <Row gutter={12} style={{ marginBottom: 8 }}>
              <Col span={12}><b>Emisor:</b> {viewDoc.issuerName}</Col>
              <Col span={12}><b>NRC:</b> {viewDoc.issuerNrc} | <b>NIT:</b> {viewDoc.issuerNit}</Col>
            </Row>
            <Divider style={{ margin: '8px 0' }} />
            <Row gutter={12} style={{ marginBottom: 8 }}>
              <Col span={12}><b>Receptor:</b> {viewDoc.receiverName}</Col>
              <Col span={12}>
                {viewDoc.receiverNrc && <span><b>NRC:</b> {viewDoc.receiverNrc} | </span>}
                {viewDoc.receiverNit && <span><b>NIT:</b> {viewDoc.receiverNit}</span>}
              </Col>
              {viewDoc.receiverAddress && (
                <Col span={24}><b>Dirección:</b> {viewDoc.receiverAddress}</Col>
              )}
            </Row>
            <Row gutter={12} style={{ marginBottom: 8 }}>
              <Col span={12}><b>Fecha:</b> {dayjs(viewDoc.date).format('DD/MM/YYYY')}</Col>
              <Col span={12}><b>Método pago:</b> {PAYMENT_LABELS[viewDoc.paymentMethod]}</Col>
              <Col span={12}><b>Estado:</b> <Tag color={STATUS_COLOR[viewDoc.status]}>{viewDoc.status}</Tag></Col>
            </Row>
            <Divider style={{ margin: '8px 0' }} />
            <Table
              dataSource={viewDoc.details}
              rowKey={(_, i) => String(i)}
              size="small" pagination={false}
              columns={[
                { title: 'Descripción', dataIndex: 'description', ellipsis: true },
                { title: 'Cant.', dataIndex: 'quantity', width: 70, align: 'right' },
                { title: 'Precio', dataIndex: 'unitPrice', width: 80, align: 'right',
                  render: (v: number) => fmtUSD(Number(v)) },
                { title: 'Subtotal', dataIndex: 'subtotal', width: 90, align: 'right',
                  render: (v: number) => fmtUSD(Number(v)) },
              ]}
            />
            <div style={{ textAlign: 'right', marginTop: 12 }}>
              <Space direction="vertical" size={2} style={{ alignItems: 'flex-end' }}>
                <span>Subtotal: {fmtUSD(Number(viewDoc.subtotal))}</span>
                {Number(viewDoc.ivaAmount) > 0 && (
                  <span>IVA (13%): {fmtUSD(Number(viewDoc.ivaAmount))}</span>
                )}
                <b style={{ fontSize: 15 }}>TOTAL: {fmtUSD(Number(viewDoc.total))}</b>
              </Space>
            </div>
            {viewDoc.notes && <p style={{ marginTop: 8 }}><b>Observaciones:</b> {viewDoc.notes}</p>}
            {viewDoc.voidReason && (
              <Alert type="error" style={{ marginTop: 8 }}
                message={`Anulado: ${viewDoc.voidReason}`} />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
