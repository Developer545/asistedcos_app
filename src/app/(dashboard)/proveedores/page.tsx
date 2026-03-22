'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, Space, Tag,
  Popconfirm, Switch, Row, Col, Statistic, Card,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Truck, PencilSimple, Trash, MagnifyingGlass } from '@phosphor-icons/react';
import { toast } from 'sonner';
import PageHeader from '@/components/shared/PageHeader';

type Supplier = {
  id: string; name: string; nrc?: string; nit?: string; dui?: string;
  email?: string; phone?: string; address?: string; contact?: string;
  active: boolean; notes?: string;
  _count?: { purchases: number; expenses: number };
};

export default function ProveedoresPage() {
  const [data, setData]       = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [saving, setSaving]   = useState(false);
  const [search, setSearch]   = useState('');
  const [form]                = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/proveedores?limit=100&search=${search}`);
      const d = await r.json();
      setData(d.data ?? []);
    } catch { toast.error('Error cargando proveedores'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  function openModal(record?: Supplier) {
    setEditing(record ?? null);
    form.resetFields();
    if (record) form.setFieldsValue({ ...record });
    else form.setFieldsValue({ active: true });
    setModal(true);
  }

  async function onSave(values: Record<string, unknown>) {
    setSaving(true);
    try {
      const url    = editing ? `/api/proveedores/${editing.id}` : '/api/proveedores';
      const method = editing ? 'PUT' : 'POST';
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(editing ? 'Proveedor actualizado' : 'Proveedor creado');
      setModal(false);
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  }

  async function onDelete(id: string) {
    try {
      await fetch(`/api/proveedores/${id}`, { method: 'DELETE' });
      toast.success('Proveedor eliminado');
      load();
    } catch { toast.error('Error al eliminar'); }
  }

  const totalActive   = data.filter(s => s.active).length;
  const totalInactive = data.filter(s => !s.active).length;

  const columns: ColumnsType<Supplier> = [
    { title: 'Nombre / Razón Social', dataIndex: 'name', ellipsis: true, sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: 'NRC',     dataIndex: 'nrc',     width: 120, render: (v?: string) => v ?? '—' },
    { title: 'Contacto',dataIndex: 'contact', ellipsis: true, render: (v?: string) => v ?? '—' },
    { title: 'Teléfono',dataIndex: 'phone',   width: 110, render: (v?: string) => v ?? '—' },
    { title: 'Correo',  dataIndex: 'email',   ellipsis: true, render: (v?: string) => v ?? '—' },
    { title: 'Compras', width: 80, align: 'center',
      render: (_: unknown, r: Supplier) => <Tag color="blue">{r._count?.purchases ?? 0}</Tag> },
    { title: 'Estado',  dataIndex: 'active', width: 90,
      render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? 'Activo' : 'Inactivo'}</Tag> },
    {
      title: '', width: 80, align: 'center',
      render: (_: unknown, r: Supplier) => (
        <Space>
          <Button size="small" icon={<PencilSimple size={13} />} onClick={() => openModal(r)} />
          <Popconfirm title="¿Eliminar proveedor?" onConfirm={() => onDelete(r.id)} okText="Sí" cancelText="No">
            <Button size="small" danger icon={<Trash size={13} />}
              disabled={!!r._count?.purchases || !!r._count?.expenses}
              title={r._count?.purchases ? 'Tiene compras asociadas' : ''} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Proveedores"
        description="Directorio de proveedores y contratistas"
        icon={<Truck size={20} />}
        actions={[{ label: 'Nuevo proveedor', onClick: () => openModal() }]}
      />

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title="Total proveedores" value={data.length} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title="Activos" value={totalActive}
              valueStyle={{ color: 'hsl(var(--status-success))' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title="Inactivos" value={totalInactive}
              valueStyle={{ color: 'hsl(var(--text-muted))' }} />
          </Card>
        </Col>
      </Row>

      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-default))', borderRadius: 12, padding: 16 }}>
        <Input
          placeholder="Buscar por nombre, NRC, correo o contacto..."
          prefix={<MagnifyingGlass size={14} />}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 320, marginBottom: 14 }}
        />
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading}
          size="small" pagination={{ pageSize: 15, showSizeChanger: false }} />
      </div>

      <Modal title={editing ? 'Editar proveedor' : 'Nuevo proveedor'}
        open={modal} onCancel={() => setModal(false)}
        onOk={() => form.submit()} okText={editing ? 'Guardar' : 'Crear'}
        confirmLoading={saving} destroyOnClose width={640}
      >
        <Form form={form} layout="vertical" onFinish={onSave} style={{ marginTop: 12 }}>
          <Row gutter={12}>
            <Col span={16}>
              <Form.Item name="name" label="Nombre / Razón social"
                rules={[{ required: true, message: 'El nombre es requerido' }]}>
                <Input placeholder="Nombre del proveedor" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="active" label="Estado" valuePropName="checked" initialValue={true}>
                <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="nrc" label="NRC"><Input placeholder="00000-0" /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="nit" label="NIT"><Input placeholder="0000-000000-000-0" /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="dui" label="DUI"><Input placeholder="00000000-0" /></Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="contact" label="Nombre del contacto">
                <Input placeholder="Persona de contacto" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Teléfono">
                <Input placeholder="0000-0000" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="email" label="Correo electrónico">
                <Input type="email" placeholder="correo@proveedor.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="address" label="Dirección">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="Notas">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
