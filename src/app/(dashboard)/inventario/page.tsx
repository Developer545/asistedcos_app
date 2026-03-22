'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, InputNumber, Select,
  Space, Tag, Popconfirm, Tabs, Badge, Row, Col, Statistic, Card,
  DatePicker,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  Package, PencilSimple, Trash, MagnifyingGlass,
  ArrowDown, ArrowUp, Scales,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import PageHeader from '@/components/shared/PageHeader';

type Product = {
  id: string; code: string; name: string; description?: string;
  unit: string; stock: number; minStock: number; active: boolean;
  project?: { id: string; name: string } | null;
};
type Kardex = {
  id: string; type: string; quantity: number; balance: number;
  reference?: string; notes?: string; date: string;
};
type Project = { id: string; name: string };

const UNITS = ['UNIDAD', 'CAJA', 'BOLSA', 'KG', 'LITRO', 'METRO', 'PAQUETE', 'PAR'];

const TYPE_COLOR: Record<string, string> = { ENTRADA: 'success', SALIDA: 'error', AJUSTE: 'warning' };
const TYPE_ICON: Record<string, React.ReactNode> = {
  ENTRADA: <ArrowDown size={12} />,
  SALIDA:  <ArrowUp size={12} />,
  AJUSTE:  <Scales size={12} />,
};

function fmtNum(n: number) { return Number(n).toFixed(3).replace(/\.?0+$/, ''); }

export default function InventarioPage() {
  const [tab, setTab]           = useState('productos');
  const [data, setData]         = useState<Product[]>([]);
  const [loading, setLoading]   = useState(false);
  const [modal, setModal]       = useState(false);
  const [editing, setEditing]   = useState<Product | null>(null);
  const [saving, setSaving]     = useState(false);
  const [search, setSearch]     = useState('');
  const [form]                  = Form.useForm();
  const [projects, setProjects] = useState<Project[]>([]);

  /* Kardex */
  const [kardexProduct, setKardexProduct] = useState<Product | null>(null);
  const [kardex, setKardex]               = useState<Kardex[]>([]);
  const [kardexLoading, setKardexLoading] = useState(false);
  const [movModal, setMovModal]           = useState(false);
  const [movForm]                         = Form.useForm();
  const [movSaving, setMovSaving]         = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/inventario?limit=200&search=${search}`);
      const d = await r.json();
      setData(d.data ?? []);
    } catch { toast.error('Error cargando inventario'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => {
    load();
    fetch('/api/proyectos?limit=100').then(r => r.json()).then(d => setProjects(d.data ?? []));
  }, [load]);

  async function openKardex(product: Product) {
    setKardexProduct(product);
    setKardexLoading(true);
    setTab('kardex');
    try {
      const r = await fetch(`/api/inventario/kardex?productId=${product.id}`);
      const d = await r.json();
      setKardex(d.data ?? d ?? []);
    } catch { toast.error('Error cargando kardex'); }
    finally { setKardexLoading(false); }
  }

  function openModal(record?: Product) {
    setEditing(record ?? null);
    form.resetFields();
    if (record) {
      form.setFieldsValue({ ...record, projectId: record.project?.id });
    } else {
      form.setFieldsValue({ unit: 'UNIDAD', minStock: 0 });
    }
    setModal(true);
  }

  async function onSave(values: Record<string, unknown>) {
    setSaving(true);
    try {
      const url    = editing ? `/api/inventario/${editing.id}` : '/api/inventario';
      const method = editing ? 'PUT' : 'POST';
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(editing ? 'Producto actualizado' : 'Producto creado');
      setModal(false);
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  }

  async function onDelete(id: string) {
    try {
      await fetch(`/api/inventario/${id}`, { method: 'DELETE' });
      toast.success('Producto desactivado');
      load();
    } catch { toast.error('Error al eliminar'); }
  }

  async function onMovimiento(values: Record<string, unknown>) {
    if (!kardexProduct) return;
    setMovSaving(true);
    try {
      const payload = {
        productId: kardexProduct.id,
        type:      values.type,
        quantity:  values.quantity,
        reference: values.reference,
        notes:     values.notes,
        date:      values.date ? (values.date as dayjs.Dayjs).toISOString() : new Date().toISOString(),
      };
      const res = await fetch('/api/inventario/kardex', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Movimiento registrado');
      setMovModal(false);
      movForm.resetFields();
      load();
      openKardex({ ...kardexProduct }); // recargar
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setMovSaving(false); }
  }

  const lowStockCount = data.filter(p => Number(p.stock) <= Number(p.minStock) && Number(p.minStock) > 0).length;

  const columns: ColumnsType<Product> = [
    { title: 'Código', dataIndex: 'code', width: 110,
      render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Nombre', dataIndex: 'name', ellipsis: true,
      render: (v: string, r: Product) => (
        <Button type="link" size="small" onClick={() => openKardex(r)} style={{ padding: 0 }}>{v}</Button>
      )},
    { title: 'Unidad', dataIndex: 'unit', width: 90 },
    { title: 'Proyecto', width: 150, ellipsis: true,
      render: (_: unknown, r: Product) => r.project?.name ?? <span style={{ color: 'hsl(var(--text-muted))' }}>General</span> },
    { title: 'Stock', dataIndex: 'stock', width: 90, align: 'right',
      render: (v: number, r: Product) => {
        const low = Number(v) <= Number(r.minStock) && Number(r.minStock) > 0;
        return <b style={{ color: low ? 'hsl(var(--status-error))' : undefined }}>{fmtNum(Number(v))}</b>;
      },
      sorter: (a, b) => Number(a.stock) - Number(b.stock),
    },
    { title: 'Mín.', dataIndex: 'minStock', width: 80, align: 'right',
      render: (v: number) => fmtNum(Number(v)) },
    {
      title: '', width: 80, align: 'center',
      render: (_: unknown, r: Product) => (
        <Space>
          <Button size="small" icon={<PencilSimple size={13} />} onClick={() => openModal(r)} />
          <Popconfirm title="¿Desactivar producto?" onConfirm={() => onDelete(r.id)} okText="Sí" cancelText="No">
            <Button size="small" danger icon={<Trash size={13} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const kardexCols: ColumnsType<Kardex> = [
    { title: 'Fecha', dataIndex: 'date', width: 110,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
    { title: 'Tipo', dataIndex: 'type', width: 100,
      render: (v: string) => (
        <Tag color={TYPE_COLOR[v]} icon={TYPE_ICON[v]}>{v}</Tag>
      )},
    { title: 'Cantidad', dataIndex: 'quantity', width: 100, align: 'right',
      render: (v: number) => fmtNum(Number(v)) },
    { title: 'Saldo', dataIndex: 'balance', width: 100, align: 'right',
      render: (v: number) => <b>{fmtNum(Number(v))}</b> },
    { title: 'Referencia', dataIndex: 'reference', ellipsis: true,
      render: (v?: string) => v ?? '—' },
    { title: 'Notas', dataIndex: 'notes', ellipsis: true,
      render: (v?: string) => v ?? '—' },
  ];

  return (
    <div>
      <PageHeader
        title="Inventario"
        description="Control de existencias e insumos por proyecto"
        icon={<Package size={20} />}
        actions={tab === 'productos'
          ? [{ label: 'Nuevo producto', onClick: () => openModal() }]
          : [
              { label: 'Registrar movimiento', onClick: () => { movForm.resetFields(); movForm.setFieldsValue({ date: dayjs(), type: 'ENTRADA' }); setMovModal(true); } },
              { label: '← Volver', onClick: () => setTab('productos'), type: 'default' as const },
            ]
        }
      />

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title="Productos activos" value={data.length} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title="Stock crítico"
              value={lowStockCount}
              valueStyle={{ color: lowStockCount > 0 ? 'hsl(var(--status-error))' : undefined }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title="Producto seleccionado"
              value={kardexProduct?.name ?? '—'}
              valueStyle={{ fontSize: 14 }} />
          </Card>
        </Col>
      </Row>

      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-default))', borderRadius: 12, padding: '12px 16px 16px' }}>
        <Tabs activeKey={tab} onChange={setTab} items={[
          {
            key: 'productos', label: 'Productos',
            children: (
              <>
                <Input placeholder="Buscar código o nombre..."
                  prefix={<MagnifyingGlass size={14} />}
                  value={search} onChange={e => setSearch(e.target.value)}
                  style={{ width: 280, marginBottom: 12 }} />
                <Table dataSource={data} columns={columns} rowKey="id" loading={loading}
                  size="small" pagination={{ pageSize: 15, showSizeChanger: false }} />
              </>
            ),
          },
          {
            key: 'kardex',
            label: (
              <span>
                Kardex {kardexProduct && <Badge count={kardexProduct.name} color="blue" style={{ fontSize: 10 }} />}
              </span>
            ),
            children: kardexProduct ? (
              <Table dataSource={kardex} columns={kardexCols} rowKey="id"
                loading={kardexLoading} size="small"
                pagination={{ pageSize: 20, showSizeChanger: false }} />
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: 'hsl(var(--text-muted))' }}>
                Selecciona un producto de la lista para ver su kardex
              </div>
            ),
          },
        ]} />
      </div>

      {/* ── Modal Producto ────────────────────────────────── */}
      <Modal title={editing ? 'Editar producto' : 'Nuevo producto'}
        open={modal} onCancel={() => setModal(false)}
        onOk={() => form.submit()} okText={editing ? 'Guardar' : 'Crear'}
        confirmLoading={saving} destroyOnClose width={540}
      >
        <Form form={form} layout="vertical" onFinish={onSave} style={{ marginTop: 12 }}>
          <Row gutter={12}>
            <Col span={10}>
              <Form.Item name="code" label="Código"
                rules={[{ required: true, message: 'Requerido' }]}>
                <Input placeholder="Ej. INS-001" style={{ textTransform: 'uppercase' }} />
              </Form.Item>
            </Col>
            <Col span={14}>
              <Form.Item name="name" label="Nombre del producto"
                rules={[{ required: true, message: 'Requerido' }]}>
                <Input placeholder="Nombre descriptivo" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Descripción">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="unit" label="Unidad de medida">
                <Select options={UNITS.map(u => ({ value: u, label: u }))} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="minStock" label="Stock mínimo">
                <InputNumber min={0} precision={3} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="projectId" label="Proyecto">
                <Select allowClear placeholder="General"
                  options={projects.map(p => ({ value: p.id, label: p.name }))} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ── Modal Movimiento ──────────────────────────────── */}
      <Modal title={`Movimiento — ${kardexProduct?.name ?? ''}`}
        open={movModal} onCancel={() => setMovModal(false)}
        onOk={() => movForm.submit()} okText="Registrar"
        confirmLoading={movSaving} destroyOnClose width={440}
      >
        <Form form={movForm} layout="vertical" onFinish={onMovimiento} style={{ marginTop: 12 }}>
          <Form.Item name="type" label="Tipo de movimiento"
            rules={[{ required: true }]}>
            <Select options={[
              { value: 'ENTRADA', label: '⬇ Entrada (ingreso de stock)' },
              { value: 'SALIDA',  label: '⬆ Salida (consumo de stock)' },
              { value: 'AJUSTE',  label: '⚖ Ajuste (fijar cantidad exacta)' },
            ]} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="quantity" label="Cantidad"
                rules={[{ required: true, message: 'Requerido' }]}>
                <InputNumber min={0.001} precision={3} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="date" label="Fecha">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="reference" label="Referencia">
            <Input placeholder="Ej. Compra #001, Proyecto X..." />
          </Form.Item>
          <Form.Item name="notes" label="Notas">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
