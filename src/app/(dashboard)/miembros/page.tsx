'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, Select,
  DatePicker, Space, Tag, Popconfirm, Avatar, Row, Col,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Users, PencilSimple, Trash } from '@phosphor-icons/react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import PageHeader from '@/components/shared/PageHeader';

type Member = {
  id: string; name: string; position: string;
  dui?: string; nit?: string; email?: string; phone?: string;
  status: string; startDate?: string; notes?: string;
};

const STATUS_COLOR: Record<string, string> = { ACTIVO: 'success', INACTIVO: 'default' };

export default function MiembrosPage() {
  const [data, setData]       = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [saving, setSaving]   = useState(false);
  const [form]                = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/miembros?limit=100');
      const d = await r.json();
      setData(d.data ?? []);
    } catch { toast.error('Error cargando miembros'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openModal(record?: Member) {
    setEditing(record ?? null);
    form.resetFields();
    if (record) {
      form.setFieldsValue({
        ...record,
        startDate: record.startDate ? dayjs(record.startDate) : null,
      });
    } else {
      form.setFieldsValue({ status: 'ACTIVO' });
    }
    setModal(true);
  }

  async function onSave(values: Record<string, unknown>) {
    setSaving(true);
    try {
      const payload = {
        ...values,
        startDate: values.startDate ? (values.startDate as dayjs.Dayjs).toISOString() : null,
      };
      const url    = editing ? `/api/miembros/${editing.id}` : '/api/miembros';
      const method = editing ? 'PUT' : 'POST';
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(editing ? 'Miembro actualizado' : 'Miembro registrado');
      setModal(false);
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  }

  async function onDelete(id: string) {
    try {
      await fetch(`/api/miembros/${id}`, { method: 'DELETE' });
      toast.success('Miembro eliminado');
      load();
    } catch { toast.error('Error al eliminar'); }
  }

  const columns: ColumnsType<Member> = [
    {
      title: 'Nombre', dataIndex: 'name', ellipsis: true,
      render: (v: string) => (
        <Space>
          <Avatar size={28} style={{ background: 'hsl(var(--brand-primary))', fontSize: 11 }}>
            {v.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
          </Avatar>
          {v}
        </Space>
      ),
    },
    { title: 'Cargo', dataIndex: 'position', ellipsis: true },
    { title: 'DUI', dataIndex: 'dui', width: 110, render: (v?: string) => v ?? '—' },
    { title: 'Teléfono', dataIndex: 'phone', width: 110, render: (v?: string) => v ?? '—' },
    { title: 'Correo', dataIndex: 'email', ellipsis: true, render: (v?: string) => v ?? '—' },
    { title: 'Inicio', dataIndex: 'startDate', width: 100,
      render: (v?: string) => v ? dayjs(v).format('DD/MM/YY') : '—' },
    { title: 'Estado', dataIndex: 'status', width: 90,
      render: (v: string) => <Tag color={STATUS_COLOR[v]}>{v}</Tag> },
    {
      title: '', width: 80, align: 'center',
      render: (_: unknown, r: Member) => (
        <Space>
          <Button size="small" icon={<PencilSimple size={13} />} onClick={() => openModal(r)} />
          <Popconfirm title="¿Eliminar miembro?" onConfirm={() => onDelete(r.id)} okText="Sí" cancelText="No">
            <Button size="small" danger icon={<Trash size={13} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Miembros"
        description="Junta Directiva y personal de la fundación"
        icon={<Users size={20} />}
        actions={[{ label: 'Nuevo miembro', onClick: () => openModal() }]}
      />
      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-default))', borderRadius: 12, padding: 16 }}>
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading}
          size="small" pagination={{ pageSize: 15, showSizeChanger: false }} />
      </div>

      <Modal title={editing ? 'Editar miembro' : 'Nuevo miembro'}
        open={modal} onCancel={() => setModal(false)}
        onOk={() => form.submit()} okText={editing ? 'Guardar' : 'Registrar'}
        confirmLoading={saving} destroyOnClose width={600}
      >
        <Form form={form} layout="vertical" onFinish={onSave} style={{ marginTop: 12 }}>
          <Row gutter={12}>
            <Col span={14}>
              <Form.Item name="name" label="Nombre completo"
                rules={[{ required: true, message: 'El nombre es requerido' }]}>
                <Input placeholder="Nombres y apellidos" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="status" label="Estado">
                <Select options={[
                  { value: 'ACTIVO', label: 'Activo' },
                  { value: 'INACTIVO', label: 'Inactivo' },
                ]} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="position" label="Cargo / Función"
            rules={[{ required: true, message: 'El cargo es requerido' }]}>
            <Input placeholder="Ej. Presidenta, Secretaria, Tesorera..." />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="dui" label="DUI"><Input placeholder="00000000-0" /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="nit" label="NIT"><Input placeholder="0000-000000-000-0" /></Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="email" label="Correo electrónico">
                <Input type="email" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Teléfono">
                <Input placeholder="0000-0000" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="startDate" label="Fecha de inicio en cargo">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="notes" label="Notas">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
