'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, InputNumber,
  Space, Tag, Popconfirm, Row, Col, Tabs, Progress,
  Alert, Empty, Spin, Card, Divider,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  Plus, PencilSimple, Trash, ChartBar, ArrowUp, ArrowDown,
  Eye,
} from '@phosphor-icons/react';
import { Wallet } from '@phosphor-icons/react';
import { toast } from 'sonner';
import PageHeader from '@/components/shared/PageHeader';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, Legend, ResponsiveContainer } from 'recharts';

// Types
type BudgetLine = {
  id?: string; tipo: 'ingreso' | 'gasto'; categoria: string;
  descripcion?: string; monto: number; orden: number;
};
type Budget = {
  id: string; nombre: string; anio: number; descripcion?: string;
  estado: string; totalIngresos: number; totalGastos: number;
  lineas: BudgetLine[]; createdAt: string;
};
type Comparacion = {
  budget: { presupuestoIngresos: number; presupuestoGastos: number; presupuestoNeto: number; lineas: BudgetLine[] };
  real:   { ingresos: number; gastos: number; neto: number; gastosPorCategoria: Record<string, number> };
  variacion: { ingresos: number; gastos: number; neto: number; ingresosPorc: number; gastosPorc: number };
};

const ESTADO_COLOR: Record<string, string> = { Borrador: 'default', Aprobado: 'success', Cerrado: 'processing' };
const CATEGORIAS_INGRESO = ['Donaciones nacionales','Donaciones internacionales','Fondos de cooperación','Subvenciones','Venta de servicios','Otros ingresos'];
const CATEGORIAS_GASTO   = ['Planilla','Materiales','Transporte','Alquiler','Servicios públicos','Equipos','Capacitación','Comunicaciones','Gastos administrativos','Otros gastos'];

function fmtUSD(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function VariacionTag({ porc }: { porc: number }) {
  if (porc >= 95 && porc <= 105) return <Tag color="success">{porc}% ✓</Tag>;
  if (porc > 105) return <Tag color="warning">{porc}% ↑</Tag>;
  return <Tag color="error">{porc}% ↓</Tag>;
}

export default function PresupuestoPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [lineas, setLineas] = useState<BudgetLine[]>([]);

  // Comparison view
  const [compModal, setCompModal] = useState(false);
  const [compLoading, setCompLoading] = useState(false);
  const [comp, setComp] = useState<Comparacion | null>(null);
  const [compBudget, setCompBudget] = useState<Budget | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/presupuesto');
      const d = await r.json();
      setBudgets(d.data ?? []);
    } catch { toast.error('Error cargando presupuestos'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openModal(b?: Budget) {
    setEditing(b ?? null);
    if (b) {
      form.setFieldsValue({ nombre: b.nombre, anio: b.anio, descripcion: b.descripcion, estado: b.estado });
      setLineas(b.lineas.map(l => ({ ...l, monto: Number(l.monto) })));
    } else {
      form.resetFields();
      form.setFieldValue('anio', new Date().getFullYear());
      form.setFieldValue('estado', 'Borrador');
      setLineas([]);
    }
    setModal(true);
  }

  function addLinea(tipo: 'ingreso' | 'gasto') {
    setLineas(prev => [...prev, { tipo, categoria: '', monto: 0, orden: prev.length }]);
  }

  function updateLinea(idx: number, field: string, value: unknown) {
    setLineas(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  }

  function removeLinea(idx: number) {
    setLineas(prev => prev.filter((_, i) => i !== idx));
  }

  async function onFinish(vals: Record<string, unknown>) {
    setSaving(true);
    try {
      const url    = editing ? `/api/presupuesto/${editing.id}` : '/api/presupuesto';
      const method = editing ? 'PUT' : 'POST';
      const r = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...vals, lineas }),
      });
      if (!r.ok) throw new Error('Error guardando');
      toast.success(editing ? 'Presupuesto actualizado' : 'Presupuesto creado');
      setModal(false);
      load();
    } catch { toast.error('Error guardando presupuesto'); }
    finally { setSaving(false); }
  }

  async function deleteBudget(id: string) {
    try {
      await fetch(`/api/presupuesto/${id}`, { method: 'DELETE' });
      toast.success('Presupuesto eliminado');
      load();
    } catch { toast.error('Error eliminando'); }
  }

  async function openComp(b: Budget) {
    setCompBudget(b);
    setCompModal(true);
    setCompLoading(true);
    setComp(null);
    try {
      const r = await fetch(`/api/presupuesto/${b.id}/comparacion`);
      const d = await r.json();
      setComp(d.data);
    } catch { toast.error('Error cargando comparación'); }
    finally { setCompLoading(false); }
  }

  const columns: ColumnsType<Budget> = [
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', render: (v, r) => (
      <div>
        <div style={{ fontWeight: 600 }}>{v}</div>
        <div style={{ fontSize: 11, color: 'hsl(var(--text-muted))' }}>{r.anio}</div>
      </div>
    )},
    { title: 'Ingresos', dataIndex: 'totalIngresos', key: 'ing', align: 'right',
      render: v => <span style={{ color: '#16a34a', fontWeight: 600 }}>{fmtUSD(Number(v))}</span> },
    { title: 'Gastos', dataIndex: 'totalGastos', key: 'gas', align: 'right',
      render: v => <span style={{ color: '#dc2626', fontWeight: 600 }}>{fmtUSD(Number(v))}</span> },
    { title: 'Superávit / Déficit', key: 'neto', align: 'right', render: (_, r) => {
      const neto = Number(r.totalIngresos) - Number(r.totalGastos);
      return <span style={{ color: neto >= 0 ? '#16a34a' : '#dc2626', fontWeight: 700 }}>{fmtUSD(neto)}</span>;
    }},
    { title: 'Estado', dataIndex: 'estado', key: 'estado', align: 'center',
      render: v => <Tag color={ESTADO_COLOR[v] ?? 'default'}>{v}</Tag> },
    { title: 'Líneas', key: 'lineas', align: 'center',
      render: (_, r) => <Tag>{r.lineas?.length ?? 0}</Tag> },
    { title: 'Acciones', key: 'acc', align: 'right', render: (_, r) => (
      <Space>
        <Button size="small" icon={<Eye size={13} />} onClick={() => openComp(r)}>Ver comparación</Button>
        <Button size="small" icon={<PencilSimple size={13} />} onClick={() => openModal(r)} />
        <Popconfirm title="¿Eliminar presupuesto?" onConfirm={() => deleteBudget(r.id)}>
          <Button size="small" danger icon={<Trash size={13} />} />
        </Popconfirm>
      </Space>
    )},
  ];

  const totalPresupuestado = budgets.reduce((s, b) => s + Number(b.totalIngresos), 0);
  const totalGastado       = budgets.reduce((s, b) => s + Number(b.totalGastos), 0);

  return (
    <>
      <PageHeader
        title="Presupuesto"
        icon={<ChartBar size={22} />}
        description="Planificación presupuestaria anual — ingresos proyectados vs gastos ejecutados"
        actions={[{ label: 'Nuevo presupuesto', onClick: () => openModal() }]}
      />

      {/* KPIs */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {[
          { title: 'Total presupuestado (ingresos)', value: fmtUSD(totalPresupuestado), color: '#16a34a' },
          { title: 'Total presupuestado (gastos)',   value: fmtUSD(totalGastado),       color: '#dc2626' },
          { title: 'Presupuestos activos',           value: budgets.filter(b => b.estado === 'Aprobado').length, color: '#2563eb' },
          { title: 'Años cubiertos',                 value: new Set(budgets.map(b => b.anio)).size, color: '#7c3aed' },
        ].map((k, i) => (
          <Col span={6} key={i}>
            <Card size="small" style={{ borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: 'hsl(var(--text-muted))', marginBottom: 4 }}>{k.title}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
            </Card>
          </Col>
        ))}
      </Row>

      <Table
        dataSource={budgets} columns={columns} rowKey="id"
        loading={loading} pagination={{ pageSize: 10 }}
        locale={{ emptyText: <Empty description="No hay presupuestos. Crea el primero." /> }}
      />

      {/* ── Create / Edit Modal ── */}
      <Modal
        title={editing ? 'Editar presupuesto' : 'Nuevo presupuesto'}
        open={modal} onCancel={() => setModal(false)} footer={null} width={860}
        styles={{ body: { maxHeight: '78vh', overflowY: 'auto' } }}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item name="nombre" label="Nombre del presupuesto" rules={[{ required: true }]}>
                <Input placeholder="Ej: Presupuesto Anual 2026" maxLength={200} />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="anio" label="Año" rules={[{ required: true }]}>
                <InputNumber min={2000} max={2100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="estado" label="Estado">
                <Select options={['Borrador','Aprobado','Cerrado'].map(v => ({ value: v, label: v }))} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="descripcion" label="Descripción (opcional)">
                <Input.TextArea rows={2} maxLength={500} />
              </Form.Item>
            </Col>
          </Row>

          {/* Líneas de ingresos */}
          <Divider>Ingresos presupuestados</Divider>
          {lineas.filter(l => l.tipo === 'ingreso').length === 0 && (
            <Alert message="No hay líneas de ingreso. Agrega al menos una." type="info" showIcon style={{ marginBottom: 12 }} />
          )}
          {lineas.map((l, idx) => l.tipo !== 'ingreso' ? null : (
            <Row gutter={8} key={idx} align="middle" style={{ marginBottom: 8 }}>
              <Col span={9}>
                <Select
                  style={{ width: '100%' }} placeholder="Categoría" value={l.categoria || undefined}
                  onChange={v => updateLinea(idx, 'categoria', v)}
                  options={CATEGORIAS_INGRESO.map(c => ({ value: c, label: c }))}
                  showSearch allowClear
                />
              </Col>
              <Col span={9}>
                <Input placeholder="Descripción (opcional)" value={l.descripcion ?? ''} maxLength={200}
                  onChange={e => updateLinea(idx, 'descripcion', e.target.value)} />
              </Col>
              <Col span={5}>
                <InputNumber
                  style={{ width: '100%' }} min={0} precision={2} placeholder="Monto $"
                  value={l.monto} onChange={v => updateLinea(idx, 'monto', v ?? 0)}
                  formatter={v => `$ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                />
              </Col>
              <Col span={1}>
                <Button danger size="small" icon={<Trash size={12} />} onClick={() => removeLinea(idx)} />
              </Col>
            </Row>
          ))}
          <Button icon={<Plus size={13} />} onClick={() => addLinea('ingreso')} style={{ marginBottom: 16, color: '#16a34a', borderColor: '#16a34a' }}>
            Agregar línea de ingreso
          </Button>

          {/* Líneas de gastos */}
          <Divider>Gastos presupuestados</Divider>
          {lineas.filter(l => l.tipo === 'gasto').length === 0 && (
            <Alert message="No hay líneas de gasto. Agrega al menos una." type="info" showIcon style={{ marginBottom: 12 }} />
          )}
          {lineas.map((l, idx) => l.tipo !== 'gasto' ? null : (
            <Row gutter={8} key={idx} align="middle" style={{ marginBottom: 8 }}>
              <Col span={9}>
                <Select
                  style={{ width: '100%' }} placeholder="Categoría" value={l.categoria || undefined}
                  onChange={v => updateLinea(idx, 'categoria', v)}
                  options={CATEGORIAS_GASTO.map(c => ({ value: c, label: c }))}
                  showSearch allowClear
                />
              </Col>
              <Col span={9}>
                <Input placeholder="Descripción (opcional)" value={l.descripcion ?? ''} maxLength={200}
                  onChange={e => updateLinea(idx, 'descripcion', e.target.value)} />
              </Col>
              <Col span={5}>
                <InputNumber
                  style={{ width: '100%' }} min={0} precision={2} placeholder="Monto $"
                  value={l.monto} onChange={v => updateLinea(idx, 'monto', v ?? 0)}
                  formatter={v => `$ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                />
              </Col>
              <Col span={1}>
                <Button danger size="small" icon={<Trash size={12} />} onClick={() => removeLinea(idx)} />
              </Col>
            </Row>
          ))}
          <Button icon={<Plus size={13} />} onClick={() => addLinea('gasto')} style={{ marginBottom: 16, color: '#dc2626', borderColor: '#dc2626' }}>
            Agregar línea de gasto
          </Button>

          {/* Summary bar */}
          {lineas.length > 0 && (() => {
            const ing = lineas.filter(l=>l.tipo==='ingreso').reduce((s,l)=>s+Number(l.monto),0);
            const gas = lineas.filter(l=>l.tipo==='gasto').reduce((s,l)=>s+Number(l.monto),0);
            const net = ing - gas;
            return (
              <Alert
                type={net >= 0 ? 'success' : 'error'}
                showIcon
                icon={net >= 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                message={
                  <span>
                    Ingresos: <strong>{fmtUSD(ing)}</strong> — Gastos: <strong>{fmtUSD(gas)}</strong> — {net >= 0 ? 'Superávit' : 'Déficit'}: <strong>{fmtUSD(Math.abs(net))}</strong>
                  </span>
                }
                style={{ marginBottom: 16 }}
              />
            );
          })()}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              {editing ? 'Guardar cambios' : 'Crear presupuesto'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ── Comparación Modal ── */}
      <Modal
        title={compBudget ? `Comparación: ${compBudget.nombre}` : 'Comparación'}
        open={compModal} onCancel={() => setCompModal(false)} footer={null} width={860}
        styles={{ body: { maxHeight: '80vh', overflowY: 'auto' } }}
      >
        <Spin spinning={compLoading}>
          {!comp && !compLoading && <Empty description="No se pudo cargar la comparación" />}
          {comp && (
            <>
              {/* KPI row */}
              <Row gutter={12} style={{ marginBottom: 24 }}>
                {[
                  { label: 'Ingresos presupuestados', val: comp.budget.presupuestoIngresos, color: '#16a34a' },
                  { label: 'Ingresos reales',         val: comp.real.ingresos,              color: '#22c55e' },
                  { label: 'Gastos presupuestados',   val: comp.budget.presupuestoGastos,   color: '#dc2626' },
                  { label: 'Gastos reales',           val: comp.real.gastos,                color: '#f97316' },
                ].map((k, i) => (
                  <Col span={6} key={i}>
                    <Card size="small" style={{ borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: 'hsl(var(--text-muted))', marginBottom: 4 }}>{k.label}</div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: k.color }}>{fmtUSD(k.val)}</div>
                    </Card>
                  </Col>
                ))}
              </Row>

              {/* Progress bars */}
              <Card size="small" style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span>Ejecución de ingresos</span>
                    <VariacionTag porc={comp.variacion.ingresosPorc} />
                  </div>
                  <Progress percent={Math.min(100, comp.variacion.ingresosPorc)} strokeColor="#16a34a" />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span>Ejecución de gastos</span>
                    <VariacionTag porc={comp.variacion.gastosPorc} />
                  </div>
                  <Progress percent={Math.min(100, comp.variacion.gastosPorc)} strokeColor="#dc2626" />
                </div>
              </Card>

              {/* Bar chart */}
              <Card size="small" title="Presupuestado vs Real" style={{ marginBottom: 16 }}>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={[
                    { name: 'Ingresos', Presupuestado: comp.budget.presupuestoIngresos, Real: comp.real.ingresos },
                    { name: 'Gastos',   Presupuestado: comp.budget.presupuestoGastos,   Real: comp.real.gastos },
                    { name: 'Neto',     Presupuestado: comp.budget.presupuestoNeto,     Real: comp.real.neto },
                  ]} barCategoryGap="30%">
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={v => '$' + (Number(v)/1000).toFixed(0)+'k'} tick={{ fontSize: 11 }} />
                    <RTooltip formatter={(v) => fmtUSD(Number(v))} />
                    <Legend />
                    <Bar dataKey="Presupuestado" fill="#93c5fd" radius={[4,4,0,0]} />
                    <Bar dataKey="Real" fill="#2563eb" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Line items table */}
              <Table
                dataSource={comp.budget.lineas}
                rowKey={(r, i) => r.id ?? String(i)}
                size="small"
                pagination={false}
                columns={[
                  { title: 'Tipo', dataIndex: 'tipo', render: v => <Tag color={v==='ingreso'?'success':'error'}>{v}</Tag>, width: 80 },
                  { title: 'Categoría', dataIndex: 'categoria' },
                  { title: 'Descripción', dataIndex: 'descripcion', render: v => v ?? '—' },
                  { title: 'Presupuestado', dataIndex: 'monto', align: 'right', render: v => fmtUSD(Number(v)) },
                ]}
              />
            </>
          )}
        </Spin>
      </Modal>
    </>
  );
}
