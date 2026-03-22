'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Table, Select, Row, Col, Statistic, Card, Alert, Tag, Button, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Books, DownloadSimple } from '@phosphor-icons/react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import PageHeader from '@/components/shared/PageHeader';

/* ─── Tipos ──────────────────────────────────────────── */
type VentasRow = {
  date: string; dteType: string; number: string;
  receiverName: string; receiverNrc: string;
  subtotal: number; ivaAmount: number; total: number;
  exemptSales: number; taxableSales: number; ivaCollected: number;
};
type ComprasRow = {
  date: string; number: string;
  supplierName: string; supplierNrc: string;
  subtotal: number; iva: number; total: number; ivaCredited: number;
};
type VentasTotals = { subtotal: number; ivaAmount: number; total: number; exemptSales: number; taxableSales: number; ivaCollected: number };
type ComprasTotals = { subtotal: number; iva: number; total: number; ivaCredited: number };

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const YEARS  = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

const DTE_LABELS: Record<string, string> = {
  FACTURA: 'FAC (01)', CCF: 'CCF (03)',
  NOTA_CREDITO: 'NCR (05)', NOTA_DEBITO: 'NDB (06)', DONACION: 'DON (46)',
};

function fmtUSD(n: number) {
  return new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(Number(n));
}

export default function LibrosIvaPage() {
  const [tab, setTab]       = useState<'VENTAS' | 'COMPRAS'>('VENTAS');
  const [month, setMonth]   = useState(new Date().getMonth() + 1);
  const [year, setYear]     = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  const [ventasRows, setVentasRows]     = useState<VentasRow[]>([]);
  const [ventasTotals, setVentasTotals] = useState<VentasTotals | null>(null);
  const [comprasRows, setComprasRows]   = useState<ComprasRow[]>([]);
  const [comprasTotals, setComprasTotals] = useState<ComprasTotals | null>(null);
  const [debitoFiscal, setDebitoFiscal]   = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/libros-iva?book=${tab}&month=${month}&year=${year}`);
      const d = await r.json();
      if (!d.data && !d.rows) throw new Error('Sin datos');
      const result = d.data ?? d;
      if (tab === 'VENTAS') {
        setVentasRows(result.rows ?? []);
        setVentasTotals(result.totals ?? null);
      } else {
        setComprasRows(result.rows ?? []);
        setComprasTotals(result.totals ?? null);
        setDebitoFiscal(result.debitoFiscal ?? 0);
      }
    } catch { toast.error('Error cargando libro'); }
    finally { setLoading(false); }
  }, [tab, month, year]);

  useEffect(() => { load(); }, [load]);

  /* Exportar CSV simple */
  function exportCSV() {
    const rows = tab === 'VENTAS' ? ventasRows : comprasRows;
    if (!rows.length) return;
    const header = tab === 'VENTAS'
      ? 'Fecha,Tipo,Número,Receptor,NRC,Subtotal,IVA,Total\n'
      : 'Fecha,Número,Proveedor,NRC,Subtotal,IVA,Total\n';
    const lines = (rows as (VentasRow | ComprasRow)[]).map(r => {
      if (tab === 'VENTAS') {
        const v = r as VentasRow;
        return `${dayjs(v.date).format('DD/MM/YYYY')},${DTE_LABELS[v.dteType] ?? v.dteType},"${v.number}","${v.receiverName}","${v.receiverNrc}",${v.subtotal},${v.ivaAmount},${v.total}`;
      }
      const c = r as ComprasRow;
      return `${dayjs(c.date).format('DD/MM/YYYY')},"${c.number}","${c.supplierName}","${c.supplierNrc}",${c.subtotal},${c.iva},${c.total}`;
    }).join('\n');
    const blob = new Blob([header + lines], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `Libro_${tab}_${MONTHS[month - 1]}_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ── Columnas Ventas ─────────────────────────────────── */
  const ventasCols: ColumnsType<VentasRow> = [
    { title: 'Fecha', dataIndex: 'date', width: 100,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
    { title: 'Tipo DTE', dataIndex: 'dteType', width: 100,
      render: (v: string) => <Tag color={v === 'CCF' ? 'blue' : 'default'}>{DTE_LABELS[v] ?? v}</Tag> },
    { title: 'Número', dataIndex: 'number', width: 140 },
    { title: 'Receptor', dataIndex: 'receiverName', ellipsis: true },
    { title: 'NRC', dataIndex: 'receiverNrc', width: 100, render: (v: string) => v || '—' },
    { title: 'Ventas Exentas', dataIndex: 'exemptSales', width: 120, align: 'right',
      render: (v: number) => v ? fmtUSD(Number(v)) : '—' },
    { title: 'Ventas Gravadas', dataIndex: 'taxableSales', width: 120, align: 'right',
      render: (v: number) => v ? fmtUSD(Number(v)) : '—' },
    { title: 'Débito Fiscal', dataIndex: 'ivaCollected', width: 120, align: 'right',
      render: (v: number) => v ? <b style={{ color: 'hsl(var(--status-warning))' }}>{fmtUSD(Number(v))}</b> : '—' },
    { title: 'Total', dataIndex: 'total', width: 110, align: 'right',
      render: (v: number) => <b>{fmtUSD(Number(v))}</b> },
  ];

  /* ── Columnas Compras ────────────────────────────────── */
  const comprasCols: ColumnsType<ComprasRow> = [
    { title: 'Fecha', dataIndex: 'date', width: 100,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
    { title: 'N° Factura', dataIndex: 'number', width: 140 },
    { title: 'Proveedor', dataIndex: 'supplierName', ellipsis: true },
    { title: 'NRC', dataIndex: 'supplierNrc', width: 100, render: (v: string) => v || '—' },
    { title: 'Compras', dataIndex: 'subtotal', width: 110, align: 'right',
      render: (v: number) => fmtUSD(Number(v)) },
    { title: 'Crédito Fiscal (IVA)', dataIndex: 'ivaCredited', width: 130, align: 'right',
      render: (v: number) => <b style={{ color: 'hsl(var(--status-success))' }}>{fmtUSD(Number(v))}</b> },
    { title: 'Total', dataIndex: 'total', width: 110, align: 'right',
      render: (v: number) => <b>{fmtUSD(Number(v))}</b> },
  ];

  const ivaAPagar = tab === 'COMPRAS'
    ? Math.max(0, (ventasTotals?.ivaCollected ?? 0) - (comprasTotals?.ivaCredited ?? 0))
    : 0;

  return (
    <div>
      <PageHeader
        title="Libros IVA"
        description={`${tab === 'VENTAS' ? 'Libro de Ventas F-07' : 'Libro de Compras F-14'} — ${MONTHS[month - 1]} ${year}`}
        icon={<Books size={20} />}
        actions={[{ label: 'Exportar CSV', onClick: exportCSV, type: 'default' as const, icon: <DownloadSimple size={14} /> }]}
      />

      {/* Filtros */}
      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col>
          <Select value={tab} onChange={setTab} style={{ width: 200 }}
            options={[
              { value: 'VENTAS', label: '📊 Libro de Ventas (F-07)' },
              { value: 'COMPRAS', label: '📦 Libro de Compras (F-14)' },
            ]}
          />
        </Col>
        <Col>
          <Select value={month} onChange={setMonth} style={{ width: 140 }}
            options={MONTHS.map((m, i) => ({ value: i + 1, label: m }))} />
        </Col>
        <Col>
          <Select value={year} onChange={setYear} style={{ width: 100 }}
            options={YEARS.map(y => ({ value: y, label: String(y) }))} />
        </Col>
      </Row>

      {/* KPIs */}
      {tab === 'VENTAS' && ventasTotals && (
        <Row gutter={12} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small" style={{ borderRadius: 10 }}>
              <Statistic title="Ventas exentas" value={ventasTotals.exemptSales} prefix="$" precision={2} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ borderRadius: 10 }}>
              <Statistic title="Ventas gravadas" value={ventasTotals.taxableSales} prefix="$" precision={2} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ borderRadius: 10 }}>
              <Statistic title="Débito fiscal (IVA cobrado)" value={ventasTotals.ivaCollected} prefix="$" precision={2}
                valueStyle={{ color: 'hsl(var(--status-warning))' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ borderRadius: 10 }}>
              <Statistic title="Total ventas" value={ventasTotals.total} prefix="$" precision={2}
                valueStyle={{ color: 'hsl(var(--status-success))' }} />
            </Card>
          </Col>
        </Row>
      )}

      {tab === 'COMPRAS' && comprasTotals && (
        <>
          <Row gutter={12} style={{ marginBottom: 12 }}>
            <Col span={6}>
              <Card size="small" style={{ borderRadius: 10 }}>
                <Statistic title="Total compras" value={comprasTotals.subtotal} prefix="$" precision={2} />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ borderRadius: 10 }}>
                <Statistic title="Crédito fiscal (IVA pagado)" value={comprasTotals.ivaCredited} prefix="$" precision={2}
                  valueStyle={{ color: 'hsl(var(--status-success))' }} />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ borderRadius: 10 }}>
                <Statistic title="Débito fiscal (ventas)"
                  value={ventasTotals?.ivaCollected ?? 0} prefix="$" precision={2}
                  valueStyle={{ color: 'hsl(var(--status-warning))' }} />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ borderRadius: 10 }}>
                <Statistic title="IVA neto a pagar MH"
                  value={Math.max(0, (ventasTotals?.ivaCollected ?? 0) - comprasTotals.ivaCredited)}
                  prefix="$" precision={2}
                  valueStyle={{ color: 'hsl(var(--status-error))' }} />
              </Card>
            </Col>
          </Row>
          <Alert type="info" showIcon style={{ marginBottom: 12 }}
            message="Declaración mensual F-07 / F-14"
            description={`Débito fiscal: ${fmtUSD(ventasTotals?.ivaCollected ?? 0)} — Crédito fiscal: ${fmtUSD(comprasTotals.ivaCredited)} — IVA a pagar: ${fmtUSD(Math.max(0, (ventasTotals?.ivaCollected ?? 0) - comprasTotals.ivaCredited))}`}
          />
        </>
      )}

      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-default))', borderRadius: 12, padding: 16 }}>
        <p style={{ color: 'hsl(var(--text-muted))', fontSize: 12, marginBottom: 12 }}>
          {tab === 'VENTAS'
            ? 'F-07 — Registra todos los documentos tributarios electrónicos emitidos por la fundación en el período.'
            : 'F-14 — Registra las compras con crédito fiscal IVA realizadas por la fundación en el período.'}
        </p>

        {tab === 'VENTAS' ? (
          <Table
            dataSource={ventasRows} columns={ventasCols}
            rowKey={(_, i) => String(i)} loading={loading}
            size="small" pagination={false}
            summary={rows => ventasTotals ? (
              <Table.Summary.Row style={{ fontWeight: 700, background: 'hsl(var(--bg-page))' }}>
                <Table.Summary.Cell index={0} colSpan={5}>TOTALES</Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">{fmtUSD(ventasTotals.exemptSales)}</Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right">{fmtUSD(ventasTotals.taxableSales)}</Table.Summary.Cell>
                <Table.Summary.Cell index={7} align="right">{fmtUSD(ventasTotals.ivaCollected)}</Table.Summary.Cell>
                <Table.Summary.Cell index={8} align="right">{fmtUSD(ventasTotals.total)}</Table.Summary.Cell>
              </Table.Summary.Row>
            ) : null}
          />
        ) : (
          <Table
            dataSource={comprasRows} columns={comprasCols}
            rowKey={(_, i) => String(i)} loading={loading}
            size="small" pagination={false}
            summary={() => comprasTotals ? (
              <Table.Summary.Row style={{ fontWeight: 700, background: 'hsl(var(--bg-page))' }}>
                <Table.Summary.Cell index={0} colSpan={4}>TOTALES</Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">{fmtUSD(comprasTotals.subtotal)}</Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">{fmtUSD(comprasTotals.ivaCredited)}</Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right">{fmtUSD(comprasTotals.total)}</Table.Summary.Cell>
              </Table.Summary.Row>
            ) : null}
          />
        )}
      </div>
    </div>
  );
}
