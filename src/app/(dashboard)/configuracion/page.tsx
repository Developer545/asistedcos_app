'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Form, Input, Button, Tabs, Table, Modal, Select,
  Space, Tag, Popconfirm, Row, Col, Alert, Divider, Switch,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Gear, Plus, Trash, PencilSimple, Lock } from '@phosphor-icons/react';
import { toast } from 'sonner';
import PageHeader from '@/components/shared/PageHeader';

type User = { id: string; name: string; email: string; role: string; active: boolean; createdAt: string };

export default function ConfiguracionPage() {
  const [tab, setTab] = useState('org');
  const [orgForm] = Form.useForm();
  const [fiscalForm] = Form.useForm();
  const [orgSaving, setOrgSaving] = useState(false);
  const [fiscalSaving, setFiscalSaving] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  /* Usuarios */
  const [users, setUsers]       = useState<User[]>([]);
  const [uLoading, setULoading] = useState(false);
  const [uModal, setUModal]     = useState(false);
  const [uEditing, setUEditing] = useState<User | null>(null);
  const [uSaving, setUSaving]   = useState(false);
  const [uForm]                 = Form.useForm();

  /* ── Cargar configuración ────────────────────────────── */
  const loadConfig = useCallback(async () => {
    try {
      const r = await fetch('/api/configuracion');
      const d = await r.json();
      const cfg = d.data ?? d;
      orgForm.setFieldsValue({
        org_name:     cfg.org_name     ?? '',
        org_email:    cfg.org_email    ?? '',
        org_phone:    cfg.org_phone    ?? '',
        org_address:  cfg.org_address  ?? '',
        org_mission:  cfg.org_mission  ?? '',
        org_whatsapp: cfg.org_whatsapp ?? '',
      });
      fiscalForm.setFieldsValue({
        org_nit:       cfg.org_nit       ?? '',
        org_nrc:       cfg.org_nrc       ?? '',
        org_dui_rep:   cfg.org_dui_rep   ?? '',
        org_rep_legal: cfg.org_rep_legal ?? '',
        org_cod_act:   cfg.org_cod_act   ?? '',
        org_auth_res:  cfg.org_auth_res  ?? '',
      });
      setConfigLoaded(true);
    } catch { toast.error('Error cargando configuración'); }
  }, [orgForm, fiscalForm]);

  const loadUsers = useCallback(async () => {
    setULoading(true);
    try {
      const r = await fetch('/api/configuracion/usuarios');
      const d = await r.json();
      setUsers(d.data ?? []);
    } catch { /* silencioso si no es ADMIN */ }
    finally { setULoading(false); }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);
  useEffect(() => { if (tab === 'usuarios') loadUsers(); }, [tab, loadUsers]);

  async function saveOrg(values: Record<string, unknown>) {
    setOrgSaving(true);
    try {
      const res = await fetch('/api/configuracion', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Información de la organización guardada');
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setOrgSaving(false); }
  }

  async function saveFiscal(values: Record<string, unknown>) {
    setFiscalSaving(true);
    try {
      const res = await fetch('/api/configuracion', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Datos fiscales guardados');
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setFiscalSaving(false); }
  }

  /* ── CRUD Usuarios ───────────────────────────────────── */
  function openUser(record?: User) {
    setUEditing(record ?? null);
    uForm.resetFields();
    if (record) uForm.setFieldsValue({ name: record.name, role: record.role, active: record.active });
    else uForm.setFieldsValue({ role: 'USER', active: true });
    setUModal(true);
  }

  async function saveUser(values: Record<string, unknown>) {
    setUSaving(true);
    try {
      if (uEditing) {
        const res = await fetch(`/api/configuracion/usuarios/${uEditing.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        toast.success('Usuario actualizado');
      } else {
        const res = await fetch('/api/configuracion/usuarios', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        toast.success('Usuario creado');
      }
      setUModal(false);
      loadUsers();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setUSaving(false); }
  }

  async function deleteUser(id: string) {
    try {
      await fetch(`/api/configuracion/usuarios/${id}`, { method: 'DELETE' });
      toast.success('Usuario eliminado');
      loadUsers();
    } catch { toast.error('Error al eliminar'); }
  }

  const userCols: ColumnsType<User> = [
    { title: 'Nombre', dataIndex: 'name', ellipsis: true },
    { title: 'Correo', dataIndex: 'email', ellipsis: true },
    { title: 'Rol', dataIndex: 'role', width: 90,
      render: (v: string) => <Tag color={v === 'ADMIN' ? 'red' : 'blue'}>{v}</Tag> },
    { title: 'Estado', dataIndex: 'active', width: 80,
      render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? 'Activo' : 'Inactivo'}</Tag> },
    {
      title: '', width: 80, align: 'center',
      render: (_: unknown, r: User) => (
        <Space>
          <Button size="small" icon={<PencilSimple size={13} />} onClick={() => openUser(r)} />
          <Popconfirm title="¿Eliminar usuario?" onConfirm={() => deleteUser(r.id)} okText="Sí" cancelText="No">
            <Button size="small" danger icon={<Trash size={13} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'org', label: 'Organización',
      children: (
        <Form form={orgForm} layout="vertical" onFinish={saveOrg} style={{ maxWidth: 680 }}>
          <Divider orientation="left">Información general</Divider>
          <Form.Item name="org_name" label="Nombre de la organización">
            <Input placeholder="Fundación ASISTEDCOS" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="org_email" label="Correo electrónico">
                <Input type="email" placeholder="info@asistedcos.org" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="org_phone" label="Teléfono">
                <Input placeholder="0000-0000" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="org_whatsapp" label="WhatsApp (número completo)">
            <Input placeholder="50378412413" addonBefore="+503" />
          </Form.Item>
          <Form.Item name="org_address" label="Dirección">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="org_mission" label="Misión / Descripción corta">
            <Input.TextArea rows={3} placeholder="Descripción de la ONG para el sitio web..." />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={orgSaving}>
              Guardar información
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'fiscal', label: 'Datos Fiscales',
      children: (
        <Form form={fiscalForm} layout="vertical" onFinish={saveFiscal} style={{ maxWidth: 680 }}>
          <Alert type="info" showIcon style={{ marginBottom: 16 }}
            message="Estos datos se usan como emisor en todos los DTE (Facturas, CCF, Retenciones, etc.)" />
          <Divider orientation="left">Identificación tributaria</Divider>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="org_nit" label="NIT de la organización">
                <Input placeholder="0000-000000-000-0" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="org_nrc" label="NRC (IVA)">
                <Input placeholder="00000-0" />
              </Form.Item>
            </Col>
          </Row>
          <Divider orientation="left">Representante legal</Divider>
          <Row gutter={12}>
            <Col span={14}>
              <Form.Item name="org_rep_legal" label="Nombre del representante legal">
                <Input placeholder="Nombre completo" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="org_dui_rep" label="DUI del representante">
                <Input placeholder="00000000-0" />
              </Form.Item>
            </Col>
          </Row>
          <Divider orientation="left">Facturación</Divider>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="org_cod_act" label="Código de actividad económica">
                <Input placeholder="Ej. 94990" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="org_auth_res" label="Resolución de autorización (Comp. Donación)">
                <Input placeholder="N° de resolución DGII" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={fiscalSaving}>
              Guardar datos fiscales
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'usuarios', label: 'Usuarios',
      children: (
        <div>
          <div style={{ marginBottom: 14 }}>
            <Button type="primary" icon={<Plus size={14} />} onClick={() => openUser()}>
              Nuevo usuario
            </Button>
          </div>
          <Table dataSource={users} columns={userCols} rowKey="id" loading={uLoading}
            size="small" pagination={false} style={{ maxWidth: 800 }} />
        </div>
      ),
    },
    {
      key: 'sistema', label: 'Sistema',
      children: (
        <div style={{ maxWidth: 600 }}>
          <Alert type="warning" showIcon style={{ marginBottom: 16 }}
            message="Información del sistema"
            description="ASISTEDCOS Admin ERP — Software donado. Para soporte técnico contactar al desarrollador." />
          <Divider orientation="left">Información</Divider>
          <p><b>Stack:</b> Next.js 16 + Prisma + Neon PostgreSQL + Ant Design</p>
          <p><b>Base de datos:</b> Neon PostgreSQL (serverless)</p>
          <p><b>Despliegue:</b> Vercel</p>
          <p><b>Versión:</b> 1.0.0</p>
          <Divider orientation="left">Seguridad</Divider>
          <Alert type="info" showIcon
            message="Las contraseñas se almacenan con hash bcrypt. El JWT expira en 15 minutos con refresh automático." />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Configuración"
        description="Ajustes de la organización, datos fiscales y usuarios del sistema"
        icon={<Gear size={20} />}
      />
      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-default))', borderRadius: 12, padding: '12px 24px 24px' }}>
        <Tabs activeKey={tab} onChange={setTab} items={tabItems} />
      </div>

      {/* Modal usuario */}
      <Modal title={uEditing ? 'Editar usuario' : 'Nuevo usuario'}
        open={uModal} onCancel={() => setUModal(false)}
        onOk={() => uForm.submit()} okText={uEditing ? 'Guardar' : 'Crear'}
        confirmLoading={uSaving} destroyOnClose width={480}
      >
        <Form form={uForm} layout="vertical" onFinish={saveUser} style={{ marginTop: 12 }}>
          <Form.Item name="name" label="Nombre completo"
            rules={[{ required: true, message: 'Requerido' }]}>
            <Input />
          </Form.Item>
          {!uEditing && (
            <Form.Item name="email" label="Correo electrónico"
              rules={[{ required: true, type: 'email', message: 'Correo válido requerido' }]}>
              <Input type="email" />
            </Form.Item>
          )}
          {!uEditing && (
            <Form.Item name="password" label="Contraseña"
              rules={[{ required: true, min: 8, message: 'Mínimo 8 caracteres' }]}>
              <Input.Password prefix={<Lock size={13} />} />
            </Form.Item>
          )}
          {uEditing && (
            <Form.Item name="password" label="Nueva contraseña (dejar vacío para no cambiar)">
              <Input.Password prefix={<Lock size={13} />} placeholder="Nueva contraseña..." />
            </Form.Item>
          )}
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="role" label="Rol">
                <Select options={[
                  { value: 'ADMIN', label: 'ADMIN — Acceso total' },
                  { value: 'USER',  label: 'USER — Acceso limitado' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="active" label="Estado" valuePropName="checked">
                <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
