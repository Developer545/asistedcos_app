'use client';
import PageHeader from '@/components/shared/PageHeader';
import { Heart } from '@phosphor-icons/react';
import { Empty } from 'antd';

export default function DonacionesPage() {
  return (
    <div>
      <PageHeader
        title="Donaciones"
        description="Registro y seguimiento de donaciones recibidas"
        icon={<Heart size={20} />}
        actions={[{ label: 'Nueva donación', onClick: () => {} }]}
      />
      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-default))', borderRadius: 12, padding: 40 }}>
        <Empty description="Módulo en construcción — próximamente" />
      </div>
    </div>
  );
}
