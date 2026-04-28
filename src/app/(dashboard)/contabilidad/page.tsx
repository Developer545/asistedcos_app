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
type TipoPartida = {
  id: string; codigo: string; nombre: string;
  descripcion?: string; activo: boolean; orden: number;
};

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

type Proyecto = { id: string; name: string };

type Asiento = {
  id: string; numero: number; anio: number;
  fecha: string; concepto: string; tipo: string;
  estado: 'BORRADOR' | 'PUBLICADO' | 'ANULADO';
  origen: string; totalDebe: number; totalHaber: number;
  lines: AsientoLine[];
  periodo?: { nombre: string } | null;
  project?: { id: string; name: string } | null;
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
          { key: 'tipos',     label: <span><ListNumbers size={14} style={{ marginRight: 5 }} />Tipos de Partida</span>, children: <TiposPartidaTab /> },
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
  const [tiposPartida, setTiposPartida] = useState<TipoPartida[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
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
    fetch('/api/contabilidad/tipos-partida')
      .then(r => r.json()).then(d => setTiposPartida(d.data ?? []));
    fetch('/api/proyectos?activos=1')
      .then(r => r.json()).then(d => setProyectos((d.data ?? d ?? []).map((p: Proyecto) => ({ id: p.id, name: p.name }))));
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
      projectId: a.project?.id ?? null,
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
        body: JSON.stringify({ ...vals, fecha: vals.fecha?.toISOString(), lines, projectId: vals.projectId ?? null }),
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
    { title: 'Proyecto', key: 'project', width: 120, ellipsis: true,
      render: (_: unknown, r: Asiento) => r.project
        ? <Tag color="geekblue" style={{ fontSize: 11 }}>{r.project.name}</Tag>
        : <span style={{ color: 'hsl(var(--text-muted))', fontSize: 11 }}>—</span> },
    { title: 'Estado', dataIndex: 'estado', width: 100, align: 'center',
      render: (v: string) => <Badge status={v === 'PUBLICADO' ? 'success' : v === 'ANULADO' ? 'error' : 'default'}
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
                <Select
                  options={tiposPartida.filter(t => t.activo).map(t => ({ value: t.codigo, label: t.nombre }))}
                  placeholder="Tipo..."
                />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="periodoId" label="Período (opcional)">
                <Select allowClear placeholder="Sin período"
                  options={periodos.filter(p => p.estado === 'ABIERTO').map(p => ({ value: p.id, label: p.nombre }))} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="projectId" label="Proyecto / Centro de costo (opcional)">
                <Select allowClear showSearch placeholder="Sin proyecto asignado"
                  filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
                  options={proyectos.map(p => ({ value: p.id, label: p.name }))} />
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

  // Cierre contable
  const [modalCierre, setModalCierre]   = useState(false);
  const [cierreAnio, setCierreAnio]     = useState(new Date().getFullYear());
  const [cierrePreview, setCierrePreview] = useState<Record<string, unknown> | null>(null);
  const [loadingCierre, setLoadingCierre] = useState(false);
  const [savingCierre, setSavingCierre]   = useState(false);
  const [cuentaPatrimonioId, setCuentaPatrimonioId] = useState('');
  const [cuentasPatrimonio, setCuentasPatrimonio]   = useState<Cuenta[]>([]);

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

  async function abrirCierre() {
    // Cargar cuentas de patrimonio y preview del cierre
    setLoadingCierre(true);
    try {
      const [cuentasR, previewR] = await Promise.all([
        fetch('/api/contabilidad/cuentas?tipo=PATRIMONIO&soloMovimiento=1').then(r => r.json()),
        fetch(`/api/contabilidad/cierre?anio=${cierreAnio}`).then(r => r.json()),
      ]);
      setCuentasPatrimonio(cuentasR.data ?? []);
      setCierrePreview(previewR.data ?? null);
      setModalCierre(true);
    } catch { toast.error('Error cargando preview del cierre'); }
    finally { setLoadingCierre(false); }
  }

  async function ejecutarCierre() {
    if (!cuentaPatrimonioId) { toast.error('Selecciona la cuenta de patrimonio destino'); return; }
    setSavingCierre(true);
    try {
      const r = await fetch('/api/contabilidad/cierre', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anio: cierreAnio, cuentaPatrimonioId }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error ?? 'Error'); }
      toast.success(`Cierre del año ${cierreAnio} ejecutado correctamente`);
      setModalCierre(false); load();
    } catch (e: unknown) {
      if (e instanceof Error) toast.error(e.message);
    } finally { setSavingCierre(false); }
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

      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col>
          <Space>
            <InputNumber
              value={cierreAnio} onChange={v => v && setCierreAnio(v)}
              min={2020} max={2100} style={{ width: 100 }}
              addonBefore="Año"
            />
            <Button
              onClick={abrirCierre} loading={loadingCierre}
              style={{ borderColor: '#7c3aed', color: '#7c3aed' }}
            >
              Ejecutar Cierre Contable
            </Button>
          </Space>
        </Col>
        <Col>
          <Button type="primary" icon={<Plus size={14} />} onClick={() => { form.resetFields(); setModal(true); }}>
            Nuevo período
          </Button>
        </Col>
      </Row>

      <Table dataSource={data} columns={cols} rowKey="id" loading={loading} size="small" pagination={false} />

      {/* Modal cierre contable */}
      <Modal
        title={`Cierre Contable — Año ${cierreAnio}`}
        open={modalCierre} onCancel={() => setModalCierre(false)} footer={null} width={700}
      >
        {cierrePreview && (
          <>
            {(cierrePreview.cierreExistente as boolean) && (
              <Alert type="error" showIcon message={`Ya existe un cierre para el año ${cierreAnio}`} style={{ marginBottom: 16 }} />
            )}
            {(cierrePreview.borradores as number) > 0 && (
              <Alert type="warning" showIcon
                message={`Existen ${cierrePreview.borradores as number} asiento(s) en borrador — publícalos antes del cierre`}
                style={{ marginBottom: 16 }} />
            )}
            <Row gutter={12} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card size="small" style={{ borderRadius: 8, borderLeft: '3px solid #16a34a' }}>
                  <Statistic title="Total Ingresos" value={cierrePreview.totalIngresos as number} prefix="$" precision={2} valueStyle={{ color: '#16a34a' }} />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ borderRadius: 8, borderLeft: '3px solid #dc2626' }}>
                  <Statistic title="Gastos + Costos" value={cierrePreview.totalGastoCosto as number} prefix="$" precision={2} valueStyle={{ color: '#dc2626' }} />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ borderRadius: 8, borderLeft: `3px solid ${(cierrePreview.superavitDeficit as number) >= 0 ? '#16a34a' : '#dc2626'}` }}>
                  <Statistic
                    title={(cierrePreview.superavitDeficit as number) >= 0 ? 'Superávit' : 'Déficit'}
                    value={Math.abs(cierrePreview.superavitDeficit as number)} prefix="$" precision={2}
                    valueStyle={{ color: (cierrePreview.superavitDeficit as number) >= 0 ? '#16a34a' : '#dc2626', fontWeight: 800 }} />
                </Card>
              </Col>
            </Row>

            <div style={{ marginBottom: 12, fontWeight: 600, fontSize: 13 }}>Cuentas de resultado a cerrar:</div>
            <Table
              dataSource={(cierrePreview.cuentasResultado as { codigo: string; nombre: string; tipo: string; saldo: number }[]) ?? []}
              rowKey="codigo" size="small" pagination={false}
              style={{ marginBottom: 16 }}
              columns={[
                { title: 'Código', dataIndex: 'codigo', width: 90 },
                { title: 'Cuenta', dataIndex: 'nombre', ellipsis: true },
                { title: 'Tipo', dataIndex: 'tipo', width: 90, render: (v: string) => <Tag color={TIPO_CUENTA_COLOR[v]}>{v}</Tag> },
                { title: 'Saldo', dataIndex: 'saldo', align: 'right', width: 110, render: (v: number) => fmtUSD(v) },
              ]}
            />

            <div style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Cuenta destino del resultado (Patrimonio):</div>
              <Select
                style={{ width: '100%' }} showSearch placeholder="Seleccionar cuenta de patrimonio..."
                value={cuentaPatrimonioId || undefined} onChange={setCuentaPatrimonioId}
                filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
                options={cuentasPatrimonio.map(c => ({ value: c.id, label: `${c.codigo} — ${c.nombre}` }))}
              />
            </div>

            <Alert type="warning" showIcon style={{ marginTop: 12, marginBottom: 16 }}
              message="Esta acción generará un asiento de cierre publicado y cerrará todos los períodos del año. No se puede deshacer." />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button onClick={() => setModalCierre(false)}>Cancelar</Button>
              <Button
                type="primary" danger loading={savingCierre}
                disabled={!(cierrePreview.puedeEjecutar as boolean)}
                onClick={ejecutarCierre}
              >
                Ejecutar Cierre del Año {cierreAnio}
              </Button>
            </div>
          </>
        )}
      </Modal>

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
type BudgetResumen = { id: string; nombre: string; anio: number; estado: string };

function ReportesTab() {
  const [tipoReporte, setTipoReporte] = useState('estado_actividades');
  const [desde, setDesde]   = useState(dayjs().startOf('year'));
  const [hasta, setHasta]   = useState(dayjs().endOf('year'));
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<Record<string, unknown> | null>(null);
  const [cuentas, setCuentas]           = useState<Cuenta[]>([]);
  const [cuentasTodas, setCuentasTodas] = useState<Cuenta[]>([]);
  const [accountId, setAccountId]       = useState('');
  const [budgets, setBudgets]           = useState<BudgetResumen[]>([]);
  const [budgetId, setBudgetId]         = useState('');
  const [proyectos, setProyectos]       = useState<Proyecto[]>([]);
  const [filtroProjectId, setFiltroProjectId] = useState('');

  useEffect(() => {
    fetch('/api/contabilidad/cuentas?soloMovimiento=1')
      .then(r => r.json()).then(d => setCuentas(d.data ?? []));
    fetch('/api/contabilidad/cuentas')
      .then(r => r.json()).then(d => setCuentasTodas(d.data ?? []));
    fetch('/api/presupuesto')
      .then(r => r.json()).then(d => setBudgets(d.data ?? []));
    fetch('/api/proyectos?activos=1')
      .then(r => r.json()).then(d => setProyectos((d.data ?? d ?? []).map((p: Proyecto) => ({ id: p.id, name: p.name }))));
  }, []);

  async function generar() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tipo:  tipoReporte,
        desde: desde.toISOString(),
        hasta: hasta.toISOString(),
      });
      if ((tipoReporte === 'libro_mayor' || tipoReporte === 'libro_auxiliar') && accountId)
        params.set('accountId', accountId);
      if (tipoReporte === 'presupuesto_ejecucion' && budgetId)
        params.set('budgetId', budgetId);
      if (filtroProjectId)
        params.set('projectId', filtroProjectId);
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
                { value: 'estado_actividades',   label: '📊 Estado de Actividades (ONG)' },
                { value: 'balance_general',       label: '🏦 Balance General (Situación Financiera)' },
                { value: 'balance_comprobacion',  label: '⚖️  Balance de Comprobación' },
                { value: 'libro_diario',          label: '📖 Libro Diario' },
                { value: 'libro_mayor',           label: '📋 Libro Mayor' },
                { value: 'libro_auxiliar',        label: '📂 Libro Auxiliar' },
                { value: 'presupuesto_ejecucion', label: '🎯 Presupuesto vs. Ejecución' },
                { value: 'gastos_por_proyecto',   label: '🗂️ Gastos por Proyecto' },
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
              <div style={{ fontSize: 12, marginBottom: 4, fontWeight: 600 }}>Cuenta (con movimiento)</div>
              <Select showSearch style={{ width: '100%' }} placeholder="Seleccionar cuenta..."
                value={accountId || undefined} onChange={setAccountId}
                filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
                options={cuentas.map(c => ({ value: c.id, label: `${c.codigo} — ${c.nombre}` }))} />
            </Col>
          )}
          {tipoReporte === 'libro_auxiliar' && (
            <Col span={7}>
              <div style={{ fontSize: 12, marginBottom: 4, fontWeight: 600 }}>Cuenta agrupadora</div>
              <Select showSearch style={{ width: '100%' }} placeholder="Seleccionar cuenta raíz..."
                value={accountId || undefined} onChange={setAccountId}
                filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
                options={cuentasTodas.map(c => ({ value: c.id, label: `${c.codigo} — ${c.nombre}` }))} />
            </Col>
          )}
          {tipoReporte === 'presupuesto_ejecucion' && (
            <Col span={7}>
              <div style={{ fontSize: 12, marginBottom: 4, fontWeight: 600 }}>Presupuesto</div>
              <Select showSearch style={{ width: '100%' }} placeholder="Seleccionar presupuesto..."
                value={budgetId || undefined} onChange={setBudgetId}
                filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
                options={budgets.map(b => ({ value: b.id, label: `${b.nombre} (${b.anio})` }))} />
            </Col>
          )}
          {(tipoReporte === 'presupuesto_ejecucion' || tipoReporte === 'gastos_por_proyecto') && (
            <Col span={5}>
              <div style={{ fontSize: 12, marginBottom: 4, fontWeight: 600 }}>Filtrar proyecto</div>
              <Select showSearch allowClear style={{ width: '100%' }} placeholder="Todos los proyectos"
                value={filtroProjectId || undefined} onChange={v => setFiltroProjectId(v ?? '')}
                filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
                options={proyectos.map(p => ({ value: p.id, label: p.name }))} />
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
        {resultado && tipoReporte === 'balance_general' && (
          <BalanceGeneralView data={resultado as BalanceGeneralData} />
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
        {resultado && tipoReporte === 'libro_auxiliar' && (
          <LibroAuxiliarView data={resultado as LibroAuxiliarData} />
        )}
        {resultado && tipoReporte === 'presupuesto_ejecucion' && (
          <PresupuestoEjecucionView data={resultado as PresupuestoEjecucionData} />
        )}
        {resultado && tipoReporte === 'gastos_por_proyecto' && (
          <GastosPorProyectoView data={resultado as GastosPorProyectoData} />
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

/* ─── Tipos para reportes Fase B ─────────────────────────────── */
type PresupuestoLinea = {
  id: string; tipo: string; categoria: string; descripcion?: string;
  presupuestado: number; ejecutado: number; variacion: number;
  porcEjecucion: number; sobreEjecutado: boolean;
};
type PresupuestoEjecucionData = {
  budget: { nombre: string; anio: number; estado: string };
  lineas: PresupuestoLinea[];
  resumen: {
    totalPresupIngresos: number; totalPresupGastos: number;
    totalEjecIngresos:   number; totalEjecGastos:   number;
    porcEjecIngresos: number; porcEjecGastos: number;
    superavitPresup: number; superavitReal: number;
  };
};

type ProyectoGasto = { proyectoId: string | null; proyectoNombre: string; gastos: number; ingresos: number; resultado: number };
type GastosPorProyectoData = {
  proyectos: ProyectoGasto[];
  totales: { gastos: number; ingresos: number };
};

/* ─── Tipos de datos para reportes Fase A ────────────────────── */
type LineaBG = { codigo: string; nombre: string; saldo: number; nivel: number };
type BalanceGeneralData = {
  activos: LineaBG[]; pasivos: LineaBG[]; patrimonios: LineaBG[];
  totales: { totalActivo: number; totalPasivo: number; totalPatrimonio: number };
  cuadra: boolean; hasta: string;
};

type AuxiliarSubcuenta = {
  cuenta: { codigo: string; nombre: string; naturaleza: string };
  movimientos: { fecha: string; numero: string; concepto: string; debe: number; haber: number; saldo: number }[];
  totalDebe: number; totalHaber: number; saldoFinal: number;
};
type LibroAuxiliarData = {
  cuentaRaiz: { codigo: string; nombre: string };
  subcuentas: AuxiliarSubcuenta[];
  totales: { totalDebe: number; totalHaber: number; saldoFinal: number };
};

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

/* ─── Balance General ─────────────────────────────────────────── */
function BalanceGeneralView({ data }: { data: BalanceGeneralData }) {
  const { totales } = data;
  const seccion = (titulo: string, lineas: LineaBG[], total: number, color: string) => (
    <Card title={titulo} size="small" style={{ borderRadius: 8, borderTop: `3px solid ${color}` }}>
      <Table
        dataSource={lineas} rowKey="codigo" size="small" pagination={false}
        columns={[
          { title: 'Código', dataIndex: 'codigo', width: 90, render: (v: string) => <code style={{ fontSize: 11 }}>{v}</code> },
          { title: 'Cuenta', dataIndex: 'nombre', ellipsis: true,
            render: (v: string, r: LineaBG) => <span style={{ paddingLeft: (r.nivel - 1) * 12 }}>{v}</span> },
          { title: 'Saldo', dataIndex: 'saldo', align: 'right', width: 120,
            render: (v: number) => <b style={{ color }}>{fmtUSD(v)}</b> },
        ]}
        summary={() => (
          <Table.Summary.Row style={{ fontWeight: 700 }}>
            <Table.Summary.Cell index={0} colSpan={2}>TOTAL {titulo.toUpperCase()}</Table.Summary.Cell>
            <Table.Summary.Cell index={2} align="right"><span style={{ color }}>{fmtUSD(total)}</span></Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />
    </Card>
  );

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>FUNDACIÓN ASISTEDCOS EL SALVADOR</div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>BALANCE GENERAL — ESTADO DE SITUACIÓN FINANCIERA</div>
        <div style={{ color: 'hsl(var(--text-muted))', fontSize: 12 }}>
          Al {dayjs(data.hasta).format('DD/MM/YYYY')}
        </div>
        <div style={{ marginTop: 8 }}>
          {data.cuadra
            ? <Tag color="success">✓ Activo = Pasivo + Patrimonio</Tag>
            : <Tag color="error">⚠ No cuadra — revise el catálogo de cuentas</Tag>}
        </div>
      </div>

      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: '3px solid #2563eb' }}>
            <Statistic title="Total Activo" value={totales.totalActivo} prefix="$" precision={2} valueStyle={{ color: '#2563eb' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: '3px solid #dc2626' }}>
            <Statistic title="Total Pasivo" value={totales.totalPasivo} prefix="$" precision={2} valueStyle={{ color: '#dc2626' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: '3px solid #7c3aed' }}>
            <Statistic title="Patrimonio" value={totales.totalPatrimonio} prefix="$" precision={2} valueStyle={{ color: '#7c3aed' }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          {seccion('Activo', data.activos, totales.totalActivo, '#2563eb')}
        </Col>
        <Col span={12}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {seccion('Pasivo', data.pasivos, totales.totalPasivo, '#dc2626')}
            {seccion('Patrimonio', data.patrimonios, totales.totalPatrimonio, '#7c3aed')}
          </div>
        </Col>
      </Row>

      <Card size="small" style={{ marginTop: 12, borderRadius: 8, textAlign: 'right', background: '#f8f8ff' }}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>
          PASIVO + PATRIMONIO: {fmtUSD(totales.totalPasivo + totales.totalPatrimonio)}
        </span>
      </Card>
    </div>
  );
}

/* ─── Libro Auxiliar ─────────────────────────────────────────── */
function LibroAuxiliarView({ data }: { data: LibroAuxiliarData }) {
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>
          LIBRO AUXILIAR — <code>{data.cuentaRaiz.codigo}</code> {data.cuentaRaiz.nombre}
        </div>
        <div style={{ color: 'hsl(var(--text-muted))', fontSize: 12 }}>
          {data.subcuentas.length} subcuenta(s) con movimientos
        </div>
      </div>

      {data.subcuentas.length === 0 && (
        <Empty description="No hay movimientos en las subcuentas de esta cuenta para el período seleccionado" />
      )}

      {data.subcuentas.map((sub) => (
        <Card
          key={sub.cuenta.codigo}
          size="small"
          style={{ marginBottom: 12, borderRadius: 8 }}
          title={
            <span>
              <code style={{ fontSize: 12 }}>{sub.cuenta.codigo}</code>{' '}
              {sub.cuenta.nombre}{' '}
              <Tag color={sub.cuenta.naturaleza === 'DEUDORA' ? 'blue' : 'orange'} style={{ marginLeft: 8 }}>
                {sub.cuenta.naturaleza}
              </Tag>
            </span>
          }
          extra={
            <span style={{ fontSize: 12 }}>
              Saldo: <b style={{ color: sub.saldoFinal >= 0 ? '#16a34a' : '#dc2626' }}>{fmtUSD(Math.abs(sub.saldoFinal))}</b>
            </span>
          }
        >
          <Table
            dataSource={sub.movimientos} rowKey={(_, i) => String(i)}
            size="small" pagination={false}
            columns={[
              { title: 'Fecha',    dataIndex: 'fecha',   width: 100, render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
              { title: 'N°',       dataIndex: 'numero',  width: 90 },
              { title: 'Concepto', dataIndex: 'concepto', ellipsis: true },
              { title: 'Desc.',    dataIndex: 'descripcion', width: 120, render: (v: string) => v ?? '—' },
              { title: 'Debe',     dataIndex: 'debe',   align: 'right', width: 100, render: (v: number) => v ? fmtUSD(v) : '—' },
              { title: 'Haber',    dataIndex: 'haber',  align: 'right', width: 100, render: (v: number) => v ? fmtUSD(v) : '—' },
              { title: 'Saldo',    dataIndex: 'saldo',  align: 'right', width: 110,
                render: (v: number) => <b style={{ color: v >= 0 ? '#16a34a' : '#dc2626' }}>{fmtUSD(Math.abs(v))}</b> },
            ]}
            summary={() => (
              <Table.Summary.Row style={{ fontWeight: 600 }}>
                <Table.Summary.Cell index={0} colSpan={4}>Subtotal</Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">{fmtUSD(sub.totalDebe)}</Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">{fmtUSD(sub.totalHaber)}</Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right">
                  <b style={{ color: sub.saldoFinal >= 0 ? '#16a34a' : '#dc2626' }}>{fmtUSD(Math.abs(sub.saldoFinal))}</b>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        </Card>
      ))}

      {data.subcuentas.length > 0 && (
        <Card size="small" style={{ borderRadius: 8, textAlign: 'right', background: 'hsl(var(--bg-page))' }}>
          <span style={{ fontWeight: 700 }}>
            TOTAL DEBE: {fmtUSD(data.totales.totalDebe)} &nbsp;|&nbsp;
            TOTAL HABER: {fmtUSD(data.totales.totalHaber)} &nbsp;|&nbsp;
            SALDO NETO: <span style={{ color: data.totales.saldoFinal >= 0 ? '#16a34a' : '#dc2626' }}>
              {fmtUSD(Math.abs(data.totales.saldoFinal))}
            </span>
          </span>
        </Card>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB: TIPOS DE PARTIDA (CRUD)
   ═══════════════════════════════════════════════════════════ */
/* ─── Presupuesto vs. Ejecución ──────────────────────────────── */
function PresupuestoEjecucionView({ data }: { data: PresupuestoEjecucionData }) {
  const { resumen, budget } = data;
  const lineasIngreso = data.lineas.filter(l => l.tipo === 'ingreso');
  const lineasGasto   = data.lineas.filter(l => l.tipo === 'gasto');

  const colsLinea: ColumnsType<PresupuestoLinea> = [
    { title: 'Categoría',     dataIndex: 'categoria',     ellipsis: true },
    { title: 'Descripción',   dataIndex: 'descripcion',   ellipsis: true, render: v => v ?? '—' },
    { title: 'Presupuestado', dataIndex: 'presupuestado', align: 'right', width: 130,
      render: v => fmtUSD(v) },
    { title: 'Ejecutado',     dataIndex: 'ejecutado',     align: 'right', width: 130,
      render: v => fmtUSD(v) },
    { title: 'Variación',     dataIndex: 'variacion',     align: 'right', width: 120,
      render: (v: number, r: PresupuestoLinea) => (
        <span style={{ fontWeight: 700, color: r.sobreEjecutado ? '#dc2626' : '#16a34a' }}>
          {v >= 0 ? '+' : ''}{fmtUSD(v)}
        </span>
      ),
    },
    { title: '% Ejec.',       dataIndex: 'porcEjecucion', align: 'right', width: 90,
      render: (v: number, r: PresupuestoLinea) => (
        <span style={{ fontWeight: 600, color: r.sobreEjecutado ? '#dc2626' : v >= 80 ? '#16a34a' : '#ca8a04' }}>
          {v.toFixed(1)}%
        </span>
      ),
    },
  ];

  const seccion = (titulo: string, lineas: PresupuestoLinea[], presup: number, ejec: number, color: string) => (
    <Card title={<span style={{ color }}>{titulo}</span>} size="small" style={{ marginBottom: 12, borderRadius: 8, borderTop: `3px solid ${color}` }}>
      <Table
        dataSource={lineas} rowKey="id" size="small" pagination={false}
        columns={colsLinea}
        summary={() => (
          <Table.Summary.Row style={{ fontWeight: 700, background: 'hsl(var(--bg-page))' }}>
            <Table.Summary.Cell index={0} colSpan={2}>TOTAL {titulo.toUpperCase()}</Table.Summary.Cell>
            <Table.Summary.Cell index={2} align="right">{fmtUSD(presup)}</Table.Summary.Cell>
            <Table.Summary.Cell index={3} align="right">{fmtUSD(ejec)}</Table.Summary.Cell>
            <Table.Summary.Cell index={4} align="right" colSpan={2}>
              <span style={{ color: ejec > presup ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
                {presup > 0 ? ((ejec / presup) * 100).toFixed(1) : '0.0'}%
              </span>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />
    </Card>
  );

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>FUNDACIÓN ASISTEDCOS EL SALVADOR</div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>ESTADO DE COMPROBACIÓN PRESUPUESTARIA</div>
        <div style={{ color: 'hsl(var(--text-muted))', fontSize: 12 }}>
          {budget.nombre} — Año {budget.anio} <Tag style={{ marginLeft: 8 }}>{budget.estado}</Tag>
        </div>
      </div>

      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: '3px solid #16a34a' }}>
            <Statistic title="Ingresos Presupuestados" value={resumen.totalPresupIngresos} prefix="$" precision={2} valueStyle={{ color: '#16a34a', fontSize: 16 }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: '3px solid #2563eb' }}>
            <Statistic title="Ingresos Ejecutados" value={resumen.totalEjecIngresos} prefix="$" precision={2}
              suffix={<span style={{ fontSize: 13, fontWeight: 700, color: '#2563eb' }}> {resumen.porcEjecIngresos.toFixed(1)}%</span>}
              valueStyle={{ color: '#2563eb', fontSize: 16 }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: '3px solid #dc2626' }}>
            <Statistic title="Gastos Presupuestados" value={resumen.totalPresupGastos} prefix="$" precision={2} valueStyle={{ color: '#dc2626', fontSize: 16 }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: '3px solid #ea580c' }}>
            <Statistic title="Gastos Ejecutados" value={resumen.totalEjecGastos} prefix="$" precision={2}
              suffix={<span style={{ fontSize: 13, fontWeight: 700, color: '#ea580c' }}> {resumen.porcEjecGastos.toFixed(1)}%</span>}
              valueStyle={{ color: '#ea580c', fontSize: 16 }} />
          </Card>
        </Col>
      </Row>

      {seccion('Ingresos', lineasIngreso, resumen.totalPresupIngresos, resumen.totalEjecIngresos, '#16a34a')}
      {seccion('Gastos',   lineasGasto,   resumen.totalPresupGastos,  resumen.totalEjecGastos,  '#dc2626')}

      <Row gutter={12} style={{ marginTop: 8 }}>
        <Col span={12}>
          <Card size="small" style={{ borderRadius: 8, background: resumen.superavitPresup >= 0 ? '#f0fdf4' : '#fef2f2' }}>
            <div style={{ fontWeight: 600, fontSize: 12, color: 'hsl(var(--text-muted))' }}>Superávit presupuestado</div>
            <div style={{ fontWeight: 800, fontSize: 18, color: resumen.superavitPresup >= 0 ? '#16a34a' : '#dc2626' }}>
              {resumen.superavitPresup >= 0 ? '+' : ''}{fmtUSD(resumen.superavitPresup)}
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" style={{ borderRadius: 8, background: resumen.superavitReal >= 0 ? '#f0fdf4' : '#fef2f2' }}>
            <div style={{ fontWeight: 600, fontSize: 12, color: 'hsl(var(--text-muted))' }}>Resultado real ejecutado</div>
            <div style={{ fontWeight: 800, fontSize: 18, color: resumen.superavitReal >= 0 ? '#16a34a' : '#dc2626' }}>
              {resumen.superavitReal >= 0 ? '+' : ''}{fmtUSD(resumen.superavitReal)}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

/* ─── Gastos por Proyecto ─────────────────────────────────────── */
function GastosPorProyectoView({ data }: { data: GastosPorProyectoData }) {
  const maxGasto = Math.max(...data.proyectos.map(p => p.gastos), 1);

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>FUNDACIÓN ASISTEDCOS EL SALVADOR</div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>GASTOS POR CENTRO DE COSTO / PROYECTO</div>
      </div>

      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: '3px solid #dc2626' }}>
            <Statistic title="Total Gastos" value={data.totales.gastos} prefix="$" precision={2} valueStyle={{ color: '#dc2626' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: '3px solid #16a34a' }}>
            <Statistic title="Total Ingresos" value={data.totales.ingresos} prefix="$" precision={2} valueStyle={{ color: '#16a34a' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: '3px solid #6d28d9' }}>
            <Statistic title="Proyectos con movimientos" value={data.proyectos.length} valueStyle={{ color: '#6d28d9' }} />
          </Card>
        </Col>
      </Row>

      <Table
        dataSource={data.proyectos}
        rowKey={r => r.proyectoId ?? 'sin-proyecto'}
        size="small"
        pagination={false}
        columns={[
          { title: 'Proyecto / Centro de Costo', key: 'proyecto',
            render: (_: unknown, r: ProyectoGasto) => r.proyectoId
              ? <Tag color="geekblue">{r.proyectoNombre}</Tag>
              : <span style={{ color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>Sin proyecto asignado</span>
          },
          { title: 'Gastos', dataIndex: 'gastos', align: 'right', width: 130,
            render: (v: number) => <b style={{ color: '#dc2626' }}>{fmtUSD(v)}</b> },
          { title: 'Ingresos', dataIndex: 'ingresos', align: 'right', width: 130,
            render: (v: number) => <b style={{ color: '#16a34a' }}>{fmtUSD(v)}</b> },
          { title: 'Resultado', dataIndex: 'resultado', align: 'right', width: 130,
            render: (v: number) => <b style={{ color: v >= 0 ? '#16a34a' : '#dc2626', fontWeight: 800 }}>
              {v >= 0 ? '+' : ''}{fmtUSD(v)}
            </b> },
          { title: '% del total gastos', key: 'barra', width: 180,
            render: (_: unknown, r: ProyectoGasto) => {
              const pct = maxGasto > 0 ? (r.gastos / maxGasto) * 100 : 0;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ flex: 1, background: '#fee2e2', borderRadius: 4, height: 10 }}>
                    <div style={{ width: `${pct}%`, background: '#dc2626', height: '100%', borderRadius: 4, transition: 'width .3s' }} />
                  </div>
                  <span style={{ fontSize: 11, minWidth: 38, color: 'hsl(var(--text-muted))' }}>
                    {data.totales.gastos > 0 ? ((r.gastos / data.totales.gastos) * 100).toFixed(1) : '0.0'}%
                  </span>
                </div>
              );
            },
          },
        ]}
        summary={() => (
          <Table.Summary.Row style={{ fontWeight: 700, background: 'hsl(var(--bg-page))' }}>
            <Table.Summary.Cell index={0}>TOTAL</Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right"><span style={{ color: '#dc2626' }}>{fmtUSD(data.totales.gastos)}</span></Table.Summary.Cell>
            <Table.Summary.Cell index={2} align="right"><span style={{ color: '#16a34a' }}>{fmtUSD(data.totales.ingresos)}</span></Table.Summary.Cell>
            <Table.Summary.Cell index={3} align="right">
              <span style={{ color: (data.totales.ingresos - data.totales.gastos) >= 0 ? '#16a34a' : '#dc2626' }}>
                {fmtUSD(data.totales.ingresos - data.totales.gastos)}
              </span>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={4} />
          </Table.Summary.Row>
        )}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB: TIPOS DE PARTIDA (CRUD)
   ═══════════════════════════════════════════════════════════ */
function TiposPartidaTab() {
  const [data, setData]       = useState<TipoPartida[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState<TipoPartida | null>(null);
  const [saving, setSaving]   = useState(false);
  const [form]                = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/contabilidad/tipos-partida');
      const d = await r.json();
      setData(d.data ?? []);
    } catch { toast.error('Error cargando tipos de partida'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditing(null);
    form.resetFields();
    setModal(true);
  }

  function openEdit(t: TipoPartida) {
    setEditing(t);
    form.setFieldsValue({ nombre: t.nombre, descripcion: t.descripcion, activo: t.activo, orden: t.orden });
    setModal(true);
  }

  async function onSave() {
    try {
      const vals = await form.validateFields();
      setSaving(true);
      const url    = editing ? `/api/contabilidad/tipos-partida/${editing.id}` : '/api/contabilidad/tipos-partida';
      const method = editing ? 'PUT' : 'POST';
      const body   = editing
        ? { nombre: vals.nombre, descripcion: vals.descripcion, activo: vals.activo, orden: vals.orden }
        : { codigo: vals.codigo, nombre: vals.nombre, descripcion: vals.descripcion, orden: vals.orden };
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error ?? 'Error'); }
      toast.success(editing ? 'Tipo actualizado' : 'Tipo creado');
      setModal(false); load();
    } catch (e: unknown) {
      if (e instanceof Error) toast.error(e.message);
    } finally { setSaving(false); }
  }

  async function eliminar(t: TipoPartida) {
    try {
      const r = await fetch(`/api/contabilidad/tipos-partida/${t.id}`, { method: 'DELETE' });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error ?? 'Error'); }
      toast.success('Tipo eliminado');
      load();
    } catch (e: unknown) {
      if (e instanceof Error) toast.error(e.message);
    }
  }

  const cols: ColumnsType<TipoPartida> = [
    { title: 'Código', dataIndex: 'codigo', width: 130,
      render: v => <Tag style={{ fontFamily: 'monospace', fontWeight: 700 }}>{v}</Tag> },
    { title: 'Nombre', dataIndex: 'nombre', ellipsis: true },
    { title: 'Descripción', dataIndex: 'descripcion', ellipsis: true, render: v => v ?? '—' },
    { title: 'Orden', dataIndex: 'orden', width: 70, align: 'center' },
    { title: 'Estado', dataIndex: 'activo', width: 90, align: 'center',
      render: v => <Badge status={v ? 'success' : 'default'} text={v ? 'Activo' : 'Inactivo'} /> },
    { title: 'Acciones', key: 'acc', width: 100, align: 'right',
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" icon={<PencilSimple size={13} />} onClick={() => openEdit(r)} />
          <Popconfirm title="¿Eliminar este tipo? Solo se puede si no tiene asientos asociados." onConfirm={() => eliminar(r)}>
            <Button size="small" danger icon={<Trash size={13} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Alert
        type="info" showIcon style={{ marginBottom: 16 }}
        message="Los tipos de partida definen la naturaleza de cada asiento contable. Se usan en el formulario de asientos."
      />

      <Row justify="end" style={{ marginBottom: 12 }}>
        <Button type="primary" icon={<Plus size={14} />} onClick={openNew}>
          Nuevo tipo
        </Button>
      </Row>

      <Table dataSource={data} columns={cols} rowKey="id" loading={loading} size="small" pagination={false} />

      <Modal
        title={editing ? 'Editar tipo de partida' : 'Nuevo tipo de partida'}
        open={modal} onCancel={() => setModal(false)} footer={null}
      >
        <Form form={form} layout="vertical" onFinish={onSave}>
          {!editing && (
            <Form.Item name="codigo" label="Código" rules={[{ required: true, message: 'Requerido' }]}
              extra="Ej: DIARIO, AJUSTE, VENTA, COMPRA, DEPRECIACION. Se guardará en MAYÚSCULAS.">
              <Input maxLength={30} placeholder="Ej: DEPRECIACION" style={{ textTransform: 'uppercase' }} />
            </Form.Item>
          )}
          <Form.Item name="nombre" label="Nombre descriptivo" rules={[{ required: true }]}>
            <Input maxLength={100} placeholder="Ej: Depreciación de activos" />
          </Form.Item>
          <Form.Item name="descripcion" label="Descripción (opcional)">
            <Input.TextArea rows={2} maxLength={300} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="orden" label="Orden en lista" initialValue={0}>
                <InputNumber min={0} max={999} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            {editing && (
              <Col span={12}>
                <Form.Item name="activo" label="Estado" initialValue={true}>
                  <Select options={[{ value: true, label: 'Activo' }, { value: false, label: 'Inactivo' }]} />
                </Form.Item>
              </Col>
            )}
          </Row>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              {editing ? 'Guardar' : 'Crear tipo'}
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
}
