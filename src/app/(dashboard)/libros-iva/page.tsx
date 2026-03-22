'use client';
import PageHeader from '@/components/shared/PageHeader';
import { Books } from '@phosphor-icons/react';
import { Empty, Tabs } from 'antd';

export default function LibrosIvaPage() {
  return (
    <div>
      <PageHeader
        title="Libros IVA"
        description="Libro de Ventas (F-07) y Libro de Compras (F-14) — Ministerio de Hacienda El Salvador"
        icon={<Books size={20} />}
      />
      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-default))', borderRadius: 12, padding: '16px 24px 24px' }}>
        <Tabs
          items={[
            { key: 'ventas',   label: 'Libro de Ventas (F-07)',  children: <Empty description="Próximamente" style={{ padding: 32 }} /> },
            { key: 'compras',  label: 'Libro de Compras (F-14)', children: <Empty description="Próximamente" style={{ padding: 32 }} /> },
          ]}
        />
      </div>
    </div>
  );
}
