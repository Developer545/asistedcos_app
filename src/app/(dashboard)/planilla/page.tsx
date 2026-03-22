'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, InputNumber, Select,
  Space, Tag, Popconfirm, Row, Col, Statistic, Card,
  Divider, Alert,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Money, Plus, X, Eye, Trash, CheckCircle } from '@phosphor-icons/react';
import { toast } from 'sonner';
import PageHeader from '@/components/shared/PageHeader';

/* ─── Tipos ──────────────────────────────────────────── */
type PayrollDetail = {
  id?: string; employeeName: string; position: string;
  grossSalary: number; isssEmployee: number; afpEmployee: number;
  rentaRetention: number; otherDeductions: number; netSalary: number;
  isssEmployer: number; afpEmployer: number; totalCost: number;
};
type Payroll = {
  id: string; month: number; year: number; status: string;
  totalGross: number; totalNet: number; details: PayrollDetail[];
};

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

const STATUS_COLOR: Record<string, string> = {
  BORRADOR: 'default', APROBADA: 'processing', PAGADA: 'success',
};

/* ─── Cálculos El Salvador (cliente) ─────────────────── */
const ISSS_RATE_EMP  = 0.03;
const ISSS_CAP       = 1000;
const AFP_RATE_EMP   = 0.0725;
const AFP_RATE_PATRON= 0.0775;
const ISSS_RATE_PAT  = 0.075;

function calcISRAnual(baseAnual: number): number {
  if (baseAnual <= 4064)            return 0;
  if (baseAnual <= 9142.86)         return (baseAnual - 4064) * 0.10;
  if (baseAnual <= 22857.14)        return 508 + (baseAnual - 9142.86) * 0.20;
  return 3051 + (baseAnual - 22857.14) * 0.30;
}

function calcRow(gross: number, other = 0): Omit<PayrollDetail, 'employeeName' | 'position'> {
  const g    = Number(gross) || 0;
  const isssEmp  = Math.min(g, ISSS_CAP) * ISSS_RATE_EMP;
  const afpEmp   = g * AFP_RATE_EMP;
  const base     = g - isssEmp - afpEmp;
  const renta    = calcISRAnual(base * 12) / 12;
  const net      = g - isssEmp - afpEmp - renta - Number(other);
  const isssPat  = Math.min(g, ISSS_CAP) * ISSS_RATE_PAT;
  const afpPat   = g * AFP_RATE_PATRON;
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    grossSalary:     round(g),
    isssEmployee:    round(isssEmp),
    afpEmployee:     round(afpEmp),
    rentaRetention:  round(renta),
    otherDeductions: round(Number(other)),
    netSalary:       round(net),
    isssEmployer:    round(isssPat),
    afpEmployer:     round(afpPat),
    totalCost:       round(g + isssPat + afpPat),
  };
}

function fmtUSD(n: number) {
  return new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(Number(n));
}

/* ─── Componente ─────────────────────────────────────── */
export default function PlanillaPage() {
  const [data, setData]           = useState<Payroll[]>([]);
  const [loading, setLoading]     = useState(false);
  const [modal, setModal]         = useState(false);
  const [viewPayroll, setView]    = useState<Payroll | null>(null);
  const [saving, setSaving]       = useState(false);
  const [newMonth, setNewMonth]   = useState(new Date().getMonth() + 1);
  const [newYear, setNewYear]     = useState(new Date().getFullYear());
  const [employees, setEmployees] = useState<{
    employeeName: string; position: string; grossSalary: number; otherDeductions: number;
  }[]>([{ employeeName: '', position: '', grossSalary: 0, otherDeductions: 0 }]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/planilla?limit=50');
      const d = await r.json();
      setData(d.data ?? []);
    } catch { toast.error('Error cargando planillas'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function addEmployee() {
    setEmployees(e => [...e, { employeeName: '', position: '', grossSalary: 0, otherDeductions: 0 }]);
  }
  function removeEmployee(i: number) {
    setEmployees(e => e.filter((_, idx) => idx !== i));
  }
  function updateEmp(i: number, field: string, value: string | number) {
    setEmployees(e => e.map((emp, idx) => idx === i ? { ...emp, [field]: value } : emp));
  }

  const preview = employees.map(e => ({ ...e, ...calcRow(e.grossSalary, e.otherDeductions) }));
  const totals  = preview.reduce((acc, r) => ({
    gross: acc.gross + r.grossSalary,
    net:   acc.net   + r.netSalary,
    isssEmp: acc.isssEmp + r.isssEmployee,
    afpEmp:  acc.afpEmp  + r.afpEmployee,
    renta:   acc.renta   + r.rentaRetention,
    isssPat: acc.isssPat + r.isssEmployer,
    afpPat:  acc.afpPat  + r.afpEmployer,
    cost:    acc.cost    + r.totalCost,
  }), { gross: 0, net: 0, isssEmp: 0, afpEmp: 0, renta: 0, isssPat: 0, afpPat: 0, cost: 0 });

  async function onCreate() {
    if (employees.some(e => !e.employeeName.trim())) {
      toast.error('Todos los empleados deben tener nombre');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/planilla', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: newMonth, year: newYear, employees }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(`Planilla ${MONTHS[newMonth - 1]} ${newYear} creada`);
      setModal(false);
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  }

  async function changeStatus(id: string, status: string) {
    try {
      await fetch(`/api/planilla/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      });
      toast.success(`Estado: ${status}`);
      load();
      if (viewPayroll?.id === id) setView(p => p ? { ...p, status } : p);
    } catch { toast.error('Error'); }
  }

  async function onDelete(id: string) {
    try {
      await fetch(`/api/planilla/${id}`, { method: 'DELETE' });
      toast.success('Planilla eliminada');
      load();
    } catch { toast.error('Error al eliminar'); }
  }

  const columns: ColumnsType<Payroll> = [
    { title: 'Período', width: 150,
      render: (_: unknown, r: Payroll) => <b>{MONTHS[r.month - 1]} {r.year}</b> },
    { title: 'Empleados', width: 90, align: 'center',
      render: (_: unknown, r: Payroll) => <Tag>{r.details?.length ?? 0}</Tag> },
    { title: 'Total Bruto', dataIndex: 'totalGross', width: 130, align: 'right',
      render: (v: number) => fmtUSD(Number(v)) },
    { title: 'Total Neto', dataIndex: 'totalNet', width: 130, align: 'right',
      render: (v: number) => <b style={{ color: 'hsl(var(--status-success))' }}>{fmtUSD(Number(v))}</b> },
    { title: 'Estado', dataIndex: 'status', width: 110,
      render: (v: string, r: Payroll) => (
        <Select size="small" value={v} style={{ width: 110 }}
          disabled={v === 'PAGADA'}
          onChange={(val) => changeStatus(r.id, val)}
          options={[
            { value: 'BORRADOR', label: 'Borrador' },
            { value: 'APROBADA', label: 'Aprobada' },
            { value: 'PAGADA',   label: 'Pagada ✓' },
          ]}
        />
      )},
    {
      title: '', width: 90, align: 'center',
      render: (_: unknown, r: Payroll) => (
        <Space>
          <Button size="small" icon={<Eye size={13} />} onClick={() => setView(r)}>Ver</Button>
          <Popconfirm title="¿Eliminar planilla?" onConfirm={() => onDelete(r.id)} okText="Sí" cancelText="No">
            <Button size="small" danger icon={<Trash size={13} />}
              disabled={r.status !== 'BORRADOR'} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  /* Columnas del detalle de planilla */
  const detailCols: ColumnsType<PayrollDetail> = [
    { title: 'Empleado', dataIndex: 'employeeName', ellipsis: true, fixed: 'left', width: 160 },
    { title: 'Cargo', dataIndex: 'position', ellipsis: true, width: 130 },
    { title: 'Salario Bruto', dataIndex: 'grossSalary', width: 110, align: 'right',
      render: (v: number) => fmtUSD(Number(v)) },
    { title: 'ISSS Emp.', dataIndex: 'isssEmployee', width: 90, align: 'right',
      render: (v: number) => <span style={{ color: 'hsl(var(--status-error))' }}>-{fmtUSD(Number(v))}</span> },
    { title: 'AFP Emp.', dataIndex: 'afpEmployee', width: 90, align: 'right',
      render: (v: number) => <span style={{ color: 'hsl(var(--status-error))' }}>-{fmtUSD(Number(v))}</span> },
    { title: 'Renta', dataIndex: 'rentaRetention', width: 90, align: 'right',
      render: (v: number) => <span style={{ color: 'hsl(var(--status-error))' }}>-{fmtUSD(Number(v))}</span> },
    { title: 'Otros Ded.', dataIndex: 'otherDeductions', width: 90, align: 'right',
      render: (v: number) => Number(v) > 0 ? <span style={{ color: 'hsl(var(--status-error))' }}>-{fmtUSD(Number(v))}</span> : '—' },
    { title: 'Salario Neto', dataIndex: 'netSalary', width: 110, align: 'right', fixed: 'right',
      render: (v: number) => <b style={{ color: 'hsl(var(--status-success))' }}>{fmtUSD(Number(v))}</b> },
    { title: 'ISSS Pat.', dataIndex: 'isssEmployer', width: 90, align: 'right',
      render: (v: number) => fmtUSD(Number(v)) },
    { title: 'AFP Pat.', dataIndex: 'afpEmployer', width: 90, align: 'right',
      render: (v: number) => fmtUSD(Number(v)) },
    { title: 'Costo Total', dataIndex: 'totalCost', width: 110, align: 'right',
      render: (v: number) => <b>{fmtUSD(Number(v))}</b> },
  ];

  return (
    <div>
      <PageHeader
        title="Planilla"
        description="Nómina con ISSS 3% / 7.5%, AFP 7.25% / 7.75% y Renta según Art. 37 Ley ISR"
        icon={<Money size={20} />}
        actions={[{ label: 'Generar planilla', onClick: () => setModal(true) }]}
      />

      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-default))', borderRadius: 12, padding: 16 }}>
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading}
          size="small" pagination={{ pageSize: 15, showSizeChanger: false }} />
      </div>

      {/* ── Modal Crear Planilla ──────────────────────────── */}
      <Modal
        title="Generar nueva planilla"
        open={modal}
        onCancel={() => setModal(false)}
        onOk={onCreate}
        okText="Crear planilla"
        confirmLoading={saving}
        destroyOnClose
        width={920}
      >
        <Alert
          type="info" showIcon style={{ marginBottom: 12 }}
          message="Tasas vigentes El Salvador"
          description="ISSS: 3% empleado / 7.5% patrono (tope $1,000). AFP: 7.25% empleado / 7.75% patrono. Renta: Art. 37 Ley ISR."
        />

        <Row gutter={12} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Select style={{ width: '100%' }} value={newMonth} onChange={setNewMonth}
              options={MONTHS.map((m, i) => ({ value: i + 1, label: m }))} />
          </Col>
          <Col span={6}>
            <Select style={{ width: '100%' }} value={newYear} onChange={setNewYear}
              options={YEARS.map(y => ({ value: y, label: String(y) }))} />
          </Col>
        </Row>

        {/* Tabla de empleados editable */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'hsl(var(--bg-page))', textAlign: 'center' }}>
                <th style={{ padding: '6px 4px', textAlign: 'left' }}>Empleado</th>
                <th style={{ padding: '6px 4px', textAlign: 'left' }}>Cargo</th>
                <th style={{ padding: '6px 8px' }}>Bruto</th>
                <th style={{ padding: '6px 8px' }}>ISSS E.</th>
                <th style={{ padding: '6px 8px' }}>AFP E.</th>
                <th style={{ padding: '6px 8px' }}>Renta</th>
                <th style={{ padding: '6px 8px' }}>Otros</th>
                <th style={{ padding: '6px 8px', color: 'hsl(var(--status-success))' }}>Neto</th>
                <th style={{ padding: '6px 8px' }}>ISSS P.</th>
                <th style={{ padding: '6px 8px' }}>AFP P.</th>
                <th style={{ padding: '6px 8px', fontWeight: 700 }}>Costo Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {preview.map((emp, i) => (
                <tr key={i} style={{ borderBottom: '1px solid hsl(var(--border-default))' }}>
                  <td style={{ padding: '4px 4px' }}>
                    <Input size="small" value={emp.employeeName}
                      onChange={e => updateEmp(i, 'employeeName', e.target.value)}
                      placeholder="Nombre completo" style={{ width: 160 }} />
                  </td>
                  <td style={{ padding: '4px 4px' }}>
                    <Input size="small" value={emp.position}
                      onChange={e => updateEmp(i, 'position', e.target.value)}
                      placeholder="Cargo" style={{ width: 120 }} />
                  </td>
                  <td style={{ padding: '4px 4px' }}>
                    <InputNumber size="small" min={0} precision={2} prefix="$"
                      style={{ width: 90 }} value={emp.grossSalary}
                      onChange={v => updateEmp(i, 'grossSalary', Number(v))} />
                  </td>
                  <td style={{ textAlign: 'right', padding: '4px 8px', color: 'hsl(var(--status-error))' }}>
                    {fmtUSD(emp.isssEmployee)}
                  </td>
                  <td style={{ textAlign: 'right', padding: '4px 8px', color: 'hsl(var(--status-error))' }}>
                    {fmtUSD(emp.afpEmployee)}
                  </td>
                  <td style={{ textAlign: 'right', padding: '4px 8px', color: 'hsl(var(--status-error))' }}>
                    {fmtUSD(emp.rentaRetention)}
                  </td>
                  <td style={{ padding: '4px 4px' }}>
                    <InputNumber size="small" min={0} precision={2} prefix="$"
                      style={{ width: 80 }} value={emp.otherDeductions}
                      onChange={v => updateEmp(i, 'otherDeductions', Number(v))} />
                  </td>
                  <td style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 700, color: 'hsl(var(--status-success))' }}>
                    {fmtUSD(emp.netSalary)}
                  </td>
                  <td style={{ textAlign: 'right', padding: '4px 8px' }}>
                    {fmtUSD(emp.isssEmployer)}
                  </td>
                  <td style={{ textAlign: 'right', padding: '4px 8px' }}>
                    {fmtUSD(emp.afpEmployer)}
                  </td>
                  <td style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 700 }}>
                    {fmtUSD(emp.totalCost)}
                  </td>
                  <td>
                    {employees.length > 1 && (
                      <Button size="small" type="text" danger
                        icon={<X size={12} />} onClick={() => removeEmployee(i)} />
                    )}
                  </td>
                </tr>
              ))}
              {/* Fila de totales */}
              <tr style={{ background: 'hsl(var(--bg-page))', fontWeight: 700 }}>
                <td colSpan={2} style={{ padding: '6px 4px' }}>TOTALES</td>
                <td style={{ textAlign: 'right', padding: '6px 8px' }}>{fmtUSD(totals.gross)}</td>
                <td style={{ textAlign: 'right', padding: '6px 8px', color: 'hsl(var(--status-error))' }}>{fmtUSD(totals.isssEmp)}</td>
                <td style={{ textAlign: 'right', padding: '6px 8px', color: 'hsl(var(--status-error))' }}>{fmtUSD(totals.afpEmp)}</td>
                <td style={{ textAlign: 'right', padding: '6px 8px', color: 'hsl(var(--status-error))' }}>{fmtUSD(totals.renta)}</td>
                <td />
                <td style={{ textAlign: 'right', padding: '6px 8px', color: 'hsl(var(--status-success))' }}>{fmtUSD(totals.net)}</td>
                <td style={{ textAlign: 'right', padding: '6px 8px' }}>{fmtUSD(totals.isssPat)}</td>
                <td style={{ textAlign: 'right', padding: '6px 8px' }}>{fmtUSD(totals.afpPat)}</td>
                <td style={{ textAlign: 'right', padding: '6px 8px' }}>{fmtUSD(totals.cost)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>

        <Button type="dashed" icon={<Plus size={13} />} onClick={addEmployee}
          style={{ width: '100%', marginTop: 12 }}>
          Agregar empleado
        </Button>
      </Modal>

      {/* ── Modal Ver Planilla ────────────────────────────── */}
      <Modal
        title={`Planilla — ${viewPayroll ? `${MONTHS[viewPayroll.month - 1]} ${viewPayroll.year}` : ''}`}
        open={!!viewPayroll}
        onCancel={() => setView(null)}
        width={1100}
        footer={[
          viewPayroll?.status === 'BORRADOR' && (
            <Button key="ap" type="primary" icon={<CheckCircle size={14} />}
              onClick={() => changeStatus(viewPayroll.id, 'APROBADA')}>
              Aprobar
            </Button>
          ),
          viewPayroll?.status === 'APROBADA' && (
            <Button key="pa" type="primary" style={{ background: 'hsl(var(--status-success))' }}
              onClick={() => changeStatus(viewPayroll.id, 'PAGADA')}>
              Marcar como Pagada
            </Button>
          ),
          <Button key="c" onClick={() => setView(null)}>Cerrar</Button>,
        ].filter(Boolean)}
      >
        {viewPayroll && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Statistic title="Total Bruto" value={Number(viewPayroll.totalGross)} prefix="$" precision={2} />
              </Col>
              <Col span={6}>
                <Statistic title="Total Neto" value={Number(viewPayroll.totalNet)} prefix="$" precision={2}
                  valueStyle={{ color: 'hsl(var(--status-success))' }} />
              </Col>
              <Col span={6}>
                <Statistic title="Empleados" value={viewPayroll.details.length} />
              </Col>
              <Col span={6}>
                <Statistic title="Estado"
                  value={viewPayroll.status}
                  valueStyle={{ color: viewPayroll.status === 'PAGADA' ? 'hsl(var(--status-success))' : undefined }} />
              </Col>
            </Row>
            <Table
              dataSource={viewPayroll.details}
              columns={detailCols}
              rowKey={(_, i) => String(i)}
              size="small" pagination={false}
              scroll={{ x: 1000 }}
              summary={rows => (
                <Table.Summary.Row style={{ fontWeight: 700, background: 'hsl(var(--bg-page))' }}>
                  <Table.Summary.Cell index={0} colSpan={2}>TOTALES</Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right">{fmtUSD(rows.reduce((s, r) => s + Number(r.grossSalary), 0))}</Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right">{fmtUSD(rows.reduce((s, r) => s + Number(r.isssEmployee), 0))}</Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right">{fmtUSD(rows.reduce((s, r) => s + Number(r.afpEmployee), 0))}</Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="right">{fmtUSD(rows.reduce((s, r) => s + Number(r.rentaRetention), 0))}</Table.Summary.Cell>
                  <Table.Summary.Cell index={6} align="right">—</Table.Summary.Cell>
                  <Table.Summary.Cell index={7} align="right">{fmtUSD(rows.reduce((s, r) => s + Number(r.netSalary), 0))}</Table.Summary.Cell>
                  <Table.Summary.Cell index={8} align="right">{fmtUSD(rows.reduce((s, r) => s + Number(r.isssEmployer), 0))}</Table.Summary.Cell>
                  <Table.Summary.Cell index={9} align="right">{fmtUSD(rows.reduce((s, r) => s + Number(r.afpEmployer), 0))}</Table.Summary.Cell>
                  <Table.Summary.Cell index={10} align="right">{fmtUSD(rows.reduce((s, r) => s + Number(r.totalCost), 0))}</Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          </>
        )}
      </Modal>
    </div>
  );
}
