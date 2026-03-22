/**
 * PageHeader — Cabecera reutilizable para todas las páginas del dashboard.
 */

import React from 'react';
import { Button } from 'antd';
import type { ButtonProps } from 'antd';

type Action = ButtonProps & { label: string };

type Props = {
  title:       string;
  description?: string;
  actions?:    Action[];
  icon?:       React.ReactNode;
};

export default function PageHeader({ title, description, actions, icon }: Props) {
  return (
    <div style={{
      display:        'flex',
      alignItems:     'flex-start',
      justifyContent: 'space-between',
      flexWrap:       'wrap',
      gap:            12,
      marginBottom:   24,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {icon && (
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'hsl(var(--brand-primary) / 0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'hsl(var(--brand-primary))',
            flexShrink: 0,
          }}>
            {icon}
          </div>
        )}
        <div>
          <h1 style={{
            margin: 0, fontSize: 20, fontWeight: 700,
            color: 'hsl(var(--text-primary))',
            letterSpacing: '-0.3px',
          }}>
            {title}
          </h1>
          {description && (
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'hsl(var(--text-muted))' }}>
              {description}
            </p>
          )}
        </div>
      </div>

      {actions && actions.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {actions.map(({ label, ...btnProps }, i) => (
            <Button key={i} type={i === 0 ? 'primary' : 'default'} {...btnProps}>
              {label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
