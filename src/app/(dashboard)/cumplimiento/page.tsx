'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import {
  Tabs, Table, Button, Modal, Form, Input, Select, DatePicker,
  Space, Tag, Popconfirm, Row, Col, Card, Statistic, Alert,
  Badge, Spin, Tooltip, Switch, InputNumber, Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ShieldCheck, Warning, FileText, UserCircleCheck,
  CheckCircle, XCircle, ArrowFatUp, Plus, PencilSimple,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import PageHeader from '@/components/shared/PageHeader';

/* ─── Tipos ──────────────────────────────────────────────── */
type DonorSimple = { id: string; name: string; nit?: string; dui?: string; isCompany: boolean };

type Diligencia = {
  id: string; donorId: string;
  donor: { id: string; name: string; nit?: string; dui?: string; isCompany: boolean };
  nivelRiesgo: 'BAJO' | 'MEDIO' | 'ALTO' | 'MUY_ALTO';
  tipoFuente: string; fuenteFondos?: string; propositoFondos?: string;
  montoAnualEstimado?: number;
  verificadoOFAC: boolean; verificadoONU: boolean; verificadoINTERPOL: boolean;
  fechaVerificacion?: string;
  estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'REQUIERE_INFO';
  observaciones?: string; revisadoPor?: string; fechaRevision?: string;
  proximaRevision?: string; createdAt: string; updatedAt: string;
};

type AmlAlerta = {
  id: string; tipo: string; estado: string;
  donorId?: string; donor?: { name: string; nit?: string };
  donationId?: string; donation?: { amount: number; date: string; paymentMethod: string };
  descripcion: string; montoInvolucrado?: number;
  revisadoPor?: string; fechaRevision?: string; notasRevision?: string;
  rosId?: string; ros?: { numero: string; estado: string };
  createdAt: string;
};

type ROS = {
  id: string; numero: string; estado: 'BORRADOR' | 'ENVIADO';
  donorId?: string; donor?: { name: string };
  descripcion: string; montoEstimado?: number; fechaOperacion: string;
  tipoActividad: string; mediosUtilizados?: string;
  fechaEnvio?: string; referencia?: string;
  alertas: { id: string; tipo: string }[];
  createdAt: string;
};

/* ─── Constantes ─────────────────────────────────────────── */
const RIESGO_COLOR: Record<string, string> = {
  BAJO: 'success', MEDIO: 'warning', ALTO: 'orange', MUY_ALTO: 'error',
};
const ESTADO_DD_COLOR: Record<string, string> = {
  PENDIENTE: 'default', APROBADA: 'success', RECHAZADA: 'error', REQUIERE_INFO: 'warning',
};
const TIPO_ALERTA_LABEL: Record<string, string> = {
  EFECTIVO_ALTO:      'Efectivo ≥ $10,000',
  FRACCIONAMIENTO:    'Fraccionamiento',
  DONANTE_SIN_DD:     'Sin debida diligencia',
  DONANTE_EXTRANJERO: 'Donante extranjero',
  PATRON_INUSUAL:     'Patrón inusual',
};
const TIPO_ALERTA_COLOR: Record<string, string> = {
  EFECTIVO_ALTO: 'red', FRACCIONAMIENTO: 'volcano', DONANTE_SIN_DD: 'orange',
  DONANTE_EXTRANJERO: 'geekblue', PATRON_INUSUAL: 'purple',
};
const ESTADO_ALERTA_COLOR: Record<string, string> = {
  PENDIENTE: 'warning', REVISADA: 'processing', DESCARTADA: 'default', ESCALADA: 'error',
};

function fmtUSD(n: number) {
  return new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(Number(n ?? 0));
}

/* ═══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════════════ */
function CumplimientoInner() {
  return (
    <div>
      <PageHeader
        title="Cumplimiento AML"
        description="Antilavado de activos — Decreto 426 (oct 2025) · Debida Diligencia · Alertas · Reportes ROS"
        icon={<ShieldCheck size={22} />}
      />
      <Tabs
        type="card"
        style={{ marginTop: 8 }}
        items={[
          { key: 'panel',      label: <span><ShieldCheck size={14} style={{ marginRight: 5 }} />Panel</span>,           children: <PanelTab /> },
          { key: 'diligencia', label: <span><UserCircleCheck size={14} style={{ marginRight: 5 }} />Debida Diligencia</span>, children: <DiligenciaTab /> },
          { key: 'alertas',    label: <span><Warning size={14} style={{ marginRight: 5 }} />Alertas AML</span>,          children: <AlertasTab /> },
          { key: 'ros',        label: <span><FileText size={14} style={{ marginRight: 5 }} />Reportes ROS</span>,         children: <RosTab /> },
        ]}
      />
    </div>
  );
}

export default function CumplimientoPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>}>
      <CumplimientoInner />
    </Suspense>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB: PANEL
   ═══════════════════════════════════════════════════════════ */
function PanelTab() {
  const [diligencias, setDiligencias] = useState<Diligencia[]>([]);
  const [alertas,     setAlertas]     = useState<AmlAlerta[]>([]);
  const [ros,         setRos]         = useState<ROS[]>([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/cumplimiento/diligencia').then(r => r.json()),
      fetch('/api/cumplimiento/alertas').then(r => r.json()),
      fetch('/api/cumplimiento/ros').then(r => r.json()),
    ]).then(([d, a, r]) => {
      setDiligencias(d.data ?? []);
      setAlertas(a.data ?? []);
      setRos(r.data ?? []);
    }).catch(() => toast.error('Error cargando datos'))
      .finally(() => setLoading(false));
  }, []);

  const aprobadas        = diligencias.filter(d => d.estado === 'APROBADA').length;
  const sinDD            = diligencias.filter(d => d.estado !== 'APROBADA').length;
  const alertasPendientes = alertas.filter(a => a.estado === 'PENDIENTE').length;
  const rosBorrador      = ros.filter(r => r.estado === 'BORRADOR').length;
  const rosEnviados      = ros.filter(r => r.estado === 'ENVIADO').length;

  const anio = new Date().getFullYear();
  const alertasPorTipo = Object.entries(
    alertas.filter(a => a.estado === 'PENDIENTE').reduce((acc, a) => {
      acc[a.tipo] = (acc[a.tipo] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  );

  return (
    <Spin spinning={loading}>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: '3px solid #16a34a' }}>
            <Statistic title="Con diligencia aprobada" value={aprobadas} valueStyle={{ color: '#16a34a' }}
              suffix={<span style={{ fontSize: 12 }}>donantes</span>} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: `3px solid ${sinDD > 0 ? '#dc2626' : '#16a34a'}` }}>
            <Statistic title="Sin diligencia aprobada" value={sinDD}
              valueStyle={{ color: sinDD > 0 ? '#dc2626' : '#16a34a' }}
              suffix={<span style={{ fontSize: 12 }}>donantes</span>} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: `3px solid ${alertasPendientes > 0 ? '#f59e0b' : '#16a34a'}` }}>
            <Statistic title="Alertas pendientes" value={alertasPendientes}
              valueStyle={{ color: alertasPendientes > 0 ? '#f59e0b' : '#16a34a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: '3px solid #6d28d9' }}>
            <Statistic title={`ROS ${anio}`}
              value={rosEnviados}
              suffix={<span style={{ fontSize: 12, color: '#f59e0b' }}> ({rosBorrador} borrador)</span>}
              valueStyle={{ color: '#6d28d9' }} />
          </Card>
        </Col>
      </Row>

      {alertasPendientes > 0 && (
        <Alert
          type="warning" showIcon
          message={`Hay ${alertasPendientes} alerta(s) AML pendientes de revisión`}
          description="Revisar las alertas en la pestaña 'Alertas AML' para garantizar el cumplimiento del Decreto 426."
          style={{ marginBottom: 16 }}
        />
      )}

      {sinDD > 0 && (
        <Alert
          type="error" showIcon
          message={`${sinDD} donante(s) activos sin debida diligencia aprobada`}
          description="El Decreto 426 exige KYD (Know Your Donor) para todos los donantes. Completar en la pestaña 'Debida Diligencia'."
          style={{ marginBottom: 16 }}
        />
      )}

      {alertasPorTipo.length > 0 && (
        <Card title="Alertas pendientes por tipo" size="small" style={{ borderRadius: 8 }}>
          <Row gutter={[12, 12]}>
            {alertasPorTipo.map(([tipo, count]) => (
              <Col key={tipo} span={8}>
                <Card size="small" style={{ borderRadius: 6, borderLeft: `3px solid` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Tag color={TIPO_ALERTA_COLOR[tipo] ?? 'default'} style={{ margin: 0 }}>
                      {TIPO_ALERTA_LABEL[tipo] ?? tipo}
                    </Tag>
                    <span style={{ fontWeight: 700, fontSize: 18 }}>{count}</span>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {alertasPorTipo.length === 0 && !loading && (
        <Card size="small" style={{ borderRadius: 8, textAlign: 'center', padding: 32 }}>
          <CheckCircle size={40} color="#16a34a" />
          <div style={{ marginTop: 12, fontWeight: 600, color: '#16a34a' }}>
            Sin alertas AML pendientes
          </div>
          <div style={{ color: 'hsl(var(--text-muted))', fontSize: 13 }}>
            El sistema de cumplimiento está al día
          </div>
        </Card>
      )}
    </Spin>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB: DEBIDA DILIGENCIA (KYD)
   ═══════════════════════════════════════════════════════════ */
function DiligenciaTab() {
  const [data,    setData]    = useState<Diligencia[]>([]);
  const [donors,  setDonors]  = useState<DonorSimple[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState<Diligencia | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [form]                = Form.useForm();
  const [filtroEstado, setFiltroEstado] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = filtroEstado ? `?estado=${filtroEstado}` : '';
      const r = await fetch(`/api/cumplimiento/diligencia${q}`);
      const d = await r.json();
      setData(d.data ?? []);
    } catch { toast.error('Error cargando diligencias'); }
    finally { setLoading(false); }
  }, [filtroEstado]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch('/api/donantes').then(r => r.json())
      .then(d => setDonors((d.data ?? []).map((x: DonorSimple) => ({ id: x.id, name: x.name, nit: x.nit, dui: x.dui, isCompany: x.isCompany }))));
  }, []);

  function openNew() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ nivelRiesgo: 'BAJO', tipoFuente: 'NACIONAL', estado: 'PENDIENTE' });
    setModal(true);
  }

  function openEdit(d: Diligencia) {
    setEditing(d);
    form.setFieldsValue({
      donorId:            d.donorId,
      nivelRiesgo:        d.nivelRiesgo,
      tipoFuente:         d.tipoFuente,
      fuenteFondos:       d.fuenteFondos,
      propositoFondos:    d.propositoFondos,
      montoAnualEstimado: d.montoAnualEstimado,
      verificadoOFAC:     d.verificadoOFAC,
      verificadoONU:      d.verificadoONU,
      verificadoINTERPOL: d.verificadoINTERPOL,
      fechaVerificacion:  d.fechaVerificacion ? dayjs(d.fechaVerificacion) : null,
      estado:             d.estado,
      observaciones:      d.observaciones,
      proximaRevision:    d.proximaRevision   ? dayjs(d.proximaRevision)  : null,
    });
    setModal(true);
  }

  async function onSave() {
    try {
      const vals = await form.validateFields();
      setSaving(true);
      const url    = editing ? `/api/cumplimiento/diligencia/${editing.id}` : '/api/cumplimiento/diligencia';
      const method = editing ? 'PUT' : 'POST';
      const body = {
        ...vals,
        fechaVerificacion: vals.fechaVerificacion?.toISOString() ?? null,
        proximaRevision:   vals.proximaRevision?.toISOString()   ?? null,
      };
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error ?? 'Error'); }
      toast.success(editing ? 'Diligencia actualizada' : 'Diligencia creada');
      setModal(false); load();
    } catch (e: unknown) {
      if (e instanceof Error) toast.error(e.message);
    } finally { setSaving(false); }
  }

  const cols: ColumnsType<Diligencia> = [
    { title: 'Donante', key: 'donor', ellipsis: true,
      render: (_, r) => <span><b>{r.donor.name}</b><br /><span style={{ fontSize: 11, color: 'hsl(var(--text-muted))' }}>{r.donor.nit ?? r.donor.dui ?? '—'}</span></span> },
    { title: 'Riesgo', dataIndex: 'nivelRiesgo', width: 100,
      render: v => <Tag color={RIESGO_COLOR[v] ?? 'default'}>{v.replace('_', ' ')}</Tag> },
    { title: 'Fuente', dataIndex: 'tipoFuente', width: 130,
      render: v => <Tag>{v}</Tag> },
    { title: 'Verificaciones', key: 'verif', width: 160,
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="OFAC"><Tag color={r.verificadoOFAC ? 'success' : 'default'}>OFAC</Tag></Tooltip>
          <Tooltip title="ONU"><Tag color={r.verificadoONU ? 'success' : 'default'}>ONU</Tag></Tooltip>
          <Tooltip title="INTERPOL"><Tag color={r.verificadoINTERPOL ? 'success' : 'default'}>INTERPOL</Tag></Tooltip>
        </Space>
      ),
    },
    { title: 'Estado', dataIndex: 'estado', width: 130,
      render: v => <Badge status={ESTADO_DD_COLOR[v] as 'success' | 'error' | 'warning' | 'default'} text={v.replace('_', ' ')} /> },
    { title: 'Próxima revisión', dataIndex: 'proximaRevision', width: 130,
      render: v => v ? <span style={{ fontSize: 12 }}>{dayjs(v).format('DD/MM/YYYY')}</span> : '—' },
    { title: 'Acciones', key: 'acc', width: 80, align: 'right',
      render: (_, r) => (
        <Button size="small" icon={<PencilSimple size={13} />} onClick={() => openEdit(r)} />
      ),
    },
  ];

  return (
    <>
      <Alert type="info" showIcon style={{ marginBottom: 16 }}
        message="KYD — Know Your Donor"
        description="El Decreto 426 (oct 2025) exige identificar y verificar a cada donante. Registra la fuente de fondos, verifica contra listas OFAC/ONU/INTERPOL y asigna el nivel de riesgo." />

      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col>
          <Select placeholder="Filtrar por estado" allowClear style={{ width: 200 }}
            value={filtroEstado || undefined} onChange={v => setFiltroEstado(v ?? '')}
            options={[
              { value: 'PENDIENTE',      label: 'Pendiente' },
              { value: 'APROBADA',       label: 'Aprobada' },
              { value: 'RECHAZADA',      label: 'Rechazada' },
              { value: 'REQUIERE_INFO',  label: 'Requiere información' },
            ]} />
        </Col>
        <Col>
          <Button type="primary" icon={<Plus size={14} />} onClick={openNew}>
            Nueva diligencia
          </Button>
        </Col>
      </Row>

      <Table dataSource={data} columns={cols} rowKey="id" loading={loading} size="small"
        pagination={{ pageSize: 20 }}
        locale={{ emptyText: <Empty description="No hay registros de debida diligencia" /> }} />

      <Modal
        title={editing ? 'Editar Debida Diligencia' : 'Nueva Debida Diligencia (KYD)'}
        open={modal} onCancel={() => setModal(false)} footer={null} width={720}
        styles={{ body: { maxHeight: '80vh', overflowY: 'auto' } }}
      >
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Row gutter={12}>
            {!editing && (
              <Col span={24}>
                <Form.Item name="donorId" label="Donante" rules={[{ required: true }]}>
                  <Select showSearch placeholder="Buscar donante..."
                    filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
                    options={donors.map(d => ({ value: d.id, label: `${d.name} — ${d.nit ?? d.dui ?? 'Sin ID'}` }))} />
                </Form.Item>
              </Col>
            )}
            <Col span={8}>
              <Form.Item name="nivelRiesgo" label="Nivel de riesgo" rules={[{ required: true }]}>
                <Select options={[
                  { value: 'BAJO',     label: 'Bajo' },
                  { value: 'MEDIO',    label: 'Medio' },
                  { value: 'ALTO',     label: 'Alto' },
                  { value: 'MUY_ALTO', label: 'Muy alto' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="tipoFuente" label="Tipo de fuente" rules={[{ required: true }]}>
                <Select options={[
                  { value: 'NACIONAL',          label: 'Nacional' },
                  { value: 'EXTRANJERO',         label: 'Extranjero' },
                  { value: 'INTERNACIONAL_ONG',  label: 'ONG Internacional' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="estado" label="Estado" rules={[{ required: true }]}>
                <Select options={[
                  { value: 'PENDIENTE',     label: 'Pendiente' },
                  { value: 'APROBADA',      label: 'Aprobada' },
                  { value: 'RECHAZADA',     label: 'Rechazada' },
                  { value: 'REQUIERE_INFO', label: 'Requiere información' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="fuenteFondos" label="Fuente de fondos">
                <Input.TextArea rows={2} maxLength={500} placeholder="Descripción de dónde provienen los fondos" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="propositoFondos" label="Propósito de los fondos">
                <Input.TextArea rows={2} maxLength={500} placeholder="Para qué destina los fondos la ONG" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="montoAnualEstimado" label="Monto anual estimado ($)">
                <InputNumber style={{ width: '100%' }} min={0} precision={2} placeholder="0.00" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="fechaVerificacion" label="Fecha de verificación">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="proximaRevision" label="Próxima revisión">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="verificadoOFAC" label="Verificado OFAC" valuePropName="checked" initialValue={false}>
                <Switch checkedChildren="Sí" unCheckedChildren="No" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="verificadoONU" label="Verificado ONU" valuePropName="checked" initialValue={false}>
                <Switch checkedChildren="Sí" unCheckedChildren="No" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="verificadoINTERPOL" label="Verificado INTERPOL" valuePropName="checked" initialValue={false}>
                <Switch checkedChildren="Sí" unCheckedChildren="No" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="observaciones" label="Observaciones">
                <Input.TextArea rows={3} maxLength={1000} />
              </Form.Item>
            </Col>
          </Row>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              {editing ? 'Guardar cambios' : 'Crear diligencia'}
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB: ALERTAS AML
   ═══════════════════════════════════════════════════════════ */
function AlertasTab() {
  const [data,    setData]    = useState<AmlAlerta[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('PENDIENTE');
  const [filtroTipo,   setFiltroTipo]   = useState('');
  const [modalNotas,   setModalNotas]   = useState<AmlAlerta | null>(null);
  const [notas,        setNotas]        = useState('');
  const [saving,       setSaving]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroEstado) params.set('estado', filtroEstado);
      if (filtroTipo)   params.set('tipo',   filtroTipo);
      const r = await fetch(`/api/cumplimiento/alertas?${params}`);
      const d = await r.json();
      setData(d.data ?? []);
    } catch { toast.error('Error cargando alertas'); }
    finally { setLoading(false); }
  }, [filtroEstado, filtroTipo]);

  useEffect(() => { load(); }, [load]);

  async function accion(id: string, action: 'revisar' | 'descartar' | 'escalar', notasRevision?: string) {
    setSaving(true);
    try {
      const r = await fetch(`/api/cumplimiento/alertas/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notasRevision }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error ?? 'Error'); }
      const labels = { revisar: 'Alerta revisada', descartar: 'Alerta descartada', escalar: 'Alerta escalada a ROS' };
      toast.success(labels[action]);
      setModalNotas(null); load();
    } catch (e: unknown) {
      if (e instanceof Error) toast.error(e.message);
    } finally { setSaving(false); }
  }

  const cols: ColumnsType<AmlAlerta> = [
    { title: 'Tipo', dataIndex: 'tipo', width: 180,
      render: v => <Tag color={TIPO_ALERTA_COLOR[v] ?? 'default'}>{TIPO_ALERTA_LABEL[v] ?? v}</Tag> },
    { title: 'Donante', key: 'donor',
      render: (_, r) => r.donor
        ? <span><b>{r.donor.name}</b>{r.donor.nit && <span style={{ fontSize: 11, color: 'hsl(var(--text-muted))' }}> — {r.donor.nit}</span>}</span>
        : <span style={{ color: 'hsl(var(--text-muted))' }}>—</span> },
    { title: 'Descripción', dataIndex: 'descripcion', ellipsis: true },
    { title: 'Monto', dataIndex: 'montoInvolucrado', width: 120, align: 'right',
      render: v => v ? <b style={{ color: '#dc2626' }}>{fmtUSD(v)}</b> : '—' },
    { title: 'Estado', dataIndex: 'estado', width: 120,
      render: v => <Badge status={ESTADO_ALERTA_COLOR[v] as 'warning' | 'processing' | 'default' | 'error'} text={v} /> },
    { title: 'Fecha', dataIndex: 'createdAt', width: 100,
      render: v => dayjs(v).format('DD/MM/YYYY') },
    { title: 'Acciones', key: 'acc', width: 170, align: 'right',
      render: (_, r) => r.estado === 'PENDIENTE' ? (
        <Space size={4}>
          <Tooltip title="Marcar como revisada">
            <Popconfirm title="¿Marcar como revisada?" onConfirm={() => accion(r.id, 'revisar')}>
              <Button size="small" type="primary" icon={<CheckCircle size={13} />} />
            </Popconfirm>
          </Tooltip>
          <Tooltip title="Descartar alerta">
            <Button size="small" onClick={() => { setModalNotas(r); setNotas(''); }} icon={<XCircle size={13} />} />
          </Tooltip>
          <Tooltip title="Escalar a ROS">
            <Popconfirm title="¿Escalar esta alerta a Reporte de Operación Sospechosa?" onConfirm={() => accion(r.id, 'escalar')}>
              <Button size="small" danger icon={<ArrowFatUp size={13} />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ) : (
        <span style={{ fontSize: 11, color: 'hsl(var(--text-muted))' }}>
          {r.fechaRevision ? dayjs(r.fechaRevision).format('DD/MM/YY') : '—'}
        </span>
      ),
    },
  ];

  return (
    <>
      <Row gutter={12} justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col>
          <Space>
            <Select placeholder="Estado" allowClear style={{ width: 160 }}
              value={filtroEstado || undefined} onChange={v => setFiltroEstado(v ?? '')}
              options={[
                { value: 'PENDIENTE',  label: 'Pendientes' },
                { value: 'REVISADA',   label: 'Revisadas' },
                { value: 'DESCARTADA', label: 'Descartadas' },
                { value: 'ESCALADA',   label: 'Escaladas' },
              ]} />
            <Select placeholder="Tipo" allowClear style={{ width: 200 }}
              value={filtroTipo || undefined} onChange={v => setFiltroTipo(v ?? '')}
              options={Object.entries(TIPO_ALERTA_LABEL).map(([k, v]) => ({ value: k, label: v }))} />
          </Space>
        </Col>
      </Row>

      <Table dataSource={data} columns={cols} rowKey="id" loading={loading} size="small"
        pagination={{ pageSize: 20 }}
        locale={{ emptyText: <Empty description="No hay alertas para los filtros seleccionados" /> }}
        expandable={{
          expandedRowRender: r => r.notasRevision ? (
            <div style={{ padding: '4px 8px', fontSize: 12 }}>
              <b>Notas de revisión:</b> {r.notasRevision}
              {r.ros && <span style={{ marginLeft: 16 }}>→ ROS: <Tag color="red">{r.ros.numero}</Tag></span>}
            </div>
          ) : null,
          rowExpandable: r => !!r.notasRevision,
        }}
      />

      {/* Modal descartar con notas */}
      <Modal
        title="Descartar alerta"
        open={!!modalNotas} onCancel={() => setModalNotas(null)} footer={null}
      >
        <div style={{ marginBottom: 12, fontSize: 13 }}>
          <b>{modalNotas && TIPO_ALERTA_LABEL[modalNotas.tipo]}</b><br />
          <span style={{ color: 'hsl(var(--text-muted))' }}>{modalNotas?.descripcion}</span>
        </div>
        <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 13 }}>Motivo del descarte (opcional):</div>
        <Input.TextArea rows={3} value={notas} onChange={e => setNotas(e.target.value)}
          placeholder="Explica por qué se descarta esta alerta..." maxLength={500} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button onClick={() => setModalNotas(null)}>Cancelar</Button>
          <Button danger loading={saving}
            onClick={() => modalNotas && accion(modalNotas.id, 'descartar', notas)}>
            Descartar alerta
          </Button>
        </div>
      </Modal>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB: REPORTES ROS
   ═══════════════════════════════════════════════════════════ */
function RosTab() {
  const [data,    setData]    = useState<ROS[]>([]);
  const [donors,  setDonors]  = useState<DonorSimple[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState<ROS | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [form]                = Form.useForm();
  const [modalEnviar, setModalEnviar] = useState<ROS | null>(null);
  const [referencia,  setReferencia]  = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/cumplimiento/ros');
      const d = await r.json();
      setData(d.data ?? []);
    } catch { toast.error('Error cargando ROS'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch('/api/donantes').then(r => r.json())
      .then(d => setDonors((d.data ?? []).map((x: DonorSimple) => ({ id: x.id, name: x.name }))));
  }, []);

  function openNew() {
    setEditing(null);
    form.resetFields();
    form.setFieldValue('fechaOperacion', dayjs());
    setModal(true);
  }

  function openEdit(r: ROS) {
    setEditing(r);
    form.setFieldsValue({
      donorId:          r.donorId,
      descripcion:      r.descripcion,
      montoEstimado:    r.montoEstimado,
      fechaOperacion:   dayjs(r.fechaOperacion),
      tipoActividad:    r.tipoActividad,
      mediosUtilizados: r.mediosUtilizados,
    });
    setModal(true);
  }

  async function onSave() {
    try {
      const vals = await form.validateFields();
      setSaving(true);
      const url    = editing ? `/api/cumplimiento/ros/${editing.id}` : '/api/cumplimiento/ros';
      const method = editing ? 'PUT' : 'POST';
      const body = { ...vals, fechaOperacion: vals.fechaOperacion?.toISOString() };
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error ?? 'Error'); }
      toast.success(editing ? 'ROS actualizado' : 'ROS creado');
      setModal(false); load();
    } catch (e: unknown) {
      if (e instanceof Error) toast.error(e.message);
    } finally { setSaving(false); }
  }

  async function enviar() {
    if (!modalEnviar) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/cumplimiento/ros/${modalEnviar.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enviar', referencia }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error ?? 'Error'); }
      toast.success('ROS marcado como enviado a UAF/FGR');
      setModalEnviar(null); load();
    } catch (e: unknown) {
      if (e instanceof Error) toast.error(e.message);
    } finally { setSaving(false); }
  }

  const cols: ColumnsType<ROS> = [
    { title: 'N° ROS', dataIndex: 'numero', width: 130,
      render: v => <Tag style={{ fontFamily: 'monospace', fontWeight: 700 }}>{v}</Tag> },
    { title: 'Donante', key: 'donor',
      render: (_, r) => r.donor ? r.donor.name : <span style={{ color: 'hsl(var(--text-muted))' }}>No especificado</span> },
    { title: 'Tipo de actividad', dataIndex: 'tipoActividad', ellipsis: true },
    { title: 'Monto estimado', dataIndex: 'montoEstimado', width: 130, align: 'right',
      render: v => v ? fmtUSD(v) : '—' },
    { title: 'Fecha operación', dataIndex: 'fechaOperacion', width: 130,
      render: v => dayjs(v).format('DD/MM/YYYY') },
    { title: 'Estado', dataIndex: 'estado', width: 110,
      render: v => <Badge status={v === 'ENVIADO' ? 'success' : 'processing'}
        text={v === 'ENVIADO' ? `Enviado` : 'Borrador'} /> },
    { title: 'Fecha envío', dataIndex: 'fechaEnvio', width: 110,
      render: v => v ? dayjs(v).format('DD/MM/YYYY') : '—' },
    { title: 'Acciones', key: 'acc', width: 130, align: 'right',
      render: (_, r) => (
        <Space size={4}>
          {r.estado === 'BORRADOR' && (
            <>
              <Tooltip title="Editar">
                <Button size="small" icon={<PencilSimple size={13} />} onClick={() => openEdit(r)} />
              </Tooltip>
              <Tooltip title="Marcar como enviado a UAF/FGR">
                <Button size="small" type="primary" icon={<ArrowFatUp size={13} />}
                  onClick={() => { setModalEnviar(r); setReferencia(''); }}>
                  Enviar
                </Button>
              </Tooltip>
            </>
          )}
          {r.estado === 'ENVIADO' && r.referencia && (
            <Tag color="success" style={{ fontSize: 11 }}>Ref: {r.referencia}</Tag>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Alert type="warning" showIcon style={{ marginBottom: 16 }}
        message="Reportes de Operación Sospechosa (ROS)"
        description="Según el Decreto 426, las ONGs deben reportar operaciones sospechosas a la Unidad de Investigación Financiera (UAF) o Fiscalía General de la República. Los registros deben conservarse por 15 años." />

      <Row justify="end" style={{ marginBottom: 12 }}>
        <Button type="primary" icon={<Plus size={14} />} onClick={openNew}>
          Nuevo ROS
        </Button>
      </Row>

      <Table dataSource={data} columns={cols} rowKey="id" loading={loading} size="small"
        pagination={{ pageSize: 20 }}
        expandable={{
          expandedRowRender: r => (
            <div style={{ padding: '8px 16px', fontSize: 12 }}>
              <b>Descripción:</b> {r.descripcion}<br />
              {r.mediosUtilizados && <><b>Medios utilizados:</b> {r.mediosUtilizados}<br /></>}
              {r.alertas.length > 0 && (
                <><b>Alertas vinculadas:</b> {r.alertas.map(a => <Tag key={a.id} style={{ fontSize: 11 }}>{TIPO_ALERTA_LABEL[a.tipo] ?? a.tipo}</Tag>)}</>
              )}
            </div>
          ),
        }}
      />

      {/* Modal crear/editar ROS */}
      <Modal
        title={editing ? `Editar ${editing.numero}` : 'Nuevo Reporte de Operación Sospechosa'}
        open={modal} onCancel={() => setModal(false)} footer={null} width={680}
      >
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="donorId" label="Donante involucrado (opcional)">
                <Select showSearch allowClear placeholder="Seleccionar donante..."
                  filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
                  options={donors.map(d => ({ value: d.id, label: d.name }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="fechaOperacion" label="Fecha de la operación" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="tipoActividad" label="Tipo de actividad sospechosa" rules={[{ required: true }]}>
                <Input maxLength={300} placeholder="Ej: Donación fraccionada en efectivo, origen de fondos no justificado..." />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="descripcion" label="Descripción detallada" rules={[{ required: true }]}>
                <Input.TextArea rows={4} maxLength={2000}
                  placeholder="Describe detalladamente la operación, circunstancias y por qué se considera sospechosa..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="montoEstimado" label="Monto estimado ($)">
                <InputNumber style={{ width: '100%' }} min={0} precision={2} placeholder="0.00" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="mediosUtilizados" label="Medios utilizados">
                <Input maxLength={300} placeholder="Efectivo, transferencia, criptomonedas..." />
              </Form.Item>
            </Col>
          </Row>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              {editing ? 'Guardar cambios' : 'Crear ROS'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal enviar a UAF/FGR */}
      <Modal
        title={`Enviar ${modalEnviar?.numero} a UAF/FGR`}
        open={!!modalEnviar} onCancel={() => setModalEnviar(null)} footer={null}
      >
        <Alert type="warning" showIcon message="Esta acción marcará el ROS como enviado y no podrá editarse después." style={{ marginBottom: 16 }} />
        <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 13 }}>Número de referencia (opcional):</div>
        <Input value={referencia} onChange={e => setReferencia(e.target.value)}
          placeholder="Número asignado por la UAF/FGR al recibir el reporte" maxLength={100} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button onClick={() => setModalEnviar(null)}>Cancelar</Button>
          <Button type="primary" danger loading={saving} onClick={enviar}>
            Confirmar envío
          </Button>
        </div>
      </Modal>
    </>
  );
}
