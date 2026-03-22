'use client';
import PageHeader from '@/components/shared/PageHeader';
import { ChartBar } from '@phosphor-icons/react';
import { Empty } from 'antd';

export default function ReportesPage() {
  return (
    <div>
      <PageHeader
        title="Reportes"
        description="Informes financieros, de impacto y declaraciones"
        icon={<ChartBar size={20} />}
      />
      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-default))', borderRadius: 12, padding: 40 }}>
        <Empty description="Módulo en construcción — próximamente" />
      </div>
    </div>
  );
}
