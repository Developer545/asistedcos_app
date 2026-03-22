'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, Select,
  Space, Tag, Popconfirm, Avatar,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { HandHeart, PencilSimple, Trash, MagnifyingGlass } from '@phosphor-icons/react';
import { toast } from 'sonner';
import PageHeader from '@/components/shared/PageHeader';

type Volunteer = {
  id: string; name: string; dui?: string; email?: string;
  phone?: string; skills?: string; status: string;
  _count?: { participations: number };
};

export default function VoluntariosPage() {
  const [data, setData]       = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState<Volunteer | null>(null);
  const [saving, setSaving]   = useState(false);
  const [search, setSearch]   = useState('');
  const [form]                = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/voluntarios?limit=100&search=${search}`);
      const d = await r.json();
      setData(d.data ?? []);
    } catch { toast.error('Error cargando voluntarios'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  function openModal(record?: Volunteer) {
    setEditing(record ?? null);
    form.resetFields();
    if (record) form.setFieldsValue(record);
    else form.setFieldsValue({ status: 'ACTIVO' });
    setModal(true);
  }

  async function onSave(values: Record<string, unknown>) {
    setSaving(true);
    try {
      const url    = editing ? `/api/voluntarios/${editing.id}` : '/api/voluntarios';
      const method = editing ? 'PUT' : 'POST';
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(editing ? 'Voluntario actualizado' : 'Voluntario registrado');
      setModal(false);
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  }

  async function onDelete(id: string) {
    try {
      await fetch(`/api/voluntarios/${id}`, { method: 'DELETE' });
      toast.success('Voluntario eliminado');
      load();
    } catch { toast.error('Error al eliminar'); }
  }

  const columns: ColumnsType<Volunteer> = [
    {
      title: 'Nombre', dataIndex: 'name', ellipsis: true,
      render: (v: string) => (
        <Space>
          <Avatar size={26} style={{ background: 'hsl(var(--brand-secondary))', fontSize: 10 }}>
            {v.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
          </Avatar>
          {v}
        </Space>
      ),
    },
    { title: 'DUI', dataIndex: 'dui', width: 110, render: (v?: string) => v ?? '—' },
    { title: 'Teléfono', dataIndex: 'phone', width: 110, render: (v?: string) => v ?? '—' },
    { title: 'Habilidades', dataIndex: 'skills', ellipsis: true, render: (v?: string) => v ?? '—' },
    { title: 'Participaciones', width: 110, align: 'center',
      render: (_: unknown, r: Volunteer) => <Tag color="blue">{r._count?.participations ?? 0}</Tag> },
    { title: 'Estado', dataIndex: 'status', width: 90,
      render: (v: string) => <Tag color={v === 'ACTIVO' ? 'success' : 'default'}>{v}</Tag> },
    {
      title: '', width: 80, align: 'center',
      render: (_: unknown, r: Volunteer) => (
        <Space>
          <Button size="small" icon={<PencilSimple size={13} />} onClick={() => openModal(r)} />
          <Popconfirm title="¿Eliminar voluntario?" onConfirm={() => onDelete(r.id)} okText="Sí" cancelText="No">
            <Button size="small" danger icon={<Trash size={13} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Voluntarios" description="Registro de voluntarios y participaciones"
        icon={<HandHeart size={20} />}
        actions={[{ label: 'Nuevo voluntario', onClick: () => openModal() }]}
      />
      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-default))', borderRadius: 12, padding: 16 }}>
        <Input placeholder="Buscar voluntario..." prefix={<MagnifyingGlass size={14} />}
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: 280, marginBottom: 12 }} />
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading}
          size="small" pagination={{ pageSize: 15, showSizeChanger: false }} />
      </div>

      <Modal title={editing ? 'Editar voluntario' : 'Nuevo voluntario'}
        open={modal} onCancel={() => setModal(false)}
        onOk={() => form.submit()} okText={editing ? 'Guardar' : 'Registrar'}
        confirmLoading={saving} destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={onSave} style={{ marginTop: 12 }}>
          <Form.Item name="name" label="Nombre completo"
            rules={[{ required: true, message: 'El nombre es requerido' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="dui" label="DUI"><Input placeholder="00000000-0" /></Form.Item>
          <Form.Item name="email" label="Correo"><Input type="email" /></Form.Item>
          <Form.Item name="phone" label="Teléfono"><Input placeholder="0000-0000" /></Form.Item>
          <Form.Item name="skills" label="Habilidades / Área de apoyo">
            <Input placeholder="Ej. Educación, Salud, Logística..." />
          </Form.Item>
          <Form.Item name="status" label="Estado">
            <Select options={[{ value: 'ACTIVO', label: 'Activo' }, { value: 'INACTIVO', label: 'Inactivo' }]} />
          </Form.Item>
          <Form.Item name="notes" label="Notas">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
