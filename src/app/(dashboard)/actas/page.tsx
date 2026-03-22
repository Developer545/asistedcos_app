'use client';
import PageHeader from '@/components/shared/PageHeader';
import { FileText } from '@phosphor-icons/react';
import { Empty } from 'antd';

export default function ActasPage() {
  return (
    <div>
      <PageHeader
        title="Actas"
        description="Registro de actas de sesiones y asambleas"
        icon={<FileText size={20} />}
        actions={[{ label: 'Nueva acta', onClick: () => {} }]}
      />
      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-default))', borderRadius: 12, padding: 40 }}>
        <Empty description="Módulo en construcción — próximamente" />
      </div>
    </div>
  );
}
