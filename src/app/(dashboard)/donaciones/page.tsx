'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table, Button, Modal, Form, Input, InputNumber, Select,
  DatePicker, Space, Tag, Popconfirm, Tabs, Statistic, Row, Col, Card, Divider,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  Heart, Plus, PencilSimple, Trash, MagnifyingGlass,
  Buildings, User, Certificate, Eye,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/shared/PageHeader';

/* ─── Tipos ─────────────────────────────────────────── */
type Donor = {
  id: string; name: string; nit?: string; nrc?: string; dui?: string;
  email?: string; phone?: string; address?: string;
  isCompany: boolean; notes?: string;
  _count?: { donations: number };
};

type Donation = {
  id: string; donorId: string; projectId?: string;
  amount: number; date: string; paymentMethod: string; notes?: string;
  donor?: { id: string; name: string };
  project?: { id: string; name: string } | null;
  certificate?: { id: string; number: string; status: string } | null;
};

type Project = { id: string; name: string };

const PAYMENT_LABELS: Record<string, string> = {
  EFECTIVO: 'Efectivo', TRANSFERENCIA: 'Transferencia',
  CHEQUE: 'Cheque', TARJETA: 'Tarjeta', OTRO: 'Otro',
};

const PAYMENT_COLORS: Record<string, string> = {
  EFECTIVO: 'green', TRANSFERENCIA: 'blue',
  CHEQUE: 'orange', TARJETA: 'purple', OTRO: 'default',
};

function fmtUSD(n: number) {
  return new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(n);
}

/* ─── Componente ─────────────────────────────────────── */
export default function DonacionesPage() {
  const router                      = useRouter();
  const [tab, setTab]               = useState('donaciones');

  /* Donaciones */
  const [donations, setDonations]   = useState<Donation[]>([]);
  const [dLoading, setDLoading]     = useState(false);
  const [dModal, setDModal]         = useState(false);
  const [dEditing, setDEditing]     = useState<Donation | null>(null);
  const [dForm]                     = Form.useForm();
  const [dSaving, setDSaving]       = useState(false);

  /* Donantes */
  const [donors, setDonors]         = useState<Donor[]>([]);
  const [doLoading, setDoLoading]   = useState(false);
  const [doModal, setDoModal]       = useState(false);
  const [doEditing, setDoEditing]   = useState<Donor | null>(null);
  const [doForm]                    = Form.useForm();
  const [doSaving, setDoSaving]     = useState(false);
  const [doSearch, setDoSearch]     = useState('');
  const doIsCompany = Form.useWatch('isCompany', doForm);

  /* Proyectos (para select) */
  const [projects, setProjects]     = useState<Project[]>([]);

  /* Certificados */
  const [certLoading, setCertLoading] = useState<string | null>(null); // donationId en proceso

  /* Stats */
  const [stats, setStats]           = useState({ total: 0, count: 0, topDonor: '' });

  /* ── Cargas ─────────────────────────────────────────── */
  const loadDonations = useCallback(async () => {
    setDLoading(true);
    try {
      const r = await fetch('/api/donaciones?limit=100&include=certificate');
      const d = await r.json();
      setDonations(d.data ?? []);
      const list: Donation[] = d.data ?? [];
      const total = list.reduce((s: number, x: Donation) => s + Number(x.amount), 0);
      setStats({ total, count: list.length, topDonor: '' });
    } catch { toast.error('Error cargando donaciones'); }
    finally { setDLoading(false); }
  }, []);

  const loadDonors = useCallback(async () => {
    setDoLoading(true);
    try {
      const r = await fetch(`/api/donantes?limit=100&search=${doSearch}`);
      const d = await r.json();
      setDonors(d.data ?? []);
    } catch { toast.error('Error cargando donantes'); }
    finally { setDoLoading(false); }
  }, [doSearch]);

  const loadProjects = useCallback(async () => {
    try {
      const r = await fetch('/api/proyectos?limit=100');
      const d = await r.json();
      setProjects(d.data ?? []);
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => { loadDonations(); loadProjects(); }, [loadDonations, loadProjects]);
  useEffect(() => { loadDonors(); }, [loadDonors]);

  /* ── CRUD Donaciones ────────────────────────────────── */
  function openDonation(record?: Donation) {
    setDEditing(record ?? null);
    dForm.resetFields();
    if (record) {
      dForm.setFieldsValue({
        ...record,
        date: dayjs(record.date),
        amount: Number(record.amount),
      });
    } else {
      dForm.setFieldsValue({ date: dayjs(), paymentMethod: 'EFECTIVO' });
    }
    setDModal(true);
  }

  async function saveDonation(values: Record<string, unknown>) {
    setDSaving(true);
    try {
      const payload = { ...values, date: (values.date as dayjs.Dayjs).toISOString() };
      const url     = dEditing ? `/api/donaciones/${dEditing.id}` : '/api/donaciones';
      const method  = dEditing ? 'PUT' : 'POST';
      const res     = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(dEditing ? 'Donación actualizada' : 'Donación registrada');
      setDModal(false);
      loadDonations();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setDSaving(false); }
  }

  async function deleteDonation(id: string) {
    try {
      await fetch(`/api/donaciones/${id}`, { method: 'DELETE' });
      toast.success('Donación eliminada');
      loadDonations();
    } catch { toast.error('Error al eliminar'); }
  }

  /* ── CRUD Donantes ──────────────────────────────────── */
  function openDonor(record?: Donor) {
    setDoEditing(record ?? null);
    doForm.resetFields();
    if (record) doForm.setFieldsValue(record);
    setDoModal(true);
  }

  async function saveDonor(values: Record<string, unknown>) {
    setDoSaving(true);
    try {
      const url    = doEditing ? `/api/donantes/${doEditing.id}` : '/api/donantes';
      const method = doEditing ? 'PUT' : 'POST';
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(doEditing ? 'Donante actualizado' : 'Donante creado');
      setDoModal(false);
      loadDonors();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setDoSaving(false); }
  }

  async function deleteDonor(id: string) {
    try {
      await fetch(`/api/donantes/${id}`, { method: 'DELETE' });
      toast.success('Donante eliminado');
      loadDonors();
    } catch { toast.error('Error al eliminar'); }
  }

  /* ── Certificados ───────────────────────────────────── */
  async function generateCert(donation: Donation) {
    if (donation.certificate) {
      router.push(`/certificados/${donation.certificate.id}`);
      return;
    }
    setCertLoading(donation.id);
    try {
      const r = await fetch(`/api/donaciones/${donation.id}/certificado`, { method: 'POST' });
      if (!r.ok) throw new Error((await r.json()).error);
      const d = await r.json();
      toast.success(`Certificado ${d.data.number} generado`);
      loadDonations();
      router.push(`/certificados/${d.data.id}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error generando certificado');
    } finally { setCertLoading(null); }
  }

  /* ── Columnas ───────────────────────────────────────── */
  const donationCols: ColumnsType<Donation> = [
    { title: 'Fecha',   dataIndex: 'date', width: 110,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
    { title: 'Donante', dataIndex: ['donor', 'name'], ellipsis: true },
    { title: 'Proyecto', dataIndex: ['project', 'name'], ellipsis: true,
      render: (v?: string) => v ?? <span style={{ color: 'hsl(var(--text-muted))' }}>—</span> },
    { title: 'Método',  dataIndex: 'paymentMethod', width: 120,
      render: (v: string) => <Tag color={PAYMENT_COLORS[v]}>{PAYMENT_LABELS[v]}</Tag> },
    { title: 'Monto',   dataIndex: 'amount', width: 120, align: 'right',
      render: (v: number) => <b style={{ color: 'hsl(var(--status-success))' }}>{fmtUSD(Number(v))}</b>,
      sorter: (a, b) => Number(a.amount) - Number(b.amount) },
    {
      title: 'Certificado', key: 'cert', width: 145, align: 'center',
      render: (_: unknown, r: Donation) => {
        if (r.certificate) {
          const isAnulado = r.certificate.status === 'ANULADO';
          return (
            <Button
              size="small"
              type={isAnulado ? 'default' : 'primary'}
              ghost={!isAnulado}
              danger={isAnulado}
              icon={<Eye size={12} />}
              onClick={() => router.push(`/certificados/${r.certificate!.id}`)}
              style={{ fontSize: 11 }}
            >
              {r.certificate.number}
            </Button>
          );
        }
        return (
          <Button
            size="small"
            icon={<Certificate size={12} />}
            loading={certLoading === r.id}
            onClick={() => generateCert(r)}
            style={{ fontSize: 11 }}
          >
            Generar
          </Button>
        );
      },
    },
    {
      title: '', width: 70, align: 'center',
      render: (_: unknown, r: Donation) => (
        <Space>
          <Button size="small" icon={<PencilSimple size={13} />} onClick={() => openDonation(r)} />
          <Popconfirm title="¿Eliminar donación?" onConfirm={() => deleteDonation(r.id)} okText="Sí" cancelText="No">
            <Button size="small" danger icon={<Trash size={13} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const donorCols: ColumnsType<Donor> = [
    { title: 'Nombre', dataIndex: 'name', ellipsis: true,
      render: (v: string, r: Donor) => (
        <Space>
          {r.isCompany ? <Buildings size={14} /> : <User size={14} />}
          {v}
        </Space>
      )},
    {
      title: 'Identificación', width: 150,
      render: (_: unknown, r: Donor) => r.isCompany
        ? <div>
            {r.nit && <div style={{ fontSize: 12 }}><b>NIT:</b> {r.nit}</div>}
            {r.nrc && <div style={{ fontSize: 12 }}><b>NRC:</b> {r.nrc}</div>}
            {!r.nit && !r.nrc && <span style={{ color: '#bbb' }}>—</span>}
          </div>
        : <div>
            {r.dui && <div style={{ fontSize: 12 }}><b>DUI:</b> {r.dui}</div>}
            {r.nit && <div style={{ fontSize: 12 }}><b>NIT:</b> {r.nit}</div>}
            {!r.dui && !r.nit && <span style={{ color: '#bbb' }}>—</span>}
          </div>,
    },
    { title: 'Teléfono', dataIndex: 'phone', width: 120, render: (v?: string) => v ?? '—' },
    { title: 'Correo', dataIndex: 'email', ellipsis: true, render: (v?: string) => v ?? '—' },
    { title: 'Donaciones', width: 100, align: 'center',
      render: (_: unknown, r: Donor) => <Tag color="green">{r._count?.donations ?? 0}</Tag> },
    {
      title: '', width: 80, align: 'center',
      render: (_: unknown, r: Donor) => (
        <Space>
          <Button size="small" icon={<PencilSimple size={13} />} onClick={() => openDonor(r)} />
          <Popconfirm title="¿Eliminar donante?" onConfirm={() => deleteDonor(r.id)} okText="Sí" cancelText="No">
            <Button size="small" danger icon={<Trash size={13} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div>
      <PageHeader
        title="Donaciones"
        description="Registro y seguimiento de donantes y donaciones"
        icon={<Heart size={20} />}
        actions={[
          { label: 'Nueva donación', onClick: () => openDonation() },
          { label: 'Nuevo donante',  onClick: () => openDonor(),   type: 'default' as const },
        ]}
      />

      {/* KPIs */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title="Total donado (historial)" value={stats.total}
              prefix="$" precision={2} valueStyle={{ color: 'hsl(var(--status-success))', fontWeight: 700 }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title="Total donaciones" value={stats.count} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title="Donantes registrados" value={donors.length} />
          </Card>
        </Col>
      </Row>

      <Tabs activeKey={tab} onChange={setTab} items={[
        {
          key: 'donaciones', label: 'Donaciones',
          children: (
            <Table
              dataSource={donations}
              columns={donationCols}
              rowKey="id"
              loading={dLoading}
              size="small"
              pagination={{ pageSize: 15, showSizeChanger: false }}
              summary={rows => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3} />
                  <Table.Summary.Cell index={3}><b>Total visible</b></Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right">
                    <b style={{ color: 'hsl(var(--status-success))' }}>
                      {fmtUSD(rows.reduce((s, r) => s + Number(r.amount), 0))}
                    </b>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5} />
                </Table.Summary.Row>
              )}
            />
          ),
        },
        {
          key: 'donantes', label: 'Donantes',
          children: (
            <>
              <Input
                placeholder="Buscar por nombre, NIT o correo..."
                prefix={<MagnifyingGlass size={14} />}
                value={doSearch}
                onChange={e => setDoSearch(e.target.value)}
                style={{ width: 300, marginBottom: 16 }}
              />
              <Table
                dataSource={donors}
                columns={donorCols}
                rowKey="id"
                loading={doLoading}
                size="small"
                pagination={{ pageSize: 15, showSizeChanger: false }}
              />
            </>
          ),
        },
      ]} />

      {/* ── Modal Donación ───────────────────────────────── */}
      <Modal
        title={dEditing ? 'Editar donación' : 'Nueva donación'}
        open={dModal}
        onCancel={() => setDModal(false)}
        onOk={() => dForm.submit()}
        okText={dEditing ? 'Guardar cambios' : 'Registrar'}
        confirmLoading={dSaving}
        destroyOnClose
      >
        <Form form={dForm} layout="vertical" onFinish={saveDonation} style={{ marginTop: 12 }}>
          <Form.Item name="donorId" label="Donante" rules={[{ required: true, message: 'Selecciona el donante' }]}>
            <Select showSearch placeholder="Buscar donante..."
              filterOption={(inp, opt) => (opt?.label as string ?? '').toLowerCase().includes(inp.toLowerCase())}
              options={donors.map(d => ({ value: d.id, label: d.name }))}
            />
          </Form.Item>
          <Form.Item name="amount" label="Monto (USD)" rules={[{ required: true, message: 'Ingresa el monto' }]}>
            <InputNumber min={0.01} precision={2} prefix="$" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="date" label="Fecha" rules={[{ required: true, message: 'Selecciona la fecha' }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="paymentMethod" label="Método de pago">
            <Select options={Object.entries(PAYMENT_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
          </Form.Item>
          <Form.Item name="projectId" label="Proyecto (opcional)">
            <Select allowClear placeholder="Sin proyecto específico"
              options={projects.map(p => ({ value: p.id, label: p.name }))}
            />
          </Form.Item>
          <Form.Item name="notes" label="Notas">
            <Input.TextArea rows={2} placeholder="Observaciones..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal Donante ────────────────────────────────── */}
      <Modal
        title={doEditing ? 'Editar donante' : 'Nuevo donante'}
        open={doModal}
        onCancel={() => setDoModal(false)}
        onOk={() => doForm.submit()}
        okText={doEditing ? 'Guardar cambios' : 'Crear donante'}
        confirmLoading={doSaving}
        destroyOnClose
        width={600}
      >
        <Form form={doForm} layout="vertical" onFinish={saveDonor} style={{ marginTop: 12 }}>

          {/* ── Tipo de donante ── */}
          <Row gutter={12}>
            <Col span={14}>
              <Form.Item name="name"
                label={doIsCompany ? 'Razón social' : 'Nombre completo'}
                rules={[{ required: true, message: 'El nombre es requerido' }]}
              >
                <Input placeholder={doIsCompany ? 'Nombre de la empresa' : 'Nombre y apellidos'} />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="isCompany" label="Tipo de donante" initialValue={false}>
                <Select
                  options={[
                    { value: false, label: '👤 Persona natural' },
                    { value: true,  label: '🏢 Empresa / Institución' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* ── Campos según tipo ── */}
          {doIsCompany ? (
            /* EMPRESA */
            <>
              <Divider plain style={{ fontSize: 12, color: '#888', margin: '4px 0 12px' }}>
                Datos fiscales — Empresa
              </Divider>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="nit" label="NIT (empresa)"
                    tooltip="Número de Identificación Tributaria de la empresa">
                    <Input placeholder="0000-000000-000-0" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="nrc" label="NRC"
                    tooltip="Número de Registro de Contribuyente — requerido para empresas">
                    <Input placeholder="000000-0" />
                  </Form.Item>
                </Col>
              </Row>
            </>
          ) : (
            /* PERSONA NATURAL */
            <>
              <Divider plain style={{ fontSize: 12, color: '#888', margin: '4px 0 12px' }}>
                Datos de identidad — Persona natural
              </Divider>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="dui" label="DUI"
                    tooltip="Documento Único de Identidad">
                    <Input placeholder="00000000-0" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="nit" label="NIT (opcional)"
                    tooltip="Requerido si la persona tiene NIT para emisión de documentos fiscales">
                    <Input placeholder="0000-000000-000-0" />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          {/* ── Contacto (común) ── */}
          <Divider plain style={{ fontSize: 12, color: '#888', margin: '4px 0 12px' }}>
            Contacto
          </Divider>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="email" label="Correo electrónico">
                <Input type="email" placeholder="correo@ejemplo.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Teléfono">
                <Input placeholder="0000-0000" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="address" label="Dirección">
            <Input placeholder="Departamento, municipio, dirección" />
          </Form.Item>
          <Form.Item name="notes" label="Notas internas">
            <Input.TextArea rows={2} placeholder="Observaciones opcionales..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
