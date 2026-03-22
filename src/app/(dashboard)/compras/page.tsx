'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, InputNumber, Select,
  Space, Tag, Popconfirm, DatePicker, Row, Col, Divider,
  Statistic, Card,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ShoppingCart, PencilSimple, Trash, Plus, X } from '@phosphor-icons/react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import PageHeader from '@/components/shared/PageHeader';

type Supplier = { id: string; name: string };
type Product  = { id: string; name: string; code: string; unit: string };
type PurchaseDetail = {
  productId: string; product?: { name: string; unit: string };
  quantity: number; unitPrice: number; total: number;
};
type Purchase = {
  id: string; date: string; status: string;
  subtotal: number; iva: number; total: number;
  invoiceRef?: string; notes?: string;
  supplier: { id: string; name: string };
  details: PurchaseDetail[];
};

const STATUS_COLOR: Record<string, string> = {
  PENDIENTE: 'warning', RECIBIDO: 'success', CANCELADO: 'error',
};

function fmtUSD(n: number) {
  return new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(Number(n));
}

export default function ComprasPage() {
  const [data, setData]           = useState<Purchase[]>([]);
  const [loading, setLoading]     = useState(false);
  const [modal, setModal]         = useState(false);
  const [detailModal, setDetail]  = useState<Purchase | null>(null);
  const [saving, setSaving]       = useState(false);
  const [filterStatus, setFilter] = useState('');
  const [form]                    = Form.useForm();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts]   = useState<Product[]>([]);
  const [lines, setLines]         = useState<{ productId: string; quantity: number; unitPrice: number }[]>([
    { productId: '', quantity: 1, unitPrice: 0 },
  ]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/compras?limit=100${filterStatus ? `&status=${filterStatus}` : ''}`);
      const d = await r.json();
      setData(d.data ?? []);
    } catch { toast.error('Error cargando compras'); }
    finally { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => {
    load();
    fetch('/api/proveedores?limit=200').then(r => r.json()).then(d => setSuppliers(d.data ?? []));
    fetch('/api/inventario?limit=200').then(r => r.json()).then(d => setProducts(d.data ?? []));
  }, [load]);

  function addLine() {
    setLines(l => [...l, { productId: '', quantity: 1, unitPrice: 0 }]);
  }
  function removeLine(i: number) {
    setLines(l => l.filter((_, idx) => idx !== i));
  }
  function updateLine(i: number, field: string, value: string | number) {
    setLines(l => l.map((line, idx) => idx === i ? { ...line, [field]: value } : line));
  }

  const lineTotal  = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const lineIva    = lineTotal * 0.13;
  const lineGrand  = lineTotal + lineIva;

  async function onSave(values: Record<string, unknown>) {
    if (!lines.length || lines.some(l => !l.productId)) {
      toast.error('Complete todos los productos');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        supplierId:  values.supplierId,
        date:        values.date ? (values.date as dayjs.Dayjs).toISOString() : undefined,
        invoiceRef:  values.invoiceRef,
        notes:       values.notes,
        details:     lines,
      };
      const res = await fetch('/api/compras', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Orden de compra creada');
      setModal(false);
      setLines([{ productId: '', quantity: 1, unitPrice: 0 }]);
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  }

  async function changeStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/compras/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(`Estado: ${status}${status === 'RECIBIDO' ? ' — inventario actualizado' : ''}`);
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
  }

  async function onDelete(id: string) {
    try {
      await fetch(`/api/compras/${id}`, { method: 'DELETE' });
      toast.success('Orden eliminada');
      load();
    } catch { toast.error('Error al eliminar'); }
  }

  const totalPendiente = data.filter(p => p.status === 'PENDIENTE').reduce((s, p) => s + Number(p.total), 0);
  const totalRecibido  = data.filter(p => p.status === 'RECIBIDO').reduce((s, p) => s + Number(p.total), 0);

  const columns: ColumnsType<Purchase> = [
    { title: 'Fecha', dataIndex: 'date', width: 100,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
    { title: 'Proveedor', render: (_: unknown, r: Purchase) => r.supplier?.name, ellipsis: true },
    { title: 'Ref. Factura', dataIndex: 'invoiceRef', width: 120,
      render: (v?: string) => v ?? '—' },
    { title: 'Subtotal', dataIndex: 'subtotal', width: 100, align: 'right',
      render: (v: number) => fmtUSD(Number(v)) },
    { title: 'IVA (13%)', dataIndex: 'iva', width: 100, align: 'right',
      render: (v: number) => fmtUSD(Number(v)) },
    { title: 'Total', dataIndex: 'total', width: 110, align: 'right',
      render: (v: number) => <b>{fmtUSD(Number(v))}</b>,
      sorter: (a, b) => Number(a.total) - Number(b.total) },
    { title: 'Estado', dataIndex: 'status', width: 130,
      render: (v: string, r: Purchase) => (
        <Select size="small" value={v} style={{ width: 125 }}
          disabled={v === 'RECIBIDO' || v === 'CANCELADO'}
          onChange={(val) => changeStatus(r.id, val)}
          options={[
            { value: 'PENDIENTE', label: 'Pendiente' },
            { value: 'RECIBIDO',  label: 'Recibido ✓' },
            { value: 'CANCELADO', label: 'Cancelado' },
          ]}
        />
      )},
    {
      title: '', width: 80, align: 'center',
      render: (_: unknown, r: Purchase) => (
        <Space>
          <Button size="small" onClick={() => setDetail(r)}>Ver</Button>
          <Popconfirm title="¿Eliminar orden?" onConfirm={() => onDelete(r.id)} okText="Sí" cancelText="No">
            <Button size="small" danger icon={<Trash size={13} />}
              disabled={r.status === 'RECIBIDO'} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Compras"
        description="Órdenes de compra y adquisiciones"
        icon={<ShoppingCart size={20} />}
        actions={[{ label: 'Nueva orden de compra', onClick: () => { setLines([{ productId: '', quantity: 1, unitPrice: 0 }]); form.resetFields(); form.setFieldsValue({ date: dayjs() }); setModal(true); } }]}
      />

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title="Órdenes pendientes" value={totalPendiente} prefix="$" precision={2}
              valueStyle={{ color: 'hsl(var(--status-warning))' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title="Total recibido" value={totalRecibido} prefix="$" precision={2}
              valueStyle={{ color: 'hsl(var(--status-success))' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title="Total órdenes" value={data.length} />
          </Card>
        </Col>
      </Row>

      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-default))', borderRadius: 12, padding: 16 }}>
        <Select allowClear placeholder="Filtrar por estado" style={{ width: 180, marginBottom: 14 }}
          value={filterStatus || undefined} onChange={(v) => setFilter(v ?? '')}
          options={[
            { value: 'PENDIENTE', label: 'Pendientes' },
            { value: 'RECIBIDO',  label: 'Recibidas' },
            { value: 'CANCELADO', label: 'Canceladas' },
          ]}
        />
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading}
          size="small" pagination={{ pageSize: 15, showSizeChanger: false }}
          summary={rows => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={5} />
              <Table.Summary.Cell index={5} align="right">
                <b>{fmtUSD(rows.reduce((s, r) => s + Number(r.total), 0))}</b>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={6} colSpan={2} />
            </Table.Summary.Row>
          )}
        />
      </div>

      {/* ── Modal Nueva Compra ────────────────────────────── */}
      <Modal title="Nueva orden de compra"
        open={modal} onCancel={() => setModal(false)}
        onOk={() => form.submit()} okText="Crear orden"
        confirmLoading={saving} destroyOnClose width={740}
      >
        <Form form={form} layout="vertical" onFinish={onSave} style={{ marginTop: 12 }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="supplierId" label="Proveedor"
                rules={[{ required: true, message: 'Selecciona el proveedor' }]}>
                <Select showSearch placeholder="Proveedor"
                  filterOption={(inp, opt) => (opt?.label as string ?? '').toLowerCase().includes(inp.toLowerCase())}
                  options={suppliers.map(s => ({ value: s.id, label: s.name }))} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="date" label="Fecha">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="invoiceRef" label="Ref. factura proveedor">
                <Input placeholder="N° factura" />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '8px 0' }}>Detalle de productos</Divider>

          {lines.map((line, i) => (
            <Row key={i} gutter={8} align="middle" style={{ marginBottom: 8 }}>
              <Col span={10}>
                <Select
                  showSearch placeholder="Producto"
                  style={{ width: '100%' }}
                  value={line.productId || undefined}
                  onChange={v => updateLine(i, 'productId', v)}
                  filterOption={(inp, opt) => (opt?.label as string ?? '').toLowerCase().includes(inp.toLowerCase())}
                  options={products.map(p => ({ value: p.id, label: `[${p.code}] ${p.name}` }))}
                />
              </Col>
              <Col span={5}>
                <InputNumber min={0.001} precision={3} placeholder="Cantidad" style={{ width: '100%' }}
                  value={line.quantity} onChange={v => updateLine(i, 'quantity', Number(v))} />
              </Col>
              <Col span={5}>
                <InputNumber min={0} precision={2} prefix="$" placeholder="Precio unit."
                  style={{ width: '100%' }}
                  value={line.unitPrice} onChange={v => updateLine(i, 'unitPrice', Number(v))} />
              </Col>
              <Col span={3} style={{ textAlign: 'right', fontWeight: 600 }}>
                {fmtUSD(line.quantity * line.unitPrice)}
              </Col>
              <Col span={1}>
                {lines.length > 1 && (
                  <Button size="small" type="text" danger
                    icon={<X size={13} />} onClick={() => removeLine(i)} />
                )}
              </Col>
            </Row>
          ))}

          <Button type="dashed" icon={<Plus size={13} />} onClick={addLine}
            style={{ width: '100%', marginBottom: 12 }}>
            Agregar producto
          </Button>

          <div style={{ textAlign: 'right', padding: '8px 0' }}>
            <Space direction="vertical" size={4} style={{ alignItems: 'flex-end' }}>
              <span>Subtotal: <b>{fmtUSD(lineTotal)}</b></span>
              <span>IVA (13%): <b>{fmtUSD(lineIva)}</b></span>
              <span style={{ fontSize: 16 }}>TOTAL: <b>{fmtUSD(lineGrand)}</b></span>
            </Space>
          </div>

          <Form.Item name="notes" label="Notas">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal Ver Detalle ─────────────────────────────── */}
      <Modal title={`Orden de compra — ${detailModal?.supplier?.name}`}
        open={!!detailModal} onCancel={() => setDetail(null)}
        footer={[<Button key="c" onClick={() => setDetail(null)}>Cerrar</Button>]}
        width={600}
      >
        {detailModal && (
          <div>
            <Row gutter={12} style={{ marginBottom: 12 }}>
              <Col span={12}><b>Fecha:</b> {dayjs(detailModal.date).format('DD/MM/YYYY')}</Col>
              <Col span={12}><b>Estado:</b> <Tag color={STATUS_COLOR[detailModal.status]}>{detailModal.status}</Tag></Col>
              {detailModal.invoiceRef && <Col span={12}><b>Ref.:</b> {detailModal.invoiceRef}</Col>}
            </Row>
            <Table
              dataSource={detailModal.details}
              rowKey={(r, i) => String(i)}
              size="small" pagination={false}
              columns={[
                { title: 'Producto', render: (_: unknown, r: PurchaseDetail) => r.product?.name ?? '—', ellipsis: true },
                { title: 'Unidad', render: (_: unknown, r: PurchaseDetail) => r.product?.unit ?? '—', width: 80 },
                { title: 'Cantidad', dataIndex: 'quantity', width: 80, align: 'right' },
                { title: 'Precio unit.', dataIndex: 'unitPrice', width: 90, align: 'right',
                  render: (v: number) => fmtUSD(Number(v)) },
                { title: 'Total', dataIndex: 'total', width: 90, align: 'right',
                  render: (v: number) => fmtUSD(Number(v)) },
              ]}
            />
            <Divider />
            <div style={{ textAlign: 'right' }}>
              <Space direction="vertical" size={2} style={{ alignItems: 'flex-end' }}>
                <span>Subtotal: {fmtUSD(Number(detailModal.subtotal))}</span>
                <span>IVA: {fmtUSD(Number(detailModal.iva))}</span>
                <b style={{ fontSize: 16 }}>Total: {fmtUSD(Number(detailModal.total))}</b>
              </Space>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
