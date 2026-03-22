'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, InputNumber,
  DatePicker, Space, Tag, Popconfirm, Switch, Row, Col,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { FolderOpen, PencilSimple, Trash } from '@phosphor-icons/react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import PageHeader from '@/components/shared/PageHeader';
import CloudinaryUpload from '@/components/shared/CloudinaryUpload';

type Project = {
  id: string; name: string; description?: string;
  startDate?: string; endDate?: string; budget: number;
  active: boolean; createdAt: string;
  _count?: { donations: number; participations: number };
};

function fmtUSD(n: number) {
  return new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(n);
}

export default function ProyectosPage() {
  const [data, setData]         = useState<Project[]>([]);
  const [loading, setLoading]   = useState(false);
  const [modal, setModal]       = useState(false);
  const [editing, setEditing]   = useState<Project | null>(null);
  const [saving, setSaving]     = useState(false);
  const [form]                  = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/proyectos?limit=100');
      const d = await r.json();
      setData(d.data ?? []);
    } catch { toast.error('Error cargando proyectos'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openModal(record?: Project) {
    setEditing(record ?? null);
    form.resetFields();
    if (record) {
      form.setFieldsValue({
        ...record,
        startDate: record.startDate ? dayjs(record.startDate) : null,
        endDate:   record.endDate   ? dayjs(record.endDate)   : null,
        budget:    Number(record.budget),
      });
    } else {
      form.setFieldsValue({ active: true, budget: 0 });
    }
    setModal(true);
  }

  async function onSave(values: Record<string, unknown>) {
    setSaving(true);
    try {
      const payload = {
        ...values,
        startDate: values.startDate ? (values.startDate as dayjs.Dayjs).toISOString() : null,
        endDate:   values.endDate   ? (values.endDate   as dayjs.Dayjs).toISOString() : null,
      };
      const url    = editing ? `/api/proyectos/${editing.id}` : '/api/proyectos';
      const method = editing ? 'PUT' : 'POST';
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(editing ? 'Proyecto actualizado' : 'Proyecto creado');
      setModal(false);
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  }

  async function onDelete(id: string) {
    try {
      await fetch(`/api/proyectos/${id}`, { method: 'DELETE' });
      toast.success('Proyecto eliminado');
      load();
    } catch { toast.error('Error al eliminar'); }
  }

  const columns: ColumnsType<Project> = [
    { title: 'Nombre', dataIndex: 'name', ellipsis: true, sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: 'Descripción', dataIndex: 'description', ellipsis: true,
      render: (v?: string) => v ?? <span style={{ color: 'hsl(var(--text-muted))' }}>—</span> },
    { title: 'Inicio', dataIndex: 'startDate', width: 100,
      render: (v?: string) => v ? dayjs(v).format('DD/MM/YY') : '—' },
    { title: 'Fin', dataIndex: 'endDate', width: 100,
      render: (v?: string) => v ? dayjs(v).format('DD/MM/YY') : '—' },
    { title: 'Presupuesto', dataIndex: 'budget', width: 120, align: 'right',
      render: (v: number) => fmtUSD(Number(v)) },
    { title: 'Donaciones', width: 95, align: 'center',
      render: (_: unknown, r: Project) => <Tag color="green">{r._count?.donations ?? 0}</Tag> },
    { title: 'Estado', dataIndex: 'active', width: 90,
      render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? 'Activo' : 'Inactivo'}</Tag> },
    {
      title: '', width: 80, align: 'center',
      render: (_: unknown, r: Project) => (
        <Space>
          <Button size="small" icon={<PencilSimple size={13} />} onClick={() => openModal(r)} />
          <Popconfirm title="¿Eliminar proyecto?" onConfirm={() => onDelete(r.id)} okText="Sí" cancelText="No">
            <Button size="small" danger icon={<Trash size={13} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Proyectos"
        description="Gestión de proyectos y programas de la ONG"
        icon={<FolderOpen size={20} />}
        actions={[{ label: 'Nuevo proyecto', onClick: () => openModal() }]}
      />

      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-default))', borderRadius: 12, padding: 16 }}>
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading}
          size="small" pagination={{ pageSize: 15, showSizeChanger: false }}
        />
      </div>

      <Modal title={editing ? 'Editar proyecto' : 'Nuevo proyecto'}
        open={modal} onCancel={() => setModal(false)}
        onOk={() => form.submit()} okText={editing ? 'Guardar' : 'Crear'}
        confirmLoading={saving} destroyOnClose width={620}
      >
        <Form form={form} layout="vertical" onFinish={onSave} style={{ marginTop: 12 }}>
          <Form.Item name="name" label="Nombre del proyecto"
            rules={[{ required: true, message: 'El nombre es requerido' }]}>
            <Input placeholder="Ej. Programa de Alimentación 2026" />
          </Form.Item>
          <Form.Item name="description" label="Descripción">
            <Input.TextArea rows={2} placeholder="Descripción del proyecto..." />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="startDate" label="Fecha de inicio">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endDate" label="Fecha de fin">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="budget" label="Presupuesto (USD)">
                <InputNumber min={0} precision={2} prefix="$" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="active" label="Estado" valuePropName="checked">
                <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="coverImage" label="Imagen de portada (aparece en el sitio web)">
            <CloudinaryUpload
              folder="asistedcos/proyectos"
              label="Subir foto del proyecto"
              aspectHint="Proporción 16:9 recomendada"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
