'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, Switch, Space,
  Tabs, Tag, Popconfirm, Row, Col, Alert,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Globe, PencilSimple, Trash, Eye, MagnifyingGlass } from '@phosphor-icons/react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import PageHeader from '@/components/shared/PageHeader';

type News = {
  id: string; title: string; slug: string; summary?: string;
  body: string; coverImage?: string; published: boolean;
  publishedAt?: string; createdAt: string; updatedAt: string;
};

function slugify(text: string) {
  return text.toLowerCase()
    .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e')
    .replace(/[íìï]/g, 'i').replace(/[óòö]/g, 'o')
    .replace(/[úùü]/g, 'u').replace(/ñ/g, 'n')
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

export default function GestionWebPage() {
  const [tab, setTab]     = useState('noticias');
  const [news, setNews]   = useState<News[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<News | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [form] = Form.useForm();

  const loadNews = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/gestion-web/noticias?limit=100&search=${search}`);
      const d = await r.json();
      setNews(d.data ?? []);
    } catch { toast.error('Error cargando noticias'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { if (tab === 'noticias') loadNews(); }, [tab, loadNews]);

  function openModal(record?: News) {
    setEditing(record ?? null);
    form.resetFields();
    if (record) {
      form.setFieldsValue(record);
    } else {
      form.setFieldsValue({ published: false });
    }
    setModal(true);
  }

  function onTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!editing) {
      form.setFieldValue('slug', slugify(e.target.value));
    }
  }

  async function onSave(values: Record<string, unknown>) {
    setSaving(true);
    try {
      const url    = editing ? `/api/gestion-web/noticias/${editing.id}` : '/api/gestion-web/noticias';
      const method = editing ? 'PUT' : 'POST';
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(editing ? 'Noticia actualizada' : 'Noticia creada');
      setModal(false);
      loadNews();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  }

  async function onDelete(id: string) {
    try {
      await fetch(`/api/gestion-web/noticias/${id}`, { method: 'DELETE' });
      toast.success('Noticia eliminada');
      loadNews();
    } catch { toast.error('Error al eliminar'); }
  }

  async function togglePublish(record: News) {
    try {
      await fetch(`/api/gestion-web/noticias/${record.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...record, published: !record.published }),
      });
      toast.success(record.published ? 'Noticia despublicada' : 'Noticia publicada');
      loadNews();
    } catch { toast.error('Error al cambiar estado'); }
  }

  const newsCols: ColumnsType<News> = [
    { title: 'Título', dataIndex: 'title', ellipsis: true,
      render: (v: string, r: News) => (
        <span>
          {r.published
            ? <Tag color="success" style={{ marginRight: 6 }}>Publicada</Tag>
            : <Tag style={{ marginRight: 6 }}>Borrador</Tag>}
          {v}
        </span>
      )},
    { title: 'Slug', dataIndex: 'slug', ellipsis: true, width: 200,
      render: (v: string) => <code style={{ fontSize: 11 }}>{v}</code> },
    { title: 'Publicada', dataIndex: 'publishedAt', width: 110,
      render: (v?: string) => v ? dayjs(v).format('DD/MM/YYYY') : '—' },
    { title: 'Actualizada', dataIndex: 'updatedAt', width: 110,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
    {
      title: '', width: 130, align: 'center',
      render: (_: unknown, r: News) => (
        <Space>
          <Button size="small"
            onClick={() => togglePublish(r)}
            type={r.published ? 'default' : 'primary'}
          >
            {r.published ? 'Despublican' : 'Publicar'}
          </Button>
          <Button size="small" icon={<PencilSimple size={13} />} onClick={() => openModal(r)} />
          <Popconfirm title="¿Eliminar noticia?" onConfirm={() => onDelete(r.id)} okText="Sí" cancelText="No">
            <Button size="small" danger icon={<Trash size={13} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'noticias', label: `Noticias (${news.length})`,
      children: (
        <>
          <div style={{ marginBottom: 12 }}>
            <Input placeholder="Buscar noticias..."
              prefix={<MagnifyingGlass size={14} />}
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: 280 }} />
          </div>
          <Table dataSource={news} columns={newsCols} rowKey="id" loading={loading}
            size="small" pagination={{ pageSize: 15, showSizeChanger: false }} />
        </>
      ),
    },
    {
      key: 'contenido', label: 'Textos del sitio',
      children: (
        <Alert type="info" showIcon style={{ maxWidth: 600 }}
          message="Gestión de contenido estático"
          description={
            <div>
              <p>Los textos principales del sitio (hero, misión, contacto) se pueden editar directamente en el repositorio del sitio Astro:</p>
              <code style={{ display: 'block', marginTop: 8, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
                C:\ProjectosDev\asistedcos_ong\src\data\
              </code>
              <p style={{ marginTop: 8 }}>Para cambios frecuentes como proyectos y noticias, usa las secciones de este panel.</p>
            </div>
          }
        />
      ),
    },
    {
      key: 'proyectos-web', label: 'Proyectos en el sitio',
      children: (
        <div>
          <Alert type="success" showIcon style={{ marginBottom: 16, maxWidth: 600 }}
            message="Integración automática"
            description="Los proyectos creados en el módulo de Proyectos con estado Activo aparecen automáticamente en el sitio web si la integración API está configurada. No se requiere acción adicional." />
          <Button type="primary" href="/proyectos">
            Ir a módulo de Proyectos →
          </Button>
        </div>
      ),
    },
    {
      key: 'config-web', label: 'Config. sitio',
      children: (
        <div style={{ maxWidth: 600 }}>
          <Alert type="warning" showIcon style={{ marginBottom: 16 }}
            message="URLs del sitio web"
          />
          <Form layout="vertical">
            <Form.Item label="URL del sitio público">
              <Input defaultValue="https://asistedcos.org" readOnly
                addonAfter={<a href="https://asistedcos.org" target="_blank" rel="noopener noreferrer"><Eye size={14} /></a>} />
            </Form.Item>
            <Form.Item label="Repositorio GitHub (sitio Astro)">
              <Input defaultValue="https://github.com/Developer545/asistedcos_ong" readOnly />
            </Form.Item>
            <Alert type="info" showIcon
              message="El sitio se despliega automáticamente en Vercel cuando se hace push al repositorio del sitio Astro." />
          </Form>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Gestión Web"
        description="Administra el contenido del sitio público — noticias, proyectos y textos"
        icon={<Globe size={20} />}
        actions={tab === 'noticias'
          ? [{ label: 'Nueva noticia', onClick: () => openModal() }]
          : []}
      />

      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-default))', borderRadius: 12, padding: '12px 16px 16px' }}>
        <Tabs activeKey={tab} onChange={setTab} items={tabItems} />
      </div>

      {/* ── Modal Noticia ─────────────────────────────────── */}
      <Modal title={editing ? 'Editar noticia' : 'Nueva noticia'}
        open={modal} onCancel={() => setModal(false)}
        onOk={() => form.submit()} okText={editing ? 'Guardar' : 'Crear'}
        confirmLoading={saving} destroyOnClose width={720}
      >
        <Form form={form} layout="vertical" onFinish={onSave} style={{ marginTop: 12 }}>
          <Form.Item name="title" label="Título"
            rules={[{ required: true, message: 'El título es requerido' }]}>
            <Input placeholder="Título de la noticia" onChange={onTitleChange} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={16}>
              <Form.Item name="slug" label="Slug (URL amigable)"
                rules={[{ required: true, message: 'El slug es requerido' }]}>
                <Input placeholder="titulo-de-la-noticia" addonBefore="/" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="published" label="Publicar en el sitio" valuePropName="checked">
                <Switch checkedChildren="Publicada" unCheckedChildren="Borrador" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="summary" label="Resumen (para listados y SEO)">
            <Input.TextArea rows={2} placeholder="Breve descripción de la noticia..." maxLength={300} showCount />
          </Form.Item>
          <Form.Item name="body" label="Contenido completo"
            rules={[{ required: true, message: 'El contenido es requerido' }]}>
            <Input.TextArea rows={8} placeholder="Contenido completo de la noticia..." />
          </Form.Item>
          <Form.Item name="coverImage" label="URL de imagen de portada (Cloudinary)">
            <Input placeholder="https://res.cloudinary.com/..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
