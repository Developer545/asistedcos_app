'use client';
import PageHeader from '@/components/shared/PageHeader';
import { Truck } from '@phosphor-icons/react';
import { Empty } from 'antd';

export default function ProveedoresPage() {
  return (
    <div>
      <PageHeader
        title="Proveedores"
        description="Directorio de proveedores y contratistas"
        icon={<Truck size={20} />}
        actions={[{ label: 'Nuevo proveedor', onClick: () => {} }]}
      />
      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-default))', borderRadius: 12, padding: 40 }}>
        <Empty description="Módulo en construcción — próximamente" />
      </div>
    </div>
  );
}
