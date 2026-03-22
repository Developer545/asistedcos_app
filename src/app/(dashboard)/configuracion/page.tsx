'use client';
import PageHeader from '@/components/shared/PageHeader';
import { Gear } from '@phosphor-icons/react';
import { Empty, Tabs } from 'antd';

export default function ConfiguracionPage() {
  return (
    <div>
      <PageHeader
        title="Configuración"
        description="Ajustes del sistema, organización y usuarios"
        icon={<Gear size={20} />}
      />
      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-default))', borderRadius: 12, padding: '16px 24px 24px' }}>
        <Tabs
          items={[
            { key: 'org',       label: 'Organización',    children: <Empty description="Próximamente" style={{ padding: 32 }} /> },
            { key: 'usuarios',  label: 'Usuarios',        children: <Empty description="Próximamente" style={{ padding: 32 }} /> },
            { key: 'fiscal',    label: 'Datos Fiscales',  children: <Empty description="Próximamente" style={{ padding: 32 }} /> },
            { key: 'planilla',  label: 'Config. Planilla',children: <Empty description="Próximamente" style={{ padding: 32 }} /> },
          ]}
        />
      </div>
    </div>
  );
}
