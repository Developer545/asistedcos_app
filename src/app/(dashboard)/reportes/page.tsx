'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Select, Row, Col, Statistic, Card, Table, Alert,
  Divider, Tag, Spin,
} from 'antd';
import { ChartBar } from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line,
} from 'recharts';
import { toast } from 'sonner';
import PageHeader from '@/components/shared/PageHeader';

/* ─── Tipos ──────────────────────────────────────────── */
type ReportData = {
  year: number;
  donaciones:   { total: number; count: number };
  gastos:       { total: number; count: number };
  compras:      { total: number; count: number };
  beneficiarios: number;
  voluntarios:   number;
  proyectos:     number;
  planilla:     { totalGross: number; totalNet: number; meses: number };
  iva:          { debitoFiscal: number; creditoFiscal: number; ivaAPagar: number };
  charts: {
    donacionesPorMes: number[];
    gastosPorMes:     number[];
  };
};

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

function fmtUSD(n: number) {
  return new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(Number(n));
}

function fmtK(v: number) {
  return v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`;
}

export default function ReportesPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/reportes/resumen?year=${year}`);
      const d = await r.json();
      setData(d.data ?? d);
    } catch { toast.error('Error cargando reporte'); }
    finally { setLoading(false); }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  /* Datos para gráfica */
  const chartData = MONTHS_SHORT.map((m, i) => ({
    month:      m,
    donaciones: data?.charts.donacionesPorMes[i] ?? 0,
    gastos:     data?.charts.gastosPorMes[i]     ?? 0,
  }));

  const balance = (data?.donaciones.total ?? 0) - (data?.gastos.total ?? 0) - (data?.compras.total ?? 0);

  return (
    <div>
      <PageHeader
        title="Reportes"
        description="Resumen financiero y de impacto anual — Fundación ASISTEDCOS"
        icon={<ChartBar size={20} />}
      />

      {/* Selector de año */}
      <Row align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <span style={{ marginRight: 8, fontWeight: 600 }}>Año fiscal:</span>
          <Select value={year} onChange={setYear} style={{ width: 110 }}
            options={YEARS.map(y => ({ value: y, label: String(y) }))} />
        </Col>
      </Row>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
      ) : data ? (
        <>
          {/* ── KPIs principales ──────────────────────────── */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={8} lg={4}>
              <Card size="small" style={{ borderRadius: 10, borderLeft: '3px solid hsl(var(--status-success))' }}>
                <Statistic title="Total donado" value={data.donaciones.total} prefix="$" precision={2}
                  valueStyle={{ color: 'hsl(var(--status-success))', fontSize: 18 }} />
                <div style={{ fontSize: 11, color: 'hsl(var(--text-muted))' }}>{data.donaciones.count} donaciones</div>
              </Card>
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Card size="small" style={{ borderRadius: 10, borderLeft: '3px solid hsl(var(--status-error))' }}>
                <Statistic title="Total egresos" value={data.gastos.total + data.compras.total}
                  prefix="$" precision={2} valueStyle={{ color: 'hsl(var(--status-error))', fontSize: 18 }} />
                <div style={{ fontSize: 11, color: 'hsl(var(--text-muted))'}}>{data.gastos.count} gastos · {data.compras.count} compras</div>
              </Card>
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Card size="small" style={{ borderRadius: 10, borderLeft: `3px solid hsl(var(--${balance >= 0 ? 'status-success' : 'status-error'}))` }}>
                <Statistic title="Balance" value={balance} prefix="$" precision={2}
                  valueStyle={{ color: `hsl(var(--${balance >= 0 ? 'status-success' : 'status-error'}))`, fontSize: 18 }} />
              </Card>
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Card size="small" style={{ borderRadius: 10, borderLeft: '3px solid hsl(var(--brand-primary))' }}>
                <Statistic title="Beneficiarios activos" value={data.beneficiarios}
                  valueStyle={{ color: 'hsl(var(--brand-primary))', fontSize: 18 }} />
              </Card>
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Card size="small" style={{ borderRadius: 10 }}>
                <Statistic title="Voluntarios activos" value={data.voluntarios} valueStyle={{ fontSize: 18 }} />
              </Card>
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Card size="small" style={{ borderRadius: 10 }}>
                <Statistic title="Proyectos activos" value={data.proyectos} valueStyle={{ fontSize: 18 }} />
              </Card>
            </Col>
          </Row>

          {/* ── Gráfica de ingresos vs egresos ────────────── */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={16}>
              <Card
                title={<span style={{ fontWeight: 600 }}>Donaciones vs Gastos por mes — {year}</span>}
                size="small" style={{ borderRadius: 12 }}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-default))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={fmtK} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => fmtUSD(Number(v))} />
                    <Legend />
                    <Bar dataKey="donaciones" name="Donaciones" fill="hsl(var(--status-success))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="gastos" name="Gastos" fill="hsl(var(--status-error))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col span={8}>
              <Card
                title={<span style={{ fontWeight: 600 }}>IVA a declarar — {year}</span>}
                size="small" style={{ borderRadius: 12, height: '100%' }}
              >
                <div style={{ padding: '8px 0' }}>
                  <Row gutter={[0, 16]}>
                    <Col span={24}>
                      <Statistic title="Débito fiscal (IVA cobrado)" value={data.iva.debitoFiscal}
                        prefix="$" precision={2}
                        valueStyle={{ color: 'hsl(var(--status-warning))' }} />
                    </Col>
                    <Col span={24}>
                      <Statistic title="Crédito fiscal (IVA pagado)" value={data.iva.creditoFiscal}
                        prefix="$" precision={2}
                        valueStyle={{ color: 'hsl(var(--status-success))' }} />
                    </Col>
                    <Col span={24}>
                      <Divider style={{ margin: '4px 0' }} />
                      <Statistic title="IVA neto a pagar MH" value={data.iva.ivaAPagar}
                        prefix="$" precision={2}
                        valueStyle={{ color: 'hsl(var(--status-error))', fontSize: 22, fontWeight: 700 }} />
                    </Col>
                  </Row>
                </div>
              </Card>
            </Col>
          </Row>

          {/* ── Planilla ─────────────────────────────────── */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={24}>
              <Card title={<span style={{ fontWeight: 600 }}>Resumen de Planilla {year}</span>}
                size="small" style={{ borderRadius: 12 }}>
                <Row gutter={16}>
                  <Col span={6}>
                    <Statistic title="Meses procesados" value={data.planilla.meses}
                      suffix={`/ 12`} />
                  </Col>
                  <Col span={6}>
                    <Statistic title="Total salarios brutos" value={data.planilla.totalGross}
                      prefix="$" precision={2} />
                  </Col>
                  <Col span={6}>
                    <Statistic title="Total salarios netos" value={data.planilla.totalNet}
                      prefix="$" precision={2}
                      valueStyle={{ color: 'hsl(var(--status-success))' }} />
                  </Col>
                  <Col span={6}>
                    <Statistic title="Deducciones totales"
                      value={data.planilla.totalGross - data.planilla.totalNet}
                      prefix="$" precision={2}
                      valueStyle={{ color: 'hsl(var(--status-error))' }} />
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>

          {/* ── Tendencia lineal ─────────────────────────── */}
          <Row gutter={16}>
            <Col span={24}>
              <Card title={<span style={{ fontWeight: 600 }}>Tendencia mensual de donaciones — {year}</span>}
                size="small" style={{ borderRadius: 12 }}>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-default))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={fmtK} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => fmtUSD(Number(v))} />
                    <Legend />
                    <Line type="monotone" dataKey="donaciones" name="Donaciones"
                      stroke="hsl(var(--status-success))" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="gastos" name="Gastos"
                      stroke="hsl(var(--status-error))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>
        </>
      ) : null}
    </div>
  );
}
