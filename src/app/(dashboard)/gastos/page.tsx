'use client';
import PageHeader from '@/components/shared/PageHeader';
import { Receipt } from '@phosphor-icons/react';
import { Empty } from 'antd';

export default function GastosPage() {
  return (
    <div>
      <PageHeader
        title="Gastos"
        description="Control de egresos y gastos operativos"
        icon={<Receipt size={20} />}
        actions={[{ label: 'Registrar gasto', onClick: () => {} }]}
      />
      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-default))', borderRadius: 12, padding: 40 }}>
        <Empty description="Módulo en construcción — próximamente" />
      </div>
    </div>
  );
}
