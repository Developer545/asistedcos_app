'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, Select,
  DatePicker, Space, Tag, Popconfirm, Row, Col,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PersonSimpleRun, PencilSimple, Trash, MagnifyingGlass } from '@phosphor-icons/react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import PageHeader from '@/components/shared/PageHeader';

type Beneficiary = {
  id: string; name: string; dui?: string; birthDate?: string;
  gender?: string; address?: string; phone?: string;
  status: string; program?: string; entryDate: string; exitDate?: string;
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVO: 'success', INACTIVO: 'default', EGRESADO: 'blue',
};

export default function BeneficiariosPage() {
  const [data, setData]         = useState<Beneficiary[]>([]);
  const [loading, setLoading]   = useState(false);
  const [modal, setModal]       = useState(false);
  const [editing, setEditing]   = useState<Beneficiary | null>(null);
  const [saving, setSaving]     = useState(false);
  const [search, setSearch]     = useState('');
  const [filterStatus, setFilter] = useState('');
  const [form]                  = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/beneficiarios?limit=100&search=${search}&status=${filterStatus}`);
      const d = await r.json();
      setData(d.data ?? []);
    } catch { toast.error('Error cargando beneficiarios'); }
    finally { setLoading(false); }
  }, [search, filterStatus]);

  useEffect(() => { load(); }, [load]);

  function openModal(record?: Beneficiary) {
    setEditing(record ?? null);
    form.resetFields();
    if (record) {
      form.setFieldsValue({
        ...record,
        birthDate: record.birthDate ? dayjs(record.birthDate) : null,
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
        birthDate: values.birthDate ? (values.birthDate as dayjs.Dayjs).toISOString() : null,
      };
      const url    = editing ? `/api/beneficiarios/${editing.id}` : '/api/beneficiarios';
      const method = editing ? 'PUT' : 'POST';
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(editing ? 'Beneficiario actualizado' : 'Beneficiario registrado');
      setModal(false);
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  }

  async function onDelete(id: string) {
    try {
      await fetch(`/api/beneficiarios/${id}`, { method: 'DELETE' });
      toast.success('Beneficiario eliminado');
      load();
    } catch { toast.error('Error al eliminar'); }
  }

  const columns: ColumnsType<Beneficiary> = [
    { title: 'Nombre', dataIndex: 'name', ellipsis: true, sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: 'DUI', dataIndex: 'dui', width: 110, render: (v?: string) => v ?? '—' },
    { title: 'Género', dataIndex: 'gender', width: 85, render: (v?: string) => v ?? '—' },
    { title: 'Programa', dataIndex: 'program', ellipsis: true, render: (v?: string) => v ?? '—' },
    { title: 'Teléfono', dataIndex: 'phone', width: 110, render: (v?: string) => v ?? '—' },
    { title: 'Ingreso', dataIndex: 'entryDate', width: 100,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
    { title: 'Estado', dataIndex: 'status', width: 90,
      render: (v: string) => <Tag color={STATUS_COLOR[v]}>{v}</Tag> },
    {
      title: '', width: 80, align: 'center',
      render: (_: unknown, r: Beneficiary) => (
        <Space>
          <Button size="small" icon={<PencilSimple size={13} />} onClick={() => openModal(r)} />
          <Popconfirm title="¿Eliminar beneficiario?" onConfirm={() => onDelete(r.id)} okText="Sí" cancelText="No">
            <Button size="small" danger icon={<Trash size={13} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Beneficiarios" description="Personas atendidas por los programas de la fundación"
        icon={<PersonSimpleRun size={20} />}
        actions={[{ label: 'Nuevo beneficiario', onClick: () => openModal() }]}
      />
      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-default))', borderRadius: 12, padding: 16 }}>
        <Space style={{ marginBottom: 12 }}>
          <Input placeholder="Buscar por nombre..." prefix={<MagnifyingGlass size={14} />}
            value={search} onChange={e => setSearch(e.target.value)} style={{ width: 240 }} />
          <Select allowClear placeholder="Estado" style={{ width: 140 }}
            value={filterStatus || undefined} onChange={(v) => setFilter(v ?? '')}
            options={[
              { value: 'ACTIVO', label: 'Activos' },
              { value: 'INACTIVO', label: 'Inactivos' },
              { value: 'EGRESADO', label: 'Egresados' },
            ]}
          />
        </Space>
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading}
          size="small" pagination={{ pageSize: 15, showSizeChanger: false }} />
      </div>

      <Modal title={editing ? 'Editar beneficiario' : 'Nuevo beneficiario'}
        open={modal} onCancel={() => setModal(false)}
        onOk={() => form.submit()} okText={editing ? 'Guardar' : 'Registrar'}
        confirmLoading={saving} destroyOnClose width={600}
      >
        <Form form={form} layout="vertical" onFinish={onSave} style={{ marginTop: 12 }}>
          <Form.Item name="name" label="Nombre completo"
            rules={[{ required: true, message: 'El nombre es requerido' }]}>
            <Input />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="dui" label="DUI"><Input placeholder="00000000-0" /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="gender" label="Género">
                <Select options={[
                  { value: 'Masculino', label: 'Masculino' },
                  { value: 'Femenino', label: 'Femenino' },
                  { value: 'Otro', label: 'Otro' },
                ]} allowClear />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="birthDate" label="Fecha de nacimiento">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Teléfono">
                <Input placeholder="0000-0000" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="address" label="Dirección">
            <Input />
          </Form.Item>
          <Row gutter={12}>
            <Col span={14}>
              <Form.Item name="program" label="Programa">
                <Input placeholder="Ej. Alimentación, Educación..." />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="status" label="Estado">
                <Select options={[
                  { value: 'ACTIVO', label: 'Activo' },
                  { value: 'INACTIVO', label: 'Inactivo' },
                  { value: 'EGRESADO', label: 'Egresado' },
                ]} />
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
