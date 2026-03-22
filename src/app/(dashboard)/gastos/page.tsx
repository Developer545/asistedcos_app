'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, InputNumber, Select,
  DatePicker, Space, Tag, Popconfirm, Row, Col, Statistic, Card, Tabs,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Receipt, PencilSimple, Trash, Tag as TagIcon, Plus } from '@phosphor-icons/react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import PageHeader from '@/components/shared/PageHeader';

type Category = { id: string; name: string; description?: string; _count?: { expenses: number } };
type Project  = { id: string; name: string };
type Expense  = {
  id: string; description: string; amount: number; date: string;
  status: string; notes?: string;
  category: { id: string; name: string };
  project?: { id: string; name: string } | null;
};

const STATUS_COLOR: Record<string, string> = {
  PENDIENTE: 'warning', APROBADO: 'processing', RECHAZADO: 'error', PAGADO: 'success',
};
const STATUS_LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente', APROBADO: 'Aprobado', RECHAZADO: 'Rechazado', PAGADO: 'Pagado',
};

function fmtUSD(n: number) {
  return new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(n);
}

export default function GastosPage() {
  const [tab, setTab]               = useState('gastos');

  /* Gastos */
  const [data, setData]             = useState<Expense[]>([]);
  const [loading, setLoading]       = useState(false);
  const [modal, setModal]           = useState(false);
  const [editing, setEditing]       = useState<Expense | null>(null);
  const [saving, setSaving]         = useState(false);
  const [form]                      = Form.useForm();
  const [filterStatus, setFilter]   = useState('');

  /* Categorías */
  const [categories, setCategories]   = useState<Category[]>([]);
  const [catLoading, setCatLoading]   = useState(false);
  const [catModal, setCatModal]       = useState(false);
  const [catEditing, setCatEditing]   = useState<Category | null>(null);
  const [catSaving, setCatSaving]     = useState(false);
  const [catForm]                     = Form.useForm();

  /* Proyectos */
  const [projects, setProjects]     = useState<Project[]>([]);

  /* ── Cargas ─────────────────────────────────────────── */
  const loadGastos = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/gastos?limit=100${filterStatus ? `&status=${filterStatus}` : ''}`;
      const r   = await fetch(url);
      const d   = await r.json();
      setData(d.data ?? []);
    } catch { toast.error('Error cargando gastos'); }
    finally { setLoading(false); }
  }, [filterStatus]);

  const loadCategories = useCallback(async () => {
    setCatLoading(true);
    try {
      const r = await fetch('/api/gastos/categorias');
      const d = await r.json();
      setCategories(d.data ?? []);
    } catch { toast.error('Error cargando categorías'); }
    finally { setCatLoading(false); }
  }, []);

  useEffect(() => {
    loadGastos();
    loadCategories();
    fetch('/api/proyectos?limit=100').then(r => r.json()).then(d => setProjects(d.data ?? []));
  }, [loadGastos, loadCategories]);

  /* ── CRUD Gastos ─────────────────────────────────────── */
  function openModal(record?: Expense) {
    setEditing(record ?? null);
    form.resetFields();
    if (record) {
      form.setFieldsValue({
        ...record,
        categoryId: record.category.id,
        projectId:  record.project?.id,
        date: dayjs(record.date),
        amount: Number(record.amount),
      });
    } else {
      form.setFieldsValue({ date: dayjs(), status: 'PENDIENTE' });
    }
    setModal(true);
  }

  async function onSave(values: Record<string, unknown>) {
    setSaving(true);
    try {
      const payload = { ...values, date: (values.date as dayjs.Dayjs).toISOString() };
      const url     = editing ? `/api/gastos/${editing.id}` : '/api/gastos';
      const method  = editing ? 'PUT' : 'POST';
      const res     = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(editing ? 'Gasto actualizado' : 'Gasto registrado');
      setModal(false);
      loadGastos();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  }

  async function onDelete(id: string) {
    try {
      await fetch(`/api/gastos/${id}`, { method: 'DELETE' });
      toast.success('Gasto eliminado');
      loadGastos();
    } catch { toast.error('Error al eliminar'); }
  }

  async function changeStatus(id: string, status: string) {
    try {
      await fetch(`/api/gastos/${id}`, { method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }) });
      toast.success(`Estado: ${STATUS_LABEL[status]}`);
      loadGastos();
    } catch { toast.error('Error al actualizar estado'); }
  }

  /* ── CRUD Categorías ─────────────────────────────────── */
  function openCatModal(record?: Category) {
    setCatEditing(record ?? null);
    catForm.resetFields();
    if (record) catForm.setFieldsValue(record);
    setCatModal(true);
  }

  async function onSaveCat(values: Record<string, unknown>) {
    setCatSaving(true);
    try {
      const url    = catEditing ? `/api/gastos/categorias/${catEditing.id}` : '/api/gastos/categorias';
      const method = catEditing ? 'PUT' : 'POST';
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(catEditing ? 'Categoría actualizada' : 'Categoría creada');
      setCatModal(false);
      loadCategories();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setCatSaving(false); }
  }

  async function onDeleteCat(id: string) {
    try {
      const res = await fetch(`/api/gastos/categorias/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error ?? 'No se puede eliminar');
      toast.success('Categoría eliminada');
      loadCategories();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error al eliminar'); }
  }

  /* ── Stats ───────────────────────────────────────────── */
  const totalPendiente = data.filter(e => e.status === 'PENDIENTE').reduce((s, e) => s + Number(e.amount), 0);
  const totalPagado    = data.filter(e => e.status === 'PAGADO').reduce((s, e) => s + Number(e.amount), 0);

  /* ── Columnas Gastos ─────────────────────────────────── */
  const gastosCols: ColumnsType<Expense> = [
    { title: 'Fecha', dataIndex: 'date', width: 100,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
    { title: 'Descripción', dataIndex: 'description', ellipsis: true },
    { title: 'Categoría', render: (_: unknown, r: Expense) => r.category.name, width: 160, ellipsis: true },
    { title: 'Proyecto', render: (_: unknown, r: Expense) => r.project?.name ?? '—', ellipsis: true },
    { title: 'Monto', dataIndex: 'amount', width: 110, align: 'right',
      render: (v: number) => fmtUSD(Number(v)),
      sorter: (a, b) => Number(a.amount) - Number(b.amount) },
    { title: 'Estado', dataIndex: 'status', width: 120,
      render: (v: string, r: Expense) => (
        <Select size="small" value={v} style={{ width: 120 }}
          onChange={(val) => changeStatus(r.id, val)}
          options={Object.entries(STATUS_LABEL).map(([k, l]) => ({ value: k, label: l }))}
        />
      )},
    {
      title: '', width: 70, align: 'center',
      render: (_: unknown, r: Expense) => (
        <Space>
          <Button size="small" icon={<PencilSimple size={13} />} onClick={() => openModal(r)} />
          <Popconfirm title="¿Eliminar gasto?" onConfirm={() => onDelete(r.id)} okText="Sí" cancelText="No">
            <Button size="small" danger icon={<Trash size={13} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  /* ── Columnas Categorías ─────────────────────────────── */
  const catCols: ColumnsType<Category> = [
    { title: 'Nombre', dataIndex: 'name', ellipsis: true },
    { title: 'Descripción', dataIndex: 'description', ellipsis: true,
      render: (v?: string) => v ?? <span style={{ color: 'hsl(var(--text-muted))' }}>—</span> },
    { title: 'Gastos registrados', width: 140, align: 'center',
      render: (_: unknown, r: Category) => (
        <Tag color={r._count?.expenses ? 'green' : 'default'}>{r._count?.expenses ?? 0}</Tag>
      )},
    {
      title: '', width: 80, align: 'center',
      render: (_: unknown, r: Category) => (
        <Space>
          <Button size="small" icon={<PencilSimple size={13} />} onClick={() => openCatModal(r)} />
          <Popconfirm
            title="¿Eliminar categoría?"
            description={r._count?.expenses ? `Tiene ${r._count.expenses} gastos asociados.` : undefined}
            onConfirm={() => onDeleteCat(r.id)}
            okText="Sí" cancelText="No"
          >
            <Button size="small" danger icon={<Trash size={13} />}
              disabled={!!r._count?.expenses} title={r._count?.expenses ? 'No se puede eliminar: tiene gastos' : ''} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  /* ── Render ──────────────────────────────────────────── */
  return (
    <div>
      <PageHeader
        title="Gastos"
        description="Control de egresos y gastos operativos"
        icon={<Receipt size={20} />}
        actions={tab === 'gastos'
          ? [{ label: 'Registrar gasto', onClick: () => openModal() }]
          : [{ label: 'Nueva categoría', onClick: () => openCatModal(), icon: <Plus size={14} /> }]
        }
      />

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title="Gastos pendientes" value={totalPendiente} prefix="$" precision={2}
              valueStyle={{ color: 'hsl(var(--status-warning))' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title="Gastos pagados" value={totalPagado} prefix="$" precision={2}
              valueStyle={{ color: 'hsl(var(--status-success))' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title="Categorías" value={categories.length}
              suffix={<TagIcon size={16} style={{ marginLeft: 4, opacity: 0.5 }} />} />
          </Card>
        </Col>
      </Row>

      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-default))', borderRadius: 12, padding: '12px 16px 16px' }}>
        <Tabs activeKey={tab} onChange={setTab} items={[
          {
            key: 'gastos', label: 'Gastos',
            children: (
              <>
                <div style={{ marginBottom: 12 }}>
                  <Select allowClear placeholder="Filtrar por estado" style={{ width: 180 }}
                    value={filterStatus || undefined}
                    onChange={(v) => setFilter(v ?? '')}
                    options={[
                      { value: 'PENDIENTE', label: 'Pendientes' },
                      { value: 'APROBADO',  label: 'Aprobados'  },
                      { value: 'PAGADO',    label: 'Pagados'    },
                      { value: 'RECHAZADO', label: 'Rechazados' },
                    ]}
                  />
                </div>
                <Table dataSource={data} columns={gastosCols} rowKey="id" loading={loading}
                  size="small" pagination={{ pageSize: 15, showSizeChanger: false }}
                  summary={rows => (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={4} />
                      <Table.Summary.Cell index={4} align="right">
                        <b>{fmtUSD(rows.reduce((s, r) => s + Number(r.amount), 0))}</b>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={5} colSpan={2} />
                    </Table.Summary.Row>
                  )}
                />
              </>
            ),
          },
          {
            key: 'categorias', label: `Categorías (${categories.length})`,
            children: (
              <Table dataSource={categories} columns={catCols} rowKey="id" loading={catLoading}
                size="small" pagination={false}
              />
            ),
          },
        ]} />
      </div>

      {/* ── Modal Gasto ──────────────────────────────────── */}
      <Modal title={editing ? 'Editar gasto' : 'Registrar gasto'}
        open={modal} onCancel={() => setModal(false)}
        onOk={() => form.submit()} okText={editing ? 'Guardar' : 'Registrar'}
        confirmLoading={saving} destroyOnClose width={560}
      >
        <Form form={form} layout="vertical" onFinish={onSave} style={{ marginTop: 12 }}>
          <Form.Item name="description" label="Descripción"
            rules={[{ required: true, message: 'La descripción es requerida' }]}>
            <Input placeholder="Descripción del gasto" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={14}>
              <Form.Item name="categoryId" label="Categoría"
                rules={[{ required: true, message: 'Selecciona una categoría' }]}>
                <Select
                  showSearch
                  filterOption={(inp, opt) => (opt?.label as string ?? '').toLowerCase().includes(inp.toLowerCase())}
                  options={categories.map(c => ({ value: c.id, label: c.name }))}
                  placeholder="Seleccionar categoría"
                />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="amount" label="Monto (USD)"
                rules={[{ required: true, message: 'Ingresa el monto' }]}>
                <InputNumber min={0.01} precision={2} prefix="$" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="date" label="Fecha"
                rules={[{ required: true, message: 'Selecciona la fecha' }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="projectId" label="Proyecto (opcional)">
                <Select allowClear placeholder="Sin proyecto"
                  options={projects.map(p => ({ value: p.id, label: p.name }))} />
              </Form.Item>
            </Col>
          </Row>
          {editing && (
            <Form.Item name="status" label="Estado">
              <Select options={Object.entries(STATUS_LABEL).map(([k, l]) => ({ value: k, label: l }))} />
            </Form.Item>
          )}
          <Form.Item name="notes" label="Notas">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal Categoría ──────────────────────────────── */}
      <Modal title={catEditing ? 'Editar categoría' : 'Nueva categoría de gasto'}
        open={catModal} onCancel={() => setCatModal(false)}
        onOk={() => catForm.submit()} okText={catEditing ? 'Guardar' : 'Crear'}
        confirmLoading={catSaving} destroyOnClose width={440}
      >
        <Form form={catForm} layout="vertical" onFinish={onSaveCat} style={{ marginTop: 12 }}>
          <Form.Item name="name" label="Nombre de la categoría"
            rules={[{ required: true, message: 'El nombre es requerido' }]}>
            <Input placeholder="Ej. Alimentación, Transporte, Capacitaciones..." />
          </Form.Item>
          <Form.Item name="description" label="Descripción (opcional)">
            <Input.TextArea rows={2} placeholder="Descripción de qué incluye esta categoría..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
