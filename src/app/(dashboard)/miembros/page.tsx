'use client';
import PageHeader from '@/components/shared/PageHeader';
import { Users } from '@phosphor-icons/react';
import { Empty } from 'antd';

export default function MiembrosPage() {
  return (
    <div>
      <PageHeader
        title="Miembros"
        description="Junta Directiva y personal de la fundación"
        icon={<Users size={20} />}
        actions={[{ label: 'Nuevo miembro', onClick: () => {} }]}
      />
      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-default))', borderRadius: 12, padding: 40 }}>
        <Empty description="Módulo en construcción — próximamente" />
      </div>
    </div>
  );
}
