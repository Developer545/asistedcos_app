'use client';
import PageHeader from '@/components/shared/PageHeader';
import { FolderOpen } from '@phosphor-icons/react';
import { Empty } from 'antd';

export default function ProyectosPage() {
  return (
    <div>
      <PageHeader
        title="Proyectos"
        description="Gestión de proyectos y programas de la ONG"
        icon={<FolderOpen size={20} />}
        actions={[{ label: 'Nuevo proyecto', onClick: () => {} }]}
      />
      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-default))', borderRadius: 12, padding: 40 }}>
        <Empty description="Módulo en construcción — próximamente" />
      </div>
    </div>
  );
}
