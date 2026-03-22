'use client';

/**
 * DashboardSidebar — Sidebar colapsible para ASISTEDCOS Admin.
 * Módulos ONG: Donaciones, Proyectos, Miembros, Voluntarios, Beneficiarios,
 * Gastos, Compras, Inventario, Planilla, Facturación, Retenciones, Libros IVA,
 * Actas, Reportes, Gestión Web, Proveedores, Configuración.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';
import {
  House,
  Heart,
  FolderOpen,
  Users,
  HandHeart,
  PersonSimpleRun,
  ShoppingCart,
  Package,
  Receipt,
  FileMinus,
  Books,
  FileText,
  ChartBar,
  Globe,
  Truck,
  Gear,
  List,
  X,
  SignOut,
  CaretRight,
} from '@phosphor-icons/react';

/* ─── Tipos ─────────────────────────────────────────────── */
type NavItem = {
  href:    string;
  label:   string;
  icon:    React.ReactNode;
  section?: string;
};

const NAV_ITEMS: NavItem[] = [
  /* Principal */
  { href: '/dashboard',           label: 'Dashboard',       icon: <House size={18} weight="duotone" /> },

  /* Gestión ONG */
  { href: '/donaciones',          label: 'Donaciones',      icon: <Heart size={18} weight="duotone" />,          section: 'Gestión ONG' },
  { href: '/proyectos',           label: 'Proyectos',       icon: <FolderOpen size={18} weight="duotone" />,     section: 'Gestión ONG' },
  { href: '/miembros',            label: 'Miembros',        icon: <Users size={18} weight="duotone" />,          section: 'Gestión ONG' },
  { href: '/voluntarios',         label: 'Voluntarios',     icon: <HandHeart size={18} weight="duotone" />,      section: 'Gestión ONG' },
  { href: '/beneficiarios',       label: 'Beneficiarios',   icon: <PersonSimpleRun size={18} weight="duotone" />,section: 'Gestión ONG' },

  /* Financiero */
  { href: '/gastos',              label: 'Gastos',          icon: <Receipt size={18} weight="duotone" />,        section: 'Financiero' },
  { href: '/compras',             label: 'Compras',         icon: <ShoppingCart size={18} weight="duotone" />,   section: 'Financiero' },
  { href: '/inventario',          label: 'Inventario',      icon: <Package size={18} weight="duotone" />,        section: 'Financiero' },
  { href: '/proveedores',         label: 'Proveedores',     icon: <Truck size={18} weight="duotone" />,          section: 'Financiero' },
  { href: '/planilla',            label: 'Planilla',        icon: <Users size={18} weight="duotone" />,          section: 'Financiero' },

  /* Fiscal */
  { href: '/facturacion',         label: 'Facturación',     icon: <FileText size={18} weight="duotone" />,       section: 'Fiscal' },
  { href: '/retenciones',         label: 'Retenciones',     icon: <FileMinus size={18} weight="duotone" />,      section: 'Fiscal' },
  { href: '/libros-iva',          label: 'Libros IVA',      icon: <Books size={18} weight="duotone" />,          section: 'Fiscal' },

  /* Administración */
  { href: '/actas',               label: 'Actas',           icon: <FileText size={18} weight="duotone" />,       section: 'Administración' },
  { href: '/reportes',            label: 'Reportes',        icon: <ChartBar size={18} weight="duotone" />,       section: 'Administración' },
  { href: '/gestion-web',         label: 'Gestión Web',     icon: <Globe size={18} weight="duotone" />,          section: 'Administración' },
  { href: '/configuracion',       label: 'Configuración',   icon: <Gear size={18} weight="duotone" />,           section: 'Administración' },
];

/* Orden de secciones */
const SECTION_ORDER = ['Gestión ONG', 'Financiero', 'Fiscal', 'Administración'];

/* ─── Componente ─────────────────────────────────────────── */
export default function DashboardSidebar() {
  const pathname  = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  /* Agrupar items por sección */
  const topItems  = NAV_ITEMS.filter(i => !i.section);
  const grouped   = SECTION_ORDER.map(s => ({
    section: s,
    items:   NAV_ITEMS.filter(i => i.section === s),
  }));

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch {
      toast.error('Error al cerrar sesión');
    }
  }

  /* ── Estilos base ────────────────────────────────────────── */
  const sidebarW = collapsed ? 64 : 240;

  return (
    <aside style={{
      width:          sidebarW,
      minHeight:      '100vh',
      background:     'hsl(var(--sidebar-bg))',
      borderRight:    '1px solid hsl(var(--sidebar-border))',
      display:        'flex',
      flexDirection:  'column',
      transition:     'width 0.22s ease',
      overflow:       'hidden',
      flexShrink:     0,
      position:       'sticky',
      top:            0,
    }}>

      {/* ── Logo + Toggle ────────────────────────────────── */}
      <div style={{
        height:         56,
        display:        'flex',
        alignItems:     'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        padding:        collapsed ? '0 12px' : '0 16px',
        borderBottom:   '1px solid hsl(var(--sidebar-border))',
        flexShrink:     0,
      }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'hsl(var(--brand-primary))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>A</span>
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'hsl(var(--sidebar-fg))', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                ASISTEDCOS
              </div>
              <div style={{ fontSize: 9, color: 'hsl(var(--sidebar-muted))', whiteSpace: 'nowrap' }}>
                Sistema Administrativo
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => setCollapsed(c => !c)}
          className="sidebar-toggle-btn"
          title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          style={{
            width: 28, height: 28, borderRadius: 6,
            border: '1px solid hsl(var(--sidebar-border))',
            background: 'transparent',
            color: 'hsl(var(--sidebar-muted))',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          {collapsed ? <List size={14} /> : <X size={14} />}
        </button>
      </div>

      {/* ── Nav ──────────────────────────────────────────── */}
      <nav
        className="sidebar-scroll"
        style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '12px 0' }}
      >
        {/* Top items (sin sección) */}
        {topItems.map(item => (
          <NavLink key={item.href} item={item} collapsed={collapsed} active={isActive(item.href)} />
        ))}

        {/* Secciones */}
        {grouped.map(({ section, items }) => (
          <div key={section}>
            {!collapsed && (
              <div style={{
                fontSize: 9.5,
                fontWeight: 700,
                color: 'hsl(var(--sidebar-muted))',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                padding: '14px 16px 4px',
              }}>
                {section}
              </div>
            )}
            {collapsed && <div style={{ height: 8 }} />}
            {items.map(item => (
              <NavLink key={item.href} item={item} collapsed={collapsed} active={isActive(item.href)} />
            ))}
          </div>
        ))}
      </nav>

      {/* ── Logout ───────────────────────────────────────── */}
      <div style={{
        padding: collapsed ? '12px 8px' : '12px 10px',
        borderTop: '1px solid hsl(var(--sidebar-border))',
        flexShrink: 0,
      }}>
        <button
          onClick={handleLogout}
          className="sidebar-logout-btn"
          title="Cerrar sesión"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: collapsed ? '7px' : '7px 10px',
            borderRadius: 8,
            border: '1px solid transparent',
            background: 'transparent',
            color: 'hsl(var(--sidebar-muted))',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            justifyContent: collapsed ? 'center' : 'flex-start',
            transition: 'background 0.15s, color 0.15s, border-color 0.15s',
          }}
        >
          <SignOut size={17} />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
}

/* ── NavLink ───────────────────────────────────────────────── */
function NavLink({ item, collapsed, active }: { item: NavItem; collapsed: boolean; active: boolean }) {
  return (
    <Link
      href={item.href}
      className="sidebar-nav-link"
      title={collapsed ? item.label : undefined}
      style={{
        display:        'flex',
        alignItems:     'center',
        gap:            9,
        padding:        collapsed ? '8px' : '7px 14px',
        margin:         '1px 8px',
        borderRadius:   8,
        textDecoration: 'none',
        fontSize:       13,
        fontWeight:     active ? 600 : 400,
        color:          active ? 'hsl(var(--brand-primary))' : 'hsl(var(--sidebar-fg))',
        background:     active ? 'hsl(var(--brand-primary) / 0.12)' : 'transparent',
        justifyContent: collapsed ? 'center' : 'flex-start',
        transition:     'background 0.15s, color 0.15s',
        whiteSpace:     'nowrap',
        overflow:       'hidden',
      }}
    >
      <span style={{ flexShrink: 0, opacity: active ? 1 : 0.75 }}>{item.icon}</span>
      {!collapsed && (
        <>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
          {active && <CaretRight size={11} weight="bold" style={{ flexShrink: 0, opacity: 0.6 }} />}
        </>
      )}
    </Link>
  );
}
