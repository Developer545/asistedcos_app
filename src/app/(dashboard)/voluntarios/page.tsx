'use client';
import PageHeader from '@/components/shared/PageHeader';
import { HandHeart } from '@phosphor-icons/react';
import { Empty } from 'antd';

export default function VoluntariosPage() {
  return (
    <div>
      <PageHeader
        title="Voluntarios"
        description="Registro y participación de voluntarios"
        icon={<HandHeart size={20} />}
        actions={[{ label: 'Nuevo voluntario', onClick: () => {} }]}
      />
      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-default))', borderRadius: 12, padding: 40 }}>
        <Empty description="Módulo en construcción — próximamente" />
      </div>
    </div>
  );
}
