'use client';
import PageHeader from '@/components/shared/PageHeader';
import { FileText } from '@phosphor-icons/react';
import { Empty, Tabs } from 'antd';

export default function FacturacionPage() {
  return (
    <div>
      <PageHeader
        title="Facturación"
        description="Emisión de DTE: Facturas, CCF, Notas de Crédito/Débito, Comprobantes de Donación"
        icon={<FileText size={20} />}
        actions={[{ label: 'Emitir documento', onClick: () => {} }]}
      />
      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-default))', borderRadius: 12, padding: '16px 24px 24px' }}>
        <Tabs
          items={[
            { key: 'facturas',      label: 'Facturas (01)',       children: <Empty description="Próximamente" style={{ padding: 32 }} /> },
            { key: 'ccf',          label: 'CCF (03)',             children: <Empty description="Próximamente" style={{ padding: 32 }} /> },
            { key: 'notas',        label: 'Notas de Crédito (05)',children: <Empty description="Próximamente" style={{ padding: 32 }} /> },
            { key: 'donacion',     label: 'Comp. Donación (46)', children: <Empty description="Próximamente" style={{ padding: 32 }} /> },
          ]}
        />
      </div>
    </div>
  );
}
