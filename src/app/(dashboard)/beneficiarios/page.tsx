'use client';
import PageHeader from '@/components/shared/PageHeader';
import { PersonSimpleRun } from '@phosphor-icons/react';
import { Empty } from 'antd';

export default function BeneficiariosPage() {
  return (
    <div>
      <PageHeader
        title="Beneficiarios"
        description="Personas atendidas por los programas de la fundación"
        icon={<PersonSimpleRun size={20} />}
        actions={[{ label: 'Nuevo beneficiario', onClick: () => {} }]}
      />
      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-default))', borderRadius: 12, padding: 40 }}>
        <Empty description="Módulo en construcción — próximamente" />
      </div>
    </div>
  );
}
