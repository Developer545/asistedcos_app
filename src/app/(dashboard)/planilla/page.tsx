'use client';
import PageHeader from '@/components/shared/PageHeader';
import { Users } from '@phosphor-icons/react';
import { Empty } from 'antd';

export default function PlanillaPage() {
  return (
    <div>
      <PageHeader
        title="Planilla"
        description="Gestión de nómina con ISSS, AFP y Renta — El Salvador"
        icon={<Users size={20} />}
        actions={[{ label: 'Nueva planilla', onClick: () => {} }]}
      />
      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-default))', borderRadius: 12, padding: 40 }}>
        <Empty description="Módulo en construcción — próximamente" />
      </div>
    </div>
  );
}
