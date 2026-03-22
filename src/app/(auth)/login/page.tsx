'use client';

/**
 * Login — Acceso al sistema ASISTEDCOS Admin.
 * Split-screen: panel verde izquierdo + formulario derecho.
 * Sin paso de código de empresa (instancia única).
 */

import React, { useState } from 'react';
import { Form, Input, Button, Checkbox } from 'antd';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type FormValues = { email: string; password: string; remember?: boolean };

export default function LoginPage() {
  const router   = useRouter();
  const [loading, setLoading] = useState(false);

  async function onFinish(values: FormValues) {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: values.email, password: values.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al iniciar sesión');
      toast.success(`Bienvenida, ${data.data?.name ?? ''}`, { duration: 2500 });
      router.replace('/dashboard');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'hsl(var(--bg-page))' }}>

      {/* ── Panel izquierdo (verde) ───────────────────── */}
      <div style={{
        flex:           '0 0 440px',
        background:     'hsl(var(--sidebar-bg))',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '48px 40px',
        gap:            32,
      }}
        className="login-left-panel"
      >
        {/* Logo */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 18,
            background: 'hsl(var(--brand-primary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px hsl(var(--brand-primary) / 0.4)',
          }}>
            <span style={{ color: '#fff', fontSize: 32, fontWeight: 900 }}>A</span>
          </div>
          <h1 style={{ margin: 0, color: '#fff', fontSize: 22, fontWeight: 800, letterSpacing: '-0.3px' }}>
            ASISTEDCOS
          </h1>
          <p style={{ margin: '4px 0 0', color: 'hsl(var(--sidebar-muted))', fontSize: 13 }}>
            Fundación El Salvador
          </p>
        </div>

        {/* Separador */}
        <div style={{ width: '100%', borderTop: '1px solid hsl(var(--sidebar-border))' }} />

        {/* Valores */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { emoji: '🌿', title: 'Gestión Integral', desc: 'Donaciones, proyectos, beneficiarios y más' },
            { emoji: '📋', title: 'Cumplimiento Fiscal', desc: 'CCF, Facturas, Retenciones DTE El Salvador' },
            { emoji: '👥', title: 'Capital Humano', desc: 'Planilla completa con ISSS, AFP y Renta' },
          ].map(({ emoji, title, desc }) => (
            <div key={title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 20, lineHeight: 1.2, marginTop: 2 }}>{emoji}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{title}</div>
                <div style={{ fontSize: 11.5, color: 'hsl(var(--sidebar-muted))', marginTop: 1 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p style={{ margin: 0, fontSize: 10.5, color: 'hsl(var(--sidebar-muted))', textAlign: 'center', lineHeight: 1.5 }}>
          Sistema interno — acceso autorizado únicamente
        </p>
      </div>

      {/* ── Panel derecho (formulario) ────────────────── */}
      <div style={{
        flex:           1,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '48px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <h2 style={{
            margin: '0 0 6px',
            fontSize: 26,
            fontWeight: 800,
            color: 'hsl(var(--text-primary))',
            letterSpacing: '-0.4px',
          }}>
            Iniciar sesión
          </h2>
          <p style={{ margin: '0 0 32px', fontSize: 14, color: 'hsl(var(--text-muted))' }}>
            Ingresa tus credenciales para acceder al sistema.
          </p>

          <Form layout="vertical" onFinish={onFinish} requiredMark={false} size="large">
            <Form.Item
              label="Correo electrónico"
              name="email"
              rules={[
                { required: true, message: 'Ingresa tu correo' },
                { type: 'email', message: 'Correo inválido' },
              ]}
            >
              <Input
                placeholder="admin@asistedcos.org"
                autoComplete="email"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item
              label="Contraseña"
              name="password"
              rules={[{ required: true, message: 'Ingresa tu contraseña' }]}
            >
              <Input.Password
                placeholder="••••••••"
                autoComplete="current-password"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item name="remember" valuePropName="checked" style={{ marginBottom: 24 }}>
              <Checkbox>Mantener sesión iniciada</Checkbox>
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{ height: 44, fontWeight: 600, fontSize: 15, borderRadius: 8 }}
              >
                Ingresar al sistema
              </Button>
            </Form.Item>
          </Form>

          <p style={{ marginTop: 32, fontSize: 12, color: 'hsl(var(--text-muted))', textAlign: 'center' }}>
            ¿Problemas de acceso? Contacta al administrador del sistema.
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .login-left-panel { display: none !important; }
        }
      `}</style>
    </div>
  );
}
