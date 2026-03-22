'use client';

/**
 * Dashboard — Vista principal de ASISTEDCOS Admin.
 * KPIs + gráficas de donaciones y actividad + calendario fiscal.
 */

import React, { useEffect, useState } from 'react';
import { Spin, Alert } from 'antd';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  Heart, FolderOpen, PersonSimpleRun, HandHeart,
  Receipt, WarningCircle, Users, Globe,
} from '@phosphor-icons/react';
import PageHeader from '@/components/shared/PageHeader';
import KpiCard    from '@/components/shared/KpiCard';

/* Datos ficticios para gráficas (hasta que haya datos reales) */
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const mockDonations = MONTHS.map((m, i) => ({
  mes:  m,
  monto: Math.floor(Math.random() * 3000 + 500),
}));

/* Calendario fiscal El Salvador */
const FISCAL_EVENTS = [
  { mes: 'Enero',      evento: 'F-07 Libro IVA Ventas Dic', vence: '31 Ene' },
  { mes: 'Febrero',    evento: 'Declaración IVA Enero (F-07)', vence: '28 Feb' },
  { mes: 'Marzo',      evento: 'Declaración Renta Anual (F-11)', vence: '30 Abr' },
  { mes: 'Abril',      evento: 'Informe Agentes Retención (F-910)', vence: '30 Abr' },
  { mes: 'Mayo',       evento: 'Declaración IVA Abril', vence: '31 May' },
  { mes: 'Julio',      evento: 'Declaración IVA Jun + Pago a Cuenta', vence: '31 Jul' },
  { mes: 'Diciembre',  evento: 'Cierre ejercicio fiscal', vence: '31 Dic' },
];

type Stats = {
  donors:              number;
  donationsYear:       number;
  projects:            number;
  activeProjects:      number;
  beneficiaries:       number;
  activeBeneficiaries: number;
  volunteers:          number;
  expensesMonth:       number;
  pendingExpenses:     number;
};

function fmtUSD(n: number) {
  return new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
}

export default function DashboardPage() {
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(r => r.json())
      .then(d => setStats(d.data))
      .catch(() => setError('No se pudo cargar el resumen'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <Spin size="large" />
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Resumen general — ${new Date().toLocaleDateString('es-SV', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
        icon={<Globe size={20} />}
      />

      {error && <Alert type="error" message={error} style={{ marginBottom: 24 }} />}

      {/* ── KPIs ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        <KpiCard
          label="Donantes registrados"
          value={stats?.donors ?? 0}
          icon={<Heart size={18} />}
          color="hsl(var(--status-error))"
        />
        <KpiCard
          label="Donaciones este año"
          value={fmtUSD(stats?.donationsYear ?? 0)}
          icon={<Heart size={18} />}
          color="hsl(var(--brand-primary))"
        />
        <KpiCard
          label="Proyectos activos"
          value={`${stats?.activeProjects ?? 0} / ${stats?.projects ?? 0}`}
          icon={<FolderOpen size={18} />}
          color="hsl(var(--status-info))"
        />
        <KpiCard
          label="Beneficiarios activos"
          value={stats?.activeBeneficiaries ?? 0}
          sub={`de ${stats?.beneficiaries ?? 0} registrados`}
          icon={<PersonSimpleRun size={18} />}
          color="hsl(var(--status-success))"
        />
        <KpiCard
          label="Voluntarios activos"
          value={stats?.volunteers ?? 0}
          icon={<HandHeart size={18} />}
          color="hsl(var(--brand-secondary))"
        />
        <KpiCard
          label="Gastos del mes"
          value={fmtUSD(stats?.expensesMonth ?? 0)}
          icon={<Receipt size={18} />}
          color="hsl(var(--status-warning))"
        />
        <KpiCard
          label="Gastos pendientes"
          value={stats?.pendingExpenses ?? 0}
          sub="Requieren aprobación"
          icon={<WarningCircle size={18} />}
          color="hsl(var(--status-error))"
        />
        <KpiCard
          label="Miembros ONG"
          value="—"
          sub="Ver módulo Miembros"
          icon={<Users size={18} />}
          color="hsl(var(--brand-accent))"
        />
      </div>

      {/* ── Gráficas ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        {/* Donaciones por mes */}
        <div style={{
          background: 'hsl(var(--bg-surface))',
          border: '1px solid hsl(var(--border-default))',
          borderRadius: 12,
          padding: '20px 24px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'hsl(var(--text-primary))' }}>
            Donaciones por mes (año actual)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={mockDonations} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-default))" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v) => [fmtUSD(Number(v)), 'Donaciones']}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Bar dataKey="monto" fill="hsl(var(--brand-primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Calendario fiscal */}
        <div style={{
          background: 'hsl(var(--bg-surface))',
          border: '1px solid hsl(var(--border-default))',
          borderRadius: 12,
          padding: '20px 24px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'hsl(var(--text-primary))' }}>
            Calendario Fiscal El Salvador
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', maxHeight: 200 }}>
            {FISCAL_EVENTS.map(e => (
              <div key={e.evento} style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                padding: '6px 10px', borderRadius: 8,
                background: 'hsl(var(--bg-subtle))',
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: 'hsl(var(--brand-primary))',
                  background: 'hsl(var(--brand-primary-light))',
                  padding: '2px 6px', borderRadius: 4, flexShrink: 0, marginTop: 1,
                }}>
                  {e.mes}
                </span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'hsl(var(--text-primary))' }}>{e.evento}</div>
                  <div style={{ fontSize: 11, color: 'hsl(var(--text-muted))' }}>Vence: {e.vence}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
