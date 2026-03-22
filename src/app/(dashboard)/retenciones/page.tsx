'use client';
import PageHeader from '@/components/shared/PageHeader';
import { FileMinus } from '@phosphor-icons/react';
import { Empty } from 'antd';

export default function RetencionesPage() {
  return (
    <div>
      <PageHeader
        title="Retenciones"
        description="Comprobantes de Retención DTE Tipo 11 — ISR sobre servicios"
        icon={<FileMinus size={20} />}
        actions={[{ label: 'Emitir retención', onClick: () => {} }]}
      />
      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-default))', borderRadius: 12, padding: 40 }}>
        <Empty description="Módulo en construcción — próximamente" />
      </div>
    </div>
  );
}
