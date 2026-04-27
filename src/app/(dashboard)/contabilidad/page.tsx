'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Tabs, Table, Button, Modal, Form, Input, Select, DatePicker,
  Space, Tag, Popconfirm, Row, Col, Card, Statistic, Alert,
  Empty, Spin, Tooltip, Badge, Divider, InputNumber,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  Plus, PencilSimple, Trash, CheckCircle, XCircle,
  BookOpen, ListNumbers, CalendarBlank, ChartLine,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import PageHeader from '@/components/shared/PageHeader';

/* ─── Tipos ──────────────────────────────────────────────── */
type Cuenta = {
  id: string; codigo: string; nombre: string;
  tipo: string; naturaleza: string; nivel: number;
  permiteMovimiento: boolean; descripcion?: string;
  parent?: { codigo: string; nombre: string } | null;
  _count?: { lines: number };
};

type AsientoLine = {
  id?: string; accountId: string; descripcion?: string;
  debe: number; haber: number; orden: number;
  account?: { id: string; codigo: string; nombre: string };
};

type Asiento = {
  id: string; numero: number; anio: number;
  fecha: string; concepto: string; tipo: string;
  estado: 'BORRADOR' | 'PUBLICADO' | 'ANULADO';
  origen: string; totalDebe: number; totalHaber: number;
  lines: AsientoLine[];
  periodo?: { nombre: string } | null;
};

type Periodo = {
  id: string; nombre: string; anio: number; mes: number;
  estado: 'ABIERTO' | 'CERRADO';
  _count?: { entries: number };
};

/* ─── Constantes ─────────────────────────────────────────── */
const TIPO_CUENTA_COLOR: Record<string, string> = {
  ACTIVO: 'blue', PASIVO: 'orange', PATRIMONIO: 'purple',
  INGRESO: 'green', GASTO: 'red', COSTO: 'magenta',
};

const ESTADO_ASIENTO_COLOR: Record<string, string> = {
  BORRADOR: 'default', PUBLICADO: 'success', ANULADO: 'error',
};

const ORIGEN_LABEL: Record<string, string> = {
  MANUAL: 'Manual', FACTURA_DTE: 'Factura', COMPRA: 'Compra',
  GASTO: 'Gasto', PLANILLA: 'Planilla', DONACION: 'Donación',
};

const TIPOS_CUENTA = ['ACTIVO','PASIVO','PATRIMONIO','INGRESO','COSTO','GASTO'];
const NATURALEZAS  = ['DEUDORA','ACREEDORA'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function fmtUSD(n: number) {
  return new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(Number(n ?? 0));
}

/* ═══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════════════ */
function ContabilidadInner() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const VALID_TABS = ['asientos', 'cuentas', 'periodos', 'reportes'];
  const [activeTab, setActiveTab] = useState(
    VALID_TABS.includes(tabParam ?? '') ? (tabParam as string) : 'asientos'
  );

  useEffect(() => {
    if (tabParam && VALID_TABS.includes(tabParam)) setActiveTab(tabParam);
  }, [tabParam]);

  return (
    <div>
      <PageHeader
        title="Contabilidad"
        description="Centro contable ONG — Asientos, Catálogo de Cuentas, Períodos y Reportes"
        icon={<BookOpen size={22} />}
      />

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        style={{ marginTop: 8 }}
        items={[
          { key: 'asientos',  label: <span><ListNumbers size={14} style={{ marginRight: 5 }} />Asientos</span>,  children: <AsientosTab /> },
          { key: 'cuentas',   label: <span><BookOpen    size={14} style={{ marginRight: 5 }} />Catálogo</span>,  children: <CuentasTab /> },
          { key: 'periodos',  label: <span><CalendarBlank size={14} style={{ marginRight: 5 }} />Períodos</span>, children: <PeriodosTab /> },
          { key: 'reportes',  label: <span><ChartLine   size={14} style={{ marginRight: 5 }} />Reportes</span>,  children: <ReportesTab /> },
        ]}
      />
    </div>
  );
}

export default function ContabilidadPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>}>
      <ContabilidadInner />
    </Suspense>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB: ASIENTOS CONTABLES
   ═══════════════════════════════════════════════════════════ */
function AsientosTab() {
  const [data, setData]       = useState<Asiento[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState<Asiento | null>(null);
  const [saving, setSaving]   = useState(false);
  const [form]                = Form.useForm();
  const [lines, setLines]     = useState<AsientoLine[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [filtroEstado, setFiltroEstado] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = filtroEstado ? `?estado=${filtroEstado}` : '';
      const r = await fetch(`/api/contabilidad/asientos${q}`);
      const d = await r.json();
      setData(d.data ?? []);
    } catch { toast.error('Error cargando asientos'); }
    finally { setLoading(false); }
  }, [filtroEstado]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch('/api/contabilidad/cuentas?soloMovimiento=1')
      .then(r => r.json()).then(d => setCuentas(d.data ?? []));
    fetch('/api/contabilidad/periodos')
      .then(r => r.json()).then(d => setPeriodos(d.data ?? []));
  }, []);

  function openNew() {
    setEditing(null);
    form.resetFields();
    form.setFieldValue('tipo', 'DIARIO');
    form.setFieldValue('fecha', dayjs());
    setLines([{ accountId: '', debe: 0, haber: 0, orden: 0 }, { accountId: '', debe: 0, haber: 0, orden: 1 }]);
    setModal(true);
  }

  function openEdit(a: Asiento) {
    setEditing(a);
    form.setFieldsValue({
      concepto: a.concepto, tipo: a.tipo, periodoId: a.periodo?.nombre,
      fecha: dayjs(a.fecha),
    });
    setLines(a.lines.map(l => ({ ...l, debe: Number(l.debe), haber: Number(l.haber) })));
    setModal(true);
  }

  function addLine() {
    setLines(prev => [...prev, { accountId: '', debe: 0, haber: 0, orden: prev.length }]);
  }

  function removeLine(idx: number) {
    setLines(prev => prev.filter((_, i) => i !== idx));
  }

  function updateLine(idx: number, field: string, value: unknown) {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  }

  const totalDebe  = lines.reduce((s, l) => s + Number(l.debe  ?? 0), 0);
  const totalHaber = lines.reduce((s, l) => s + Number(l.haber ?? 0), 0);
  const cuadra     = Math.abs(totalDebe - totalHaber) < 0.01;

  async function onSave() {
    try {
      const vals = await form.validateFields();
      if (!cuadra) { toast.error('La partida doble no cuadra'); return; }
      if (lines.some(l => !l.accountId)) { toast.error('Todas las líneas deben tener cuenta'); return; }

      setSaving(true);
      const url    = editing ? `/api/contabilidad/asientos/${editing.id}` : '/api/contabilidad/asientos';
      const method = editing ? 'PUT' : 'POST';
      const r = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...vals, fecha: vals.fecha?.toISOString(), lines }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error ?? 'Error'); }
      toast.success(editing ? 'Asiento actualizado' : 'Asiento creado');
      setModal(false); load();
    } catch (e: unknown) {
      if (e instanceof Error) toast.error(e.message);
    } finally { setSaving(false); }
  }

  async function accion(id: string, action: 'publicar' | 'anular') {
    try {
      const r = await fetch(`/api/contabilidad/asientos/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error ?? 'Error'); }
      toast.success(action === 'publicar' ? 'Asiento publicado' : 'Asiento anulado');
      load();
    } catch (e: unknown) {
      if (e instanceof Error) toast.error(e.message);
    }
  }

  const cols: ColumnsType<Asiento> = [
    { title: 'N°', dataIndex: 'numero', width: 70,
      render: (v, r) => <span style={{ fontWeight: 600 }}>{r.anio}-{String(v).padStart(4,'0')}</span> },
    { title: 'Fecha', dataIndex: 'fecha', width: 100,
      render: v => dayjs(v).format('DD/MM/YYYY') },
    { title: 'Concepto', dataIndex: 'concepto', ellipsis: true },
    { title: 'Tipo', dataIndex: 'tipo', width: 90,
      render: v => <Tag>{v}</Tag> },
    { title: 'Origen', dataIndex: 'origen', width: 90,
      render: v => <Tag color="cyan">{ORIGEN_LABEL[v] ?? v}</Tag> },
    { title: 'Debe', dataIndex: 'totalDebe', width: 110, align: 'right',
      render: v => fmtUSD(Number(v)) },
    { title: 'Haber', dataIndex: 'totalHaber', width: 110, align: 'right',
      render: v => fmtUSD(Number(v)) },
    { title: 'Estado', dataIndex: 'estado', width: 100, align: 'center',
      render: v => <Badge status={v === 'PUBLICADO' ? 'success' : v === 'ANULADO' ? 'error' : 'default'}
                         text={v} /> },
    { title: 'Acciones', key: 'acc', width: 160, align: 'right',
      render: (_, r) => (
        <Space size={4}>
          {r.estado === 'BORRADOR' && (
            <>
              <Tooltip title="Editar">
                <Button size="small" icon={<PencilSimple size={13} />} onClick={() => openEdit(r)} />
              </Tooltip>
              <Popconfirm title="¿Publicar asiento? No se podrá editar después." onConfirm={() => accion(r.id, 'publicar')}>
                <Tooltip title="Publicar">
                  <Button size="small" type="primary" icon={<CheckCircle size={13} />} />
                </Tooltip>
              </Popconfirm>
            </>
          )}
          {r.estado !== 'ANULADO' && (
            <Popconfirm title="¿Anular asiento?" onConfirm={() => accion(r.id, 'anular')}>
              <Tooltip title="Anular">
                <Button size="small" danger icon={<XCircle size={13} />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Select placeholder="Filtrar por estado" allowClear style={{ width: 180 }}
            value={filtroEstado || undefined}
            onChange={v => setFiltroEstado(v ?? '')}
            options={[
              { value: 'BORRADOR',   label: 'Borrador' },
              { value: 'PUBLICADO',  label: 'Publicado' },
              { value: 'ANULADO',    label: 'Anulado' },
            ]} />
        </Col>
        <Col>
          <Button type="primary" icon={<Plus size={14} />} onClick={openNew}>
            Nuevo asiento
          </Button>
        </Col>
      </Row>

      <Table
        dataSource={data} columns={cols} rowKey="id"
        loading={loading} size="small"
        pagination={{ pageSize: 20 }}
        expandable={{
          expandedRowRender: (r) => (
            <Table
              dataSource={r.lines} rowKey={(_, i) => String(i)}
              size="small" pagination={false}
              columns={[
                { title: 'Cuenta', key: 'cuenta',
                  render: (_, l) => <span><b>{l.account?.codigo}</b> — {l.account?.nombre}</span> },
                { title: 'Descripción', dataIndex: 'descripcion', render: v => v ?? '—' },
                { title: 'Debe',  dataIndex: 'debe',  align: 'right', render: v => Number(v) ? fmtUSD(Number(v)) : '—' },
                { title: 'Haber', dataIndex: 'haber', align: 'right', render: v => Number(v) ? fmtUSD(Number(v)) : '—' },
              ]}
            />
          ),
        }}
      />

      {/* Modal crear/editar asiento */}
      <Modal
        title={editing ? 'Editar asiento' : 'Nuevo asiento contable'}
        open={modal} onCancel={() => setModal(false)} footer={null} width={900}
        styles={{ body: { maxHeight: '80vh', overflowY: 'auto' } }}
      >
        <Form form={form} layout="vertical">
          <Row gutter={12}>
            <Col span={10}>
              <Form.Item name="concepto" label="Concepto" rules={[{ required: true }]}>
                <Input maxLength={300} />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="fecha" label="Fecha" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="tipo" label="Tipo">
                <Select options={['DIARIO','AJUSTE','APERTURA','CIERRE'].map(v => ({ value: v, label: v }))} />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="periodoId" label="Período (opcional)">
                <Select allowClear placeholder="Sin período"
                  options={periodos.filter(p => p.estado === 'ABIERTO').map(p => ({ value: p.id, label: p.nombre }))} />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '8px 0 16px' }}>Líneas del asiento (partida doble)</Divider>

          {/* Cabecera */}
          <Row gutter={8} style={{ fontWeight: 600, fontSize: 12, color: 'hsl(var(--text-muted))', marginBottom: 6, paddingLeft: 8 }}>
            <Col span={9}>Cuenta</Col>
            <Col span={6}>Descripción</Col>
            <Col span={4} style={{ textAlign: 'right' }}>Debe ($)</Col>
            <Col span={4} style={{ textAlign: 'right' }}>Haber ($)</Col>
            <Col span={1} />
          </Row>

          {lines.map((l, idx) => (
            <Row key={idx} gutter={8} align="middle" style={{ marginBottom: 6 }}>
              <Col span={9}>
                <Select
                  style={{ width: '100%' }} showSearch placeholder="Buscar cuenta..."
                  value={l.accountId || undefined}
                  onChange={v => updateLine(idx, 'accountId', v)}
                  filterOption={(input, opt) =>
                    (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={cuentas.map(c => ({
                    value: c.id,
                    label: `${c.codigo} — ${c.nombre}`,
                  }))}
                />
              </Col>
              <Col span={6}>
                <Input placeholder="Descripción (opcional)" value={l.descripcion ?? ''}
                  onChange={e => updateLine(idx, 'descripcion', e.target.value)} />
              </Col>
              <Col span={4}>
                <InputNumber
                  style={{ width: '100%' }} min={0} precision={2} placeholder="0.00"
                  value={l.debe || undefined}
                  onChange={v => { updateLine(idx, 'debe', v ?? 0); if (v) updateLine(idx, 'haber', 0); }}
                />
              </Col>
              <Col span={4}>
                <InputNumber
                  style={{ width: '100%' }} min={0} precision={2} placeholder="0.00"
                  value={l.haber || undefined}
                  onChange={v => { updateLine(idx, 'haber', v ?? 0); if (v) updateLine(idx, 'debe', 0); }}
                />
              </Col>
              <Col span={1}>
                {lines.length > 2 && (
                  <Button danger size="small" icon={<Trash size={12} />} onClick={() => removeLine(idx)} />
                )}
              </Col>
            </Row>
          ))}

          <Button size="small" icon={<Plus size={12} />} onClick={addLine} style={{ marginTop: 4 }}>
            Agregar línea
          </Button>

          {/* Totales */}
          <div style={{
            marginTop: 16, padding: '10px 12px', borderRadius: 8,
            background: cuadra ? 'hsl(var(--status-success) / 0.08)' : 'hsl(var(--status-error) / 0.08)',
            border: `1px solid hsl(var(--${cuadra ? 'status-success' : 'status-error'}) / 0.3)`,
          }}>
            <Row gutter={16}>
              <Col span={8}>
                <div style={{ fontSize: 12, color: 'hsl(var(--text-muted))' }}>Total Debe</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{fmtUSD(totalDebe)}</div>
              </Col>
              <Col span={8}>
                <div style={{ fontSize: 12, color: 'hsl(var(--text-muted))' }}>Total Haber</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{fmtUSD(totalHaber)}</div>
              </Col>
              <Col span={8}>
                <div style={{ fontSize: 12, color: 'hsl(var(--text-muted))' }}>Estado</div>
                <div style={{ fontWeight: 700, color: cuadra ? '#16a34a' : '#dc2626' }}>
                  {cuadra ? '✓ Cuadra' : `⚠ Diferencia: ${fmtUSD(Math.abs(totalDebe - totalHaber))}`}
                </div>
              </Col>
            </Row>
          </div>
        </Form>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button onClick={() => setModal(false)}>Cancelar</Button>
          <Button type="primary" loading={saving} onClick={onSave} disabled={!cuadra}>
            {editing ? 'Guardar cambios' : 'Crear asiento'}
          </Button>
        </div>
      </Modal>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB: CATÁLOGO DE CUENTAS
   ═══════════════════════════════════════════════════════════ */
function CuentasTab() {
  const [data, setData]       = useState<Cuenta[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState<Cuenta | null>(null);
  const [saving, setSaving]   = useState(false);
  const [form]                = Form.useForm();
  const [filtroTipo, setFiltroTipo] = useState('');
  const [search, setSearch]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroTipo) params.set('tipo', filtroTipo);
      if (search)     params.set('search', search);
      const r = await fetch(`/api/contabilidad/cuentas?${params}`);
      const d = await r.json();
      setData(d.data ?? []);
    } catch { toast.error('Error cargando cuentas'); }
    finally { setLoading(false); }
  }, [filtroTipo, search]);

  useEffect(() => { load(); }, [load]);

  function openEdit(c: Cuenta) {
    setEditing(c);
    form.setFieldsValue({
      codigo: c.codigo, nombre: c.nombre, tipo: c.tipo,
      naturaleza: c.naturaleza, nivel: c.nivel,
      permiteMovimiento: c.permiteMovimiento, descripcion: c.descripcion,
    });
    setModal(true);
  }

  async function onSave() {
    try {
      const vals = await form.validateFields();
      setSaving(true);
      const url    = editing ? `/api/contabilidad/cuentas/${editing.id}` : '/api/contabilidad/cuentas';
      const method = editing ? 'PUT' : 'POST';
      const r = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vals),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error ?? 'Error'); }
      toast.success(editing ? 'Cuenta actualizada' : 'Cuenta creada');
      setModal(false); load();
    } catch (e: unknown) {
      if (e instanceof Error) toast.error(e.message);
    } finally { setSaving(false); }
  }

  async function desactivar(id: string) {
    try {
      const r = await fetch(`/api/contabilidad/cuentas/${id}`, { method: 'DELETE' });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error ?? 'Error'); }
      toast.success('Cuenta desactivada');
      load();
    } catch (e: unknown) {
      if (e instanceof Error) toast.error(e.message);
    }
  }

  // KPIs por tipo
  const porTipo = TIPOS_CUENTA.reduce((acc, t) => {
    acc[t] = data.filter(c => c.tipo === t).length;
    return acc;
  }, {} as Record<string, number>);

  const cols: ColumnsType<Cuenta> = [
    { title: 'Código', dataIndex: 'codigo', width: 110, sorter: (a, b) => a.codigo.localeCompare(b.codigo),
      render: v => <code style={{ fontSize: 12, fontWeight: 600 }}>{v}</code> },
    { title: 'Nombre', dataIndex: 'nombre', ellipsis: true,
      render: (v, r) => (
        <span style={{ paddingLeft: (r.nivel - 1) * 16 }}>
          {r.nivel <= 2 && <b>{v}</b>}
          {r.nivel > 2 && v}
        </span>
      ),
    },
    { title: 'Tipo', dataIndex: 'tipo', width: 110,
      render: v => <Tag color={TIPO_CUENTA_COLOR[v] ?? 'default'}>{v}</Tag> },
    { title: 'Naturaleza', dataIndex: 'naturaleza', width: 110,
      render: v => <Tag color={v === 'DEUDORA' ? 'blue' : 'orange'}>{v}</Tag> },
    { title: 'Nivel', dataIndex: 'nivel', width: 65, align: 'center' },
    { title: 'Movimientos', key: 'mov', width: 100, align: 'center',
      render: (_, r) => r.permiteMovimiento
        ? <Tag color="green">Sí ({r._count?.lines ?? 0})</Tag>
        : <Tag color="default">Agrupadora</Tag> },
    { title: 'Acciones', key: 'acc', width: 100, align: 'right',
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" icon={<PencilSimple size={13} />} onClick={() => openEdit(r)} />
          <Popconfirm title="¿Desactivar cuenta?" onConfirm={() => desactivar(r.id)}>
            <Button size="small" danger icon={<Trash size={13} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      {/* KPIs */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {Object.entries(porTipo).map(([tipo, count]) => (
          <Col key={tipo} span={4}>
            <Card size="small" style={{ borderRadius: 8, borderTop: `3px solid` }}>
              <Statistic title={tipo} value={count}
                valueStyle={{ color: TIPO_CUENTA_COLOR[tipo] ?? '#666', fontSize: 20 }} />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={12} justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space>
            <Input.Search placeholder="Buscar código o nombre..." style={{ width: 240 }}
              onSearch={v => setSearch(v)} allowClear onChange={e => !e.target.value && setSearch('')} />
            <Select placeholder="Filtrar tipo" allowClear style={{ width: 140 }}
              value={filtroTipo || undefined} onChange={v => setFiltroTipo(v ?? '')}
              options={TIPOS_CUENTA.map(t => ({ value: t, label: t }))} />
          </Space>
        </Col>
        <Col>
          <Button type="primary" icon={<Plus size={14} />} onClick={() => { setEditing(null); form.resetFields(); setModal(true); }}>
            Nueva cuenta
          </Button>
        </Col>
      </Row>

      <Table
        dataSource={data} columns={cols} rowKey="id"
        loading={loading} size="small"
        pagination={{ pageSize: 30 }}
        locale={{ emptyText: <Empty description="No hay cuentas. Ejecuta el seed para cargar el catálogo ONG." /> }}
      />

      <Modal
        title={editing ? 'Editar cuenta' : 'Nueva cuenta'}
        open={modal} onCancel={() => setModal(false)} footer={null} width={600}
      >
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="codigo" label="Código" rules={[{ required: true }]}>
                <Input placeholder="Ej: 110101" maxLength={20} />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
                <Input maxLength={200} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
                <Select options={TIPOS_CUENTA.map(t => ({ value: t, label: t }))} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="naturaleza" label="Naturaleza" rules={[{ required: true }]}>
                <Select options={NATURALEZAS.map(n => ({ value: n, label: n }))} />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="nivel" label="Nivel" initialValue={4}>
                <Select options={[1,2,3,4].map(n => ({ value: n, label: `Nivel ${n}` }))} />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="permiteMovimiento" label="Movimiento" initialValue={true}>
                <Select options={[{ value: true, label: 'Sí' }, { value: false, label: 'No' }]} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="descripcion" label="Descripción (opcional)">
                <Input.TextArea rows={2} maxLength={500} />
              </Form.Item>
            </Col>
          </Row>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              {editing ? 'Guardar' : 'Crear cuenta'}
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB: PERÍODOS CONTABLES
   ═══════════════════════════════════════════════════════════ */
function PeriodosTab() {
  const [data, setData]       = useState<Periodo[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal]     = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form]                = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/contabilidad/periodos');
      const d = await r.json();
      setData(d.data ?? []);
    } catch { toast.error('Error cargando períodos'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function onSave() {
    try {
      const vals = await form.validateFields();
      setSaving(true);
      const r = await fetch('/api/contabilidad/periodos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vals),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error ?? 'Error'); }
      toast.success('Período creado');
      setModal(false); load();
    } catch (e: unknown) {
      if (e instanceof Error) toast.error(e.message);
    } finally { setSaving(false); }
  }

  async function toggleEstado(p: Periodo) {
    try {
      const nuevo = p.estado === 'ABIERTO' ? 'CERRADO' : 'ABIERTO';
      const r = await fetch(`/api/contabilidad/periodos/${p.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevo }),
      });
      if (!r.ok) throw new Error('Error');
      toast.success(`Período ${nuevo === 'CERRADO' ? 'cerrado' : 'reabierto'}`);
      load();
    } catch { toast.error('Error actualizando período'); }
  }

  const cols: ColumnsType<Periodo> = [
    { title: 'Período', dataIndex: 'nombre', render: v => <b>{v}</b> },
    { title: 'Año',     dataIndex: 'anio',   width: 80 },
    { title: 'Mes',     dataIndex: 'mes',    width: 80, render: v => MESES[v - 1] },
    { title: 'Asientos', key: 'ent', width: 90, align: 'center',
      render: (_, r) => <Tag>{r._count?.entries ?? 0}</Tag> },
    { title: 'Estado', dataIndex: 'estado', width: 100,
      render: v => <Badge status={v === 'ABIERTO' ? 'success' : 'default'} text={v} /> },
    { title: 'Acción', key: 'acc', width: 120, align: 'right',
      render: (_, r) => (
        <Popconfirm
          title={r.estado === 'ABIERTO' ? '¿Cerrar período? No se podrán agregar asientos.' : '¿Reabrir período?'}
          onConfirm={() => toggleEstado(r)}
        >
          <Button size="small" danger={r.estado === 'ABIERTO'}>
            {r.estado === 'ABIERTO' ? 'Cerrar' : 'Reabrir'}
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const abiertos = data.filter(p => p.estado === 'ABIERTO').length;

  return (
    <>
      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic title="Períodos totales"  value={data.length} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic title="Períodos abiertos" value={abiertos}
              valueStyle={{ color: abiertos > 0 ? '#16a34a' : '#666' }} />
          </Card>
        </Col>
      </Row>

      <Row justify="end" style={{ marginBottom: 12 }}>
        <Button type="primary" icon={<Plus size={14} />} onClick={() => { form.resetFields(); setModal(true); }}>
          Nuevo período
        </Button>
      </Row>

      <Table dataSource={data} columns={cols} rowKey="id" loading={loading} size="small" pagination={false} />

      <Modal title="Nuevo período contable" open={modal} onCancel={() => setModal(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="anio" label="Año" rules={[{ required: true }]}>
                <InputNumber min={2020} max={2100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="mes" label="Mes" rules={[{ required: true }]}>
                <Select options={MESES.map((m, i) => ({ value: i + 1, label: m }))} />
              </Form.Item>
            </Col>
          </Row>
          <Alert type="info" showIcon message="Se creará el período y quedará en estado ABIERTO para recibir asientos." style={{ marginBottom: 16 }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="primary" htmlType="submit" loading={saving}>Crear período</Button>
          </div>
        </Form>
      </Modal>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB: REPORTES CONTABLES ONG
   ═══════════════════════════════════════════════════════════ */
function ReportesTab() {
  const [tipoReporte, setTipoReporte] = useState('estado_actividades');
  const [desde, setDesde]   = useState(dayjs().startOf('year'));
  const [hasta, setHasta]   = useState(dayjs().endOf('year'));
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<Record<string, unknown> | null>(null);
  const [cuentas, setCuentas]   = useState<Cuenta[]>([]);
  const [accountId, setAccountId] = useState('');

  useEffect(() => {
    fetch('/api/contabilidad/cuentas?soloMovimiento=1')
      .then(r => r.json()).then(d => setCuentas(d.data ?? []));
  }, []);

  async function generar() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tipo:  tipoReporte,
        desde: desde.toISOString(),
        hasta: hasta.toISOString(),
      });
      if (tipoReporte === 'libro_mayor' && accountId) params.set('accountId', accountId);
      const r = await fetch(`/api/contabilidad/reportes?${params}`);
      const d = await r.json();
      setResultado(d.data ?? d);
    } catch { toast.error('Error generando reporte'); }
    finally { setLoading(false); }
  }

  return (
    <>
      {/* Filtros */}
      <Card size="small" style={{ marginBottom: 16, borderRadius: 10 }}>
        <Row gutter={12} align="middle">
          <Col span={6}>
            <div style={{ fontSize: 12, marginBottom: 4, fontWeight: 600 }}>Tipo de reporte</div>
            <Select value={tipoReporte} onChange={setTipoReporte} style={{ width: '100%' }}
              options={[
                { value: 'estado_actividades',  label: '📊 Estado de Actividades (ONG)' },
                { value: 'balance_comprobacion', label: '⚖️  Balance de Comprobación' },
                { value: 'libro_diario',         label: '📖 Libro Diario' },
                { value: 'libro_mayor',          label: '📋 Libro Mayor' },
              ]} />
          </Col>
          <Col span={4}>
            <div style={{ fontSize: 12, marginBottom: 4, fontWeight: 600 }}>Desde</div>
            <DatePicker value={desde} onChange={v => v && setDesde(v)} style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Col>
          <Col span={4}>
            <div style={{ fontSize: 12, marginBottom: 4, fontWeight: 600 }}>Hasta</div>
            <DatePicker value={hasta} onChange={v => v && setHasta(v)} style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Col>
          {tipoReporte === 'libro_mayor' && (
            <Col span={7}>
              <div style={{ fontSize: 12, marginBottom: 4, fontWeight: 600 }}>Cuenta</div>
              <Select showSearch style={{ width: '100%' }} placeholder="Seleccionar cuenta..."
                value={accountId || undefined} onChange={setAccountId}
                filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
                options={cuentas.map(c => ({ value: c.id, label: `${c.codigo} — ${c.nombre}` }))} />
            </Col>
          )}
          <Col>
            <div style={{ fontSize: 12, marginBottom: 4, color: 'transparent' }}>.</div>
            <Button type="primary" onClick={generar} loading={loading}>Generar</Button>
          </Col>
        </Row>
      </Card>

      <Spin spinning={loading}>
        {!resultado && !loading && (
          <Empty description="Selecciona el tipo de reporte y haz clic en Generar" />
        )}

        {resultado && tipoReporte === 'estado_actividades' && (
          <EstadoActividadesView data={resultado as EstadoActividadesData} />
        )}
        {resultado && tipoReporte === 'balance_comprobacion' && (
          <BalanceComprobacionView data={resultado as BalanceCompData} />
        )}
        {resultado && tipoReporte === 'libro_diario' && (
          <LibroDiarioView data={resultado as LibroDiarioData} />
        )}
        {resultado && tipoReporte === 'libro_mayor' && (
          <LibroMayorView data={resultado as LibroMayorData} />
        )}
      </Spin>
    </>
  );
}

/* ─── Sub-vistas de reportes ──────────────────────────────── */
type LineaSimple = { codigo: string; nombre: string; monto: number };
type EstadoActividadesData = {
  ingresos: LineaSimple[]; gastos: LineaSimple[];
  gastosPrograma: LineaSimple[]; gastosAdmin: LineaSimple[];
  resumen: { totalIngresos: number; totalGastos: number; totalGastosPrograma: number; totalGastosAdmin: number; superavitDeficit: number; esSupervit: boolean };
};

function EstadoActividadesView({ data }: { data: EstadoActividadesData }) {
  const { resumen } = data;
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>FUNDACIÓN ASISTEDCOS EL SALVADOR</div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>ESTADO DE ACTIVIDADES (ONG)</div>
        <div style={{ color: 'hsl(var(--text-muted))', fontSize: 12 }}>Período reportado</div>
      </div>

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: '3px solid #16a34a' }}>
            <Statistic title="Total Ingresos" value={resumen.totalIngresos} prefix="$" precision={2}
              valueStyle={{ color: '#16a34a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: '3px solid #dc2626' }}>
            <Statistic title="Total Gastos" value={resumen.totalGastos} prefix="$" precision={2}
              valueStyle={{ color: '#dc2626' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: '3px solid #2563eb' }}>
            <Statistic title="Gastos de Programa" value={resumen.totalGastosPrograma} prefix="$" precision={2}
              valueStyle={{ color: '#2563eb' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: `3px solid ${resumen.esSupervit ? '#16a34a' : '#dc2626'}` }}>
            <Statistic title={resumen.esSupervit ? 'Superávit' : 'Déficit'}
              value={Math.abs(resumen.superavitDeficit)} prefix="$" precision={2}
              valueStyle={{ color: resumen.esSupervit ? '#16a34a' : '#dc2626', fontWeight: 800 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="Ingresos" size="small" style={{ borderRadius: 8 }}>
            <Table
              dataSource={data.ingresos} rowKey="codigo" size="small" pagination={false}
              columns={[
                { title: 'Código', dataIndex: 'codigo', width: 80 },
                { title: 'Descripción', dataIndex: 'nombre' },
                { title: 'Monto', dataIndex: 'monto', align: 'right', render: v => <b style={{ color: '#16a34a' }}>{fmtUSD(v)}</b> },
              ]}
              summary={() => (
                <Table.Summary.Row style={{ fontWeight: 700 }}>
                  <Table.Summary.Cell index={0} colSpan={2}>TOTAL INGRESOS</Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right"><span style={{ color: '#16a34a' }}>{fmtUSD(resumen.totalIngresos)}</span></Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Gastos" size="small" style={{ borderRadius: 8 }}>
            <Table
              dataSource={data.gastos} rowKey="codigo" size="small" pagination={false}
              columns={[
                { title: 'Código', dataIndex: 'codigo', width: 80 },
                { title: 'Descripción', dataIndex: 'nombre' },
                { title: 'Monto', dataIndex: 'monto', align: 'right', render: v => <b style={{ color: '#dc2626' }}>{fmtUSD(v)}</b> },
              ]}
              summary={() => (
                <Table.Summary.Row style={{ fontWeight: 700 }}>
                  <Table.Summary.Cell index={0} colSpan={2}>TOTAL GASTOS</Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right"><span style={{ color: '#dc2626' }}>{fmtUSD(resumen.totalGastos)}</span></Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Card size="small" style={{ marginTop: 12, borderRadius: 8, textAlign: 'right', background: resumen.esSupervit ? '#f0fdf4' : '#fef2f2' }}>
        <span style={{ fontWeight: 800, fontSize: 16, color: resumen.esSupervit ? '#16a34a' : '#dc2626' }}>
          {resumen.esSupervit ? 'SUPERÁVIT' : 'DÉFICIT'} DEL PERÍODO: {fmtUSD(Math.abs(resumen.superavitDeficit))}
        </span>
      </Card>
    </div>
  );
}

type BalanceLinea = { codigo: string; nombre: string; tipo: string; naturaleza: string; totalDebe: number; totalHaber: number; saldoDeudor: number; saldoAcreedor: number };
type BalanceCompData = { lineas: BalanceLinea[]; totales: { totalDebe: number; totalHaber: number; saldoDeudor: number; saldoAcreedor: number }; cuadra: boolean };

function BalanceComprobacionView({ data }: { data: BalanceCompData }) {
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 15 }}>BALANCE DE COMPROBACIÓN</div>
        {data.cuadra
          ? <Tag color="success">✓ Débitos = Créditos — Contabilidad cuadrada</Tag>
          : <Tag color="error">⚠ Contabilidad no cuadra</Tag>}
      </div>
      <Table
        dataSource={data.lineas} rowKey="codigo" size="small"
        pagination={false}
        columns={[
          { title: 'Código', dataIndex: 'codigo', width: 100 },
          { title: 'Cuenta', dataIndex: 'nombre', ellipsis: true },
          { title: 'Tipo', dataIndex: 'tipo', width: 100, render: v => <Tag color={TIPO_CUENTA_COLOR[v]}>{v}</Tag> },
          { title: 'Total Debe',  dataIndex: 'totalDebe',  align: 'right', width: 120, render: v => fmtUSD(v) },
          { title: 'Total Haber', dataIndex: 'totalHaber', align: 'right', width: 120, render: v => fmtUSD(v) },
          { title: 'Saldo Deudor',   dataIndex: 'saldoDeudor',   align: 'right', width: 120, render: v => v ? fmtUSD(v) : '—' },
          { title: 'Saldo Acreedor', dataIndex: 'saldoAcreedor', align: 'right', width: 120, render: v => v ? fmtUSD(v) : '—' },
        ]}
        summary={() => (
          <Table.Summary.Row style={{ fontWeight: 700, background: 'hsl(var(--bg-page))' }}>
            <Table.Summary.Cell index={0} colSpan={3}>TOTALES</Table.Summary.Cell>
            <Table.Summary.Cell index={3} align="right">{fmtUSD(data.totales.totalDebe)}</Table.Summary.Cell>
            <Table.Summary.Cell index={4} align="right">{fmtUSD(data.totales.totalHaber)}</Table.Summary.Cell>
            <Table.Summary.Cell index={5} align="right">{fmtUSD(data.totales.saldoDeudor)}</Table.Summary.Cell>
            <Table.Summary.Cell index={6} align="right">{fmtUSD(data.totales.saldoAcreedor)}</Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />
    </div>
  );
}

type DiarioAsiento = { numero: number; fecha: string; concepto: string; tipo: string; totalDebe: number; totalHaber: number; lines: { codigo: string; cuenta: string; descripcion?: string; debe: number; haber: number }[] };
type LibroDiarioData = { asientos: DiarioAsiento[]; totalAsientos: number };

function LibroDiarioView({ data }: { data: LibroDiarioData }) {
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 12, fontWeight: 700 }}>LIBRO DIARIO — {data.totalAsientos} asientos</div>
      {data.asientos.map(a => (
        <Card key={a.numero} size="small" style={{ marginBottom: 8, borderRadius: 8 }}
          title={<span><b>N° {a.numero}</b> — {dayjs(a.fecha).format('DD/MM/YYYY')} — {a.concepto} <Tag style={{ marginLeft: 8 }}>{a.tipo}</Tag></span>}
          extra={<span style={{ fontSize: 12 }}>D: <b>{fmtUSD(a.totalDebe)}</b> H: <b>{fmtUSD(a.totalHaber)}</b></span>}
        >
          {a.lines.map((l, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}>
              <span style={{ paddingLeft: l.debe > 0 ? 0 : 32 }}>
                <code>{l.codigo}</code> {l.cuenta} {l.descripcion && <span style={{ color: 'hsl(var(--text-muted))' }}>— {l.descripcion}</span>}
              </span>
              <span>
                {l.debe  > 0 && <span style={{ marginRight: 40, color: '#1d4ed8', fontWeight: 600 }}>{fmtUSD(l.debe)}</span>}
                {l.haber > 0 && <span style={{ color: '#7c3aed', fontWeight: 600 }}>{fmtUSD(l.haber)}</span>}
              </span>
            </div>
          ))}
        </Card>
      ))}
    </div>
  );
}

type MayorMovimiento = { fecha: string; numero: number; concepto: string; debe: number; haber: number; saldo: number };
type LibroMayorData  = { cuenta: { codigo: string; nombre: string; naturaleza: string }; movimientos: MayorMovimiento[]; saldoFinal: number; totalDebe: number; totalHaber: number };

function LibroMayorView({ data }: { data: LibroMayorData }) {
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontWeight: 700 }}>LIBRO MAYOR — <code>{data.cuenta.codigo}</code> {data.cuenta.nombre}</div>
        <Tag color={data.cuenta.naturaleza === 'DEUDORA' ? 'blue' : 'orange'}>{data.cuenta.naturaleza}</Tag>
      </div>
      <Table
        dataSource={data.movimientos} rowKey={(_, i) => String(i)}
        size="small" pagination={false}
        columns={[
          { title: 'Fecha',   dataIndex: 'fecha',   width: 100, render: v => dayjs(v).format('DD/MM/YYYY') },
          { title: 'N°',      dataIndex: 'numero',  width: 60  },
          { title: 'Concepto',dataIndex: 'concepto', ellipsis: true },
          { title: 'Debe',    dataIndex: 'debe',    align: 'right', width: 110, render: v => v ? fmtUSD(v) : '—' },
          { title: 'Haber',   dataIndex: 'haber',   align: 'right', width: 110, render: v => v ? fmtUSD(v) : '—' },
          { title: 'Saldo',   dataIndex: 'saldo',   align: 'right', width: 120,
            render: v => <b style={{ color: v >= 0 ? '#16a34a' : '#dc2626' }}>{fmtUSD(Math.abs(v))}</b> },
        ]}
        summary={() => (
          <Table.Summary.Row style={{ fontWeight: 700 }}>
            <Table.Summary.Cell index={0} colSpan={3}>TOTALES</Table.Summary.Cell>
            <Table.Summary.Cell index={3} align="right">{fmtUSD(data.totalDebe)}</Table.Summary.Cell>
            <Table.Summary.Cell index={4} align="right">{fmtUSD(data.totalHaber)}</Table.Summary.Cell>
            <Table.Summary.Cell index={5} align="right">
              <span style={{ color: data.saldoFinal >= 0 ? '#16a34a' : '#dc2626' }}>{fmtUSD(Math.abs(data.saldoFinal))}</span>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />
    </div>
  );
}
