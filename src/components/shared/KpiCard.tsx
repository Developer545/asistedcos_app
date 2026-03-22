/**
 * KpiCard — Tarjeta de métrica reutilizable.
 * Sin dependencia de Ant Design para máxima flexibilidad.
 */

type Props = {
  label:    string;
  value:    string | number;
  sub?:     string;
  icon?:    React.ReactNode;
  color?:   string;   // CSS color del acento
  trend?:   { value: number; label: string };
};

export default function KpiCard({ label, value, sub, icon, color = 'hsl(var(--brand-primary))', trend }: Props) {
  return (
    <div style={{
      background:   'hsl(var(--bg-surface))',
      border:       '1px solid hsl(var(--border-default))',
      borderRadius: 12,
      padding:      '20px 24px',
      boxShadow:    'var(--shadow-sm)',
      display:      'flex',
      flexDirection:'column',
      gap:          6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          {label}
        </span>
        {icon && (
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: `${color}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color,
          }}>
            {icon}
          </div>
        )}
      </div>

      <span style={{ fontSize: 28, fontWeight: 800, color: 'hsl(var(--text-primary))', lineHeight: 1.1 }}>
        {value}
      </span>

      {(sub || trend) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {trend && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 20,
              background: trend.value >= 0 ? 'hsl(var(--status-success-bg))' : 'hsl(var(--status-error-bg))',
              color:      trend.value >= 0 ? 'hsl(var(--status-success))'    : 'hsl(var(--status-error))',
            }}>
              {trend.value >= 0 ? '+' : ''}{trend.value}%
            </span>
          )}
          {sub && (
            <span style={{ fontSize: 12, color: 'hsl(var(--text-muted))' }}>{sub}</span>
          )}
        </div>
      )}
    </div>
  );
}
