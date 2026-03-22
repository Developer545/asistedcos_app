'use client';
import PageHeader from '@/components/shared/PageHeader';
import { Globe } from '@phosphor-icons/react';
import { Empty, Tabs } from 'antd';

export default function GestionWebPage() {
  return (
    <div>
      <PageHeader
        title="Gestión Web"
        description="Administra el contenido del sitio público asistedcos.org"
        icon={<Globe size={20} />}
      />
      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-default))', borderRadius: 12, padding: '16px 24px 24px' }}>
        <Tabs
          items={[
            { key: 'contenido', label: 'Contenido',   children: <Empty description="Próximamente" style={{ padding: 32 }} /> },
            { key: 'noticias',  label: 'Noticias',    children: <Empty description="Próximamente" style={{ padding: 32 }} /> },
            { key: 'galeria',   label: 'Galería',     children: <Empty description="Próximamente" style={{ padding: 32 }} /> },
          ]}
        />
      </div>
    </div>
  );
}
