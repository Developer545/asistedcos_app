'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, DatePicker,
  Space, Popconfirm, Select, Tag, Row, Col,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Scroll, PencilSimple, Trash, MagnifyingGlass, Eye } from '@phosphor-icons/react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import PageHeader from '@/components/shared/PageHeader';

type Acta = {
  id: string; number: string; title: string; date: string;
  attendees: string; agenda: string; agreements: string; fileUrl?: string;
  createdAt: string;
};

const YEARS = Array.from({ length: 6 }, (_, i) => {
  const y = new Date().getFullYear() - i;
  return { value: String(y), label: String(y) };
});

export default function ActasPage() {
  const [data, setData]       = useState<Acta[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal]     = useState(false);
  const [viewModal, setView]  = useState<Acta | null>(null);
  const [editing, setEditing] = useState<Acta | null>(null);
  const [saving, setSaving]   = useState(false);
  const [search, setSearch]   = useState('');
  const [year, setYear]       = useState('');
  const [form]                = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/actas?limit=100&search=${search}&year=${year}`);
      const d = await r.json();
      setData(d.data ?? []);
    } catch { toast.error('Error cargando actas'); }
    finally { setLoading(false); }
  }, [search, year]);

  useEffect(() => { load(); }, [load]);

  function openModal(record?: Acta) {
    setEditing(record ?? null);
    form.resetFields();
    if (record) {
      form.setFieldsValue({ ...record, date: dayjs(record.date) });
    } else {
      form.setFieldsValue({ date: dayjs() });
    }
    setModal(true);
  }

  async function onSave(values: Record<string, unknown>) {
    setSaving(true);
    try {
      const payload = { ...values, date: (values.date as dayjs.Dayjs).toISOString() };
      const url     = editing ? `/api/actas/${editing.id}` : '/api/actas';
      const method  = editing ? 'PUT' : 'POST';
      const res     = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(editing ? 'Acta actualizada' : 'Acta registrada');
      setModal(false);
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  }

  async function onDelete(id: string) {
    try {
      await fetch(`/api/actas/${id}`, { method: 'DELETE' });
      toast.success('Acta eliminada');
      load();
    } catch { toast.error('Error al eliminar'); }
  }

  const columns: ColumnsType<Acta> = [
    { title: 'N°', dataIndex: 'number', width: 100,
      render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: 'Título', dataIndex: 'title', ellipsis: true,
      render: (v: string, r: Acta) => (
        <Button type="link" size="small" onClick={() => setView(r)} style={{ padding: 0, textAlign: 'left' }}>
          {v}
        </Button>
      )},
    { title: 'Fecha', dataIndex: 'date', width: 110,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
    { title: 'Registrada', dataIndex: 'createdAt', width: 110,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
    {
      title: '', width: 100, align: 'center',
      render: (_: unknown, r: Acta) => (
        <Space>
          <Button size="small" icon={<Eye size={13} />} onClick={() => setView(r)} />
          <Button size="small" icon={<PencilSimple size={13} />} onClick={() => openModal(r)} />
          <Popconfirm title="¿Eliminar acta?" onConfirm={() => onDelete(r.id)} okText="Sí" cancelText="No">
            <Button size="small" danger icon={<Trash size={13} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Actas"
        description="Registro de actas de sesiones, asambleas y reuniones"
        icon={<Scroll size={20} />}
        actions={[{ label: 'Nueva acta', onClick: () => openModal() }]}
      />

      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-default))', borderRadius: 12, padding: 16 }}>
        <Space style={{ marginBottom: 14 }}>
          <Input
            placeholder="Buscar por número o título..."
            prefix={<MagnifyingGlass size={14} />}
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: 280 }}
          />
          <Select
            allowClear placeholder="Año" style={{ width: 110 }}
            value={year || undefined} onChange={(v) => setYear(v ?? '')}
            options={YEARS}
          />
        </Space>

        <Table dataSource={data} columns={columns} rowKey="id" loading={loading}
          size="small" pagination={{ pageSize: 15, showSizeChanger: false }} />
      </div>

      {/* ── Modal Formulario ──────────────────────────────── */}
      <Modal title={editing ? 'Editar acta' : 'Nueva acta'}
        open={modal} onCancel={() => setModal(false)}
        onOk={() => form.submit()} okText={editing ? 'Guardar' : 'Registrar'}
        confirmLoading={saving} destroyOnClose width={680}
      >
        <Form form={form} layout="vertical" onFinish={onSave} style={{ marginTop: 12 }}>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="number" label="N° de Acta"
                rules={[{ required: true, message: 'Requerido' }]}>
                <Input placeholder="Ej. 001-2026" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="date" label="Fecha de sesión"
                rules={[{ required: true, message: 'Requerido' }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="title" label="Título / Tipo de sesión"
            rules={[{ required: true, message: 'El título es requerido' }]}>
            <Input placeholder="Ej. Sesión Ordinaria de Junta Directiva" />
          </Form.Item>
          <Form.Item name="attendees" label="Asistentes">
            <Input.TextArea rows={2} placeholder="Lista de personas presentes..." />
          </Form.Item>
          <Form.Item name="agenda" label="Agenda / Puntos tratados"
            rules={[{ required: true, message: 'La agenda es requerida' }]}>
            <Input.TextArea rows={3} placeholder="Temas de la agenda..." />
          </Form.Item>
          <Form.Item name="agreements" label="Acuerdos y resoluciones"
            rules={[{ required: true, message: 'Los acuerdos son requeridos' }]}>
            <Input.TextArea rows={3} placeholder="Acuerdos tomados en la sesión..." />
          </Form.Item>
          <Form.Item name="fileUrl" label="URL del acta escaneada (opcional)">
            <Input placeholder="https://..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal Vista ───────────────────────────────────── */}
      <Modal
        title={`Acta N° ${viewModal?.number ?? ''} — ${viewModal?.title ?? ''}`}
        open={!!viewModal} onCancel={() => setView(null)}
        footer={[
          <Button key="close" onClick={() => setView(null)}>Cerrar</Button>,
          viewModal?.fileUrl && (
            <Button key="pdf" type="primary" href={viewModal.fileUrl} target="_blank">
              Ver PDF
            </Button>
          ),
        ]}
        width={700}
      >
        {viewModal && (
          <div style={{ lineHeight: 1.8 }}>
            <p><b>Fecha:</b> {dayjs(viewModal.date).format('DD [de] MMMM [de] YYYY')}</p>
            <p><b>Asistentes:</b></p>
            <p style={{ whiteSpace: 'pre-wrap', marginLeft: 12 }}>{viewModal.attendees || '—'}</p>
            <p><b>Agenda:</b></p>
            <p style={{ whiteSpace: 'pre-wrap', marginLeft: 12 }}>{viewModal.agenda || '—'}</p>
            <p><b>Acuerdos:</b></p>
            <p style={{ whiteSpace: 'pre-wrap', marginLeft: 12 }}>{viewModal.agreements || '—'}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
