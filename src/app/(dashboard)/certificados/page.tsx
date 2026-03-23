'use client';

/**
 * /certificados — Listado de todos los Comprobantes de Donación.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Tag, Space, Input, Select, Popconfirm, Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  Certificate, MagnifyingGlass, Eye, Prohibit, ArrowsClockwise,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/shared/PageHeader';

type Cert = {
  id:        string;
  number:    string;
  status:    string;
  date:      string;
  donorName: string;
  donorNit:  string | null;
  amount:    number | string;
  description: string;
  donation?: {
    paymentMethod: string;
    project?: { name: string } | null;
  };
};

const STATUS_COLOR: Record<string, string> = {
  EMITIDO: 'success', BORRADOR: 'default', ANULADO: 'error',
};

const PAYMENT_LABELS: Record<string, string> = {
  EFECTIVO: 'Efectivo', TRANSFERENCIA: 'Transferencia',
  CHEQUE: 'Cheque', TARJETA: 'Tarjeta', OTRO: 'Otro',
};

function fmtUSD(n: number | string) {
  return new Intl.NumberFormat('es-SV', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2,
  }).format(Number(n));
}

const YEARS = Array.from({ length: 6 }, (_, i) => {
  const y = new Date().getFullYear() - i;
  return { value: String(y), label: String(y) };
});

export default function CertificadosPage() {
  const router                    = useRouter();
  const [data, setData]           = useState<Cert[]>([]);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState('');
  const [status, setStatus]       = useState('');
  const [year, setYear]           = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });

  const load = useCallback(async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page:  String(page),
        limit: String(pageSize),
        ...(search && { search }),
        ...(status && { status }),
        ...(year   && { year }),
      });
      const r = await fetch(`/api/certificados?${params}`);
      const d = await r.json();
      setData(d.data ?? []);
      setPagination(prev => ({
        ...prev, current: page, pageSize,
        total: d.pagination?.total ?? 0,
      }));
    } catch { toast.error('Error cargando certificados'); }
    finally { setLoading(false); }
  }, [search, status, year]);

  useEffect(() => { load(); }, [load]);

  async function voidCert(cert: Cert) {
    try {
      const r = await fetch(`/api/certificados/${cert.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: 'ANULADO' }),
      });
      if (!r.ok) throw new Error();
      toast.success(`Certificado ${cert.number} anulado`);
      load();
    } catch { toast.error('Error anulando certificado'); }
  }

  const columns: ColumnsType<Cert> = [
    {
      title: 'N° Certificado', dataIndex: 'number', key: 'number',
      render: n => <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{n}</span>,
    },
    {
      title: 'Fecha', dataIndex: 'date', key: 'date',
      render: d => new Date(d).toLocaleDateString('es-SV'),
      width: 110,
    },
    {
      title: 'Donante', dataIndex: 'donorName', key: 'donorName',
      render: (name, row) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name}</div>
          {row.donorNit && <div style={{ fontSize: 11, color: '#999' }}>NIT: {row.donorNit}</div>}
        </div>
      ),
    },
    {
      title: 'Proyecto', key: 'project',
      render: (_, row) => row.donation?.project?.name
        ? <Tag>{row.donation.project.name}</Tag>
        : <span style={{ color: '#bbb' }}>General</span>,
    },
    {
      title: 'Pago', key: 'pay',
      render: (_, row) => row.donation?.paymentMethod
        ? PAYMENT_LABELS[row.donation.paymentMethod] ?? row.donation.paymentMethod
        : '—',
      width: 120,
    },
    {
      title: 'Monto', dataIndex: 'amount', key: 'amount',
      render: a => <span style={{ fontWeight: 700 }}>{fmtUSD(a)}</span>,
      width: 120,
    },
    {
      title: 'Estado', dataIndex: 'status', key: 'status',
      render: s => <Tag color={STATUS_COLOR[s] ?? 'default'}>{s}</Tag>,
      width: 100,
    },
    {
      title: 'Acciones', key: 'actions', width: 120,
      render: (_, row) => (
        <Space>
          <Tooltip title="Ver certificado">
            <Button
              size="small"
              icon={<Eye size={14} />}
              onClick={() => router.push(`/certificados/${row.id}`)}
            />
          </Tooltip>
          {row.status === 'EMITIDO' && (
            <Popconfirm
              title="¿Anular este certificado?"
              description="Esta acción no se puede deshacer."
              okText="Anular" okButtonProps={{ danger: true }}
              cancelText="Cancelar"
              onConfirm={() => voidCert(row)}
            >
              <Tooltip title="Anular">
                <Button size="small" danger icon={<Prohibit size={14} />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Certificados de Donación"
        description="Comprobantes emitidos — visualiza, imprime o descarga como PDF"
        icon={<Certificate size={20} />}
        extra={
          <Button icon={<ArrowsClockwise size={14} />} onClick={() => load()}>
            Actualizar
          </Button>
        }
      />

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <Input
          prefix={<MagnifyingGlass size={14} />}
          placeholder="Buscar por N° o donante..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 280 }}
          allowClear
        />
        <Select
          placeholder="Estado"
          value={status || undefined}
          onChange={v => setStatus(v ?? '')}
          allowClear
          style={{ width: 140 }}
          options={[
            { value: 'EMITIDO',  label: 'Emitido' },
            { value: 'BORRADOR', label: 'Borrador' },
            { value: 'ANULADO',  label: 'Anulado' },
          ]}
        />
        <Select
          placeholder="Año"
          value={year || undefined}
          onChange={v => setYear(v ?? '')}
          allowClear
          style={{ width: 110 }}
          options={YEARS}
        />
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          current:   pagination.current,
          pageSize:  pagination.pageSize,
          total:     pagination.total,
          showTotal: (t) => `${t} certificados`,
          onChange:  (page, size) => load(page, size),
        }}
        size="small"
      />
    </div>
  );
}
