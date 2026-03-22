'use client';
import PageHeader from '@/components/shared/PageHeader';
import { ShoppingCart } from '@phosphor-icons/react';
import { Empty } from 'antd';

export default function ComprasPage() {
  return (
    <div>
      <PageHeader
        title="Compras"
        description="Órdenes de compra y adquisiciones"
        icon={<ShoppingCart size={20} />}
        actions={[{ label: 'Nueva orden de compra', onClick: () => {} }]}
      />
      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-default))', borderRadius: 12, padding: 40 }}>
        <Empty description="Módulo en construcción — próximamente" />
      </div>
    </div>
  );
}
