'use client';
import PageHeader from '@/components/shared/PageHeader';
import { Package } from '@phosphor-icons/react';
import { Empty } from 'antd';

export default function InventarioPage() {
  return (
    <div>
      <PageHeader
        title="Inventario"
        description="Control de existencias e insumos por proyecto"
        icon={<Package size={20} />}
        actions={[{ label: 'Nuevo producto', onClick: () => {} }]}
      />
      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-default))', borderRadius: 12, padding: 40 }}>
        <Empty description="Módulo en construcción — próximamente" />
      </div>
    </div>
  );
}
