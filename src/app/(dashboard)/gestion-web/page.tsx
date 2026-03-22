'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, Switch, Space,
  Tabs, Tag, Popconfirm, Row, Col, Alert, Card, Divider,
  InputNumber, Spin,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  Globe, PencilSimple, Trash, MagnifyingGlass, Plus,
  ArrowSquareOut, Rocket, Eye,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import PageHeader from '@/components/shared/PageHeader';
import CloudinaryUpload from '@/components/shared/CloudinaryUpload';

/* ─── Types ──────────────────────────────────────────── */
type News = {
  id: string; title: string; slug: string; summary?: string;
  body: string; coverImage?: string; published: boolean;
  publishedAt?: string; createdAt: string; updatedAt: string;
};
type WebContent = { id: string; section: string; key: string; value: string; type: string };
type GalleryItem = { id: string; title?: string; url: string; category?: string; order: number; createdAt: string };
type Project = { id: string; name: string; description?: string; coverImage?: string; active: boolean; createdAt: string };

function slugify(text: string) {
  return text.toLowerCase()
    .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e')
    .replace(/[íìï]/g, 'i').replace(/[óòö]/g, 'o')
    .replace(/[úùü]/g, 'u').replace(/ñ/g, 'n')
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

export default function GestionWebPage() {
  const [tab, setTab] = useState('noticias');

  /* ── Noticias state ─────────────────────────────────── */
  const [news, setNews] = useState<News[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsModal, setNewsModal] = useState(false);
  const [newsEditing, setNewsEditing] = useState<News | null>(null);
  const [newsSaving, setNewsSaving] = useState(false);
  const [newsSearch, setNewsSearch] = useState('');
  const [newsForm] = Form.useForm();

  /* ── WebContent state ───────────────────────────────── */
  const [content, setContent] = useState<WebContent[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentSaving, setContentSaving] = useState(false);
  const [contentForm] = Form.useForm();

  /* ── Galería state ──────────────────────────────────── */
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryModal, setGalleryModal] = useState(false);
  const [galleryEditing, setGalleryEditing] = useState<GalleryItem | null>(null);
  const [gallerySaving, setGallerySaving] = useState(false);
  const [galleryForm] = Form.useForm();

  /* ── Proyectos state ────────────────────────────────── */
  const [projects, setProjects] = useState<Project[]>([]);
  const [projLoading, setProjLoading] = useState(false);

  /* ── Deploy state ───────────────────────────────────── */
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<string | null>(null);

  /* ── Loaders ─────────────────────────────────────────── */
  const loadNews = useCallback(async () => {
    setNewsLoading(true);
    try {
      const r = await fetch(`/api/gestion-web/noticias?limit=100&search=${newsSearch}`);
      const d = await r.json();
      setNews(d.data ?? []);
    } catch { toast.error('Error cargando noticias'); }
    finally { setNewsLoading(false); }
  }, [newsSearch]);

  const loadContent = useCallback(async () => {
    setContentLoading(true);
    try {
      const r = await fetch('/api/gestion-web/contenido');
      const d = await r.json();
      const blocks: WebContent[] = d.data ?? [];
      setContent(blocks);
      // Populate form
      const vals: Record<string, string> = {};
      blocks.forEach(b => { vals[`${b.section}__${b.key}`] = b.value; });
      contentForm.setFieldsValue(vals);
    } catch { toast.error('Error cargando contenido'); }
    finally { setContentLoading(false); }
  }, [contentForm]);

  const loadGallery = useCallback(async () => {
    setGalleryLoading(true);
    try {
      const r = await fetch('/api/gestion-web/galeria?limit=100');
      const d = await r.json();
      setGallery(d.data ?? []);
    } catch { toast.error('Error cargando galería'); }
    finally { setGalleryLoading(false); }
  }, []);

  const loadProjects = useCallback(async () => {
    setProjLoading(true);
    try {
      const r = await fetch('/api/proyectos?limit=50');
      const d = await r.json();
      setProjects(d.data ?? []);
    } catch { toast.error('Error cargando proyectos'); }
    finally { setProjLoading(false); }
  }, []);

  useEffect(() => { if (tab === 'noticias') loadNews(); }, [tab, loadNews]);
  useEffect(() => { if (tab === 'contenido') loadContent(); }, [tab, loadContent]);
  useEffect(() => { if (tab === 'galeria') loadGallery(); }, [tab, loadGallery]);
  useEffect(() => { if (tab === 'proyectos-web') loadProjects(); }, [tab, loadProjects]);

  /* ── Noticias CRUD ───────────────────────────────────── */
  function openNewsModal(record?: News) {
    setNewsEditing(record ?? null);
    newsForm.resetFields();
    if (record) newsForm.setFieldsValue(record);
    else newsForm.setFieldsValue({ published: false });
    setNewsModal(true);
  }

  function onTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!newsEditing) newsForm.setFieldValue('slug', slugify(e.target.value));
  }

  async function saveNews(values: Record<string, unknown>) {
    setNewsSaving(true);
    try {
      const url    = newsEditing ? `/api/gestion-web/noticias/${newsEditing.id}` : '/api/gestion-web/noticias';
      const method = newsEditing ? 'PUT' : 'POST';
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(newsEditing ? 'Noticia actualizada' : 'Noticia creada');
      setNewsModal(false);
      loadNews();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setNewsSaving(false); }
  }

  async function deleteNews(id: string) {
    try {
      await fetch(`/api/gestion-web/noticias/${id}`, { method: 'DELETE' });
      toast.success('Noticia eliminada');
      loadNews();
    } catch { toast.error('Error al eliminar'); }
  }

  async function toggleNewsPublish(record: News) {
    try {
      await fetch(`/api/gestion-web/noticias/${record.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...record, published: !record.published }),
      });
      toast.success(record.published ? 'Despublicada' : 'Publicada en el sitio');
      loadNews();
    } catch { toast.error('Error'); }
  }

  /* ── WebContent save ─────────────────────────────────── */
  async function saveContent(values: Record<string, string>) {
    setContentSaving(true);
    try {
      const entries = Object.entries(values);
      await Promise.all(entries.map(([fieldKey, value]) => {
        const [section, key] = fieldKey.split('__');
        return fetch('/api/gestion-web/contenido', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section, key, value }),
        });
      }));
      toast.success('Contenido del sitio actualizado');
    } catch { toast.error('Error guardando contenido'); }
    finally { setContentSaving(false); }
  }

  /* ── Galería CRUD ────────────────────────────────────── */
  function openGalleryModal(record?: GalleryItem) {
    setGalleryEditing(record ?? null);
    galleryForm.resetFields();
    if (record) galleryForm.setFieldsValue(record);
    else galleryForm.setFieldsValue({ order: 0 });
    setGalleryModal(true);
  }

  async function saveGallery(values: Record<string, unknown>) {
    setGallerySaving(true);
    try {
      const url    = galleryEditing ? `/api/gestion-web/galeria/${galleryEditing.id}` : '/api/gestion-web/galeria';
      const method = galleryEditing ? 'PUT' : 'POST';
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(galleryEditing ? 'Imagen actualizada' : 'Imagen agregada');
      setGalleryModal(false);
      loadGallery();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setGallerySaving(false); }
  }

  async function deleteGallery(id: string) {
    try {
      await fetch(`/api/gestion-web/galeria/${id}`, { method: 'DELETE' });
      toast.success('Imagen eliminada');
      loadGallery();
    } catch { toast.error('Error al eliminar'); }
  }

  /* ── Deploy ──────────────────────────────────────────── */
  async function triggerDeploy() {
    setDeploying(true);
    setDeployResult(null);
    try {
      const res = await fetch('/api/gestion-web/deploy', { method: 'POST' });
      const d   = await res.json();
      if (!res.ok) throw new Error(d.error);
      setDeployResult('success');
      toast.success('Redespliegue iniciado — el sitio se actualizará en ~2 minutos');
    } catch (e: unknown) {
      setDeployResult('error');
      toast.error(e instanceof Error ? e.message : 'Error al desplegar');
    }
    finally { setDeploying(false); }
  }

  /* ── Column definitions ──────────────────────────────── */
  const newsCols: ColumnsType<News> = [
    { title: 'Título', dataIndex: 'title', ellipsis: true,
      render: (v: string, r: News) => (
        <span>
          {r.published ? <Tag color="success" style={{ marginRight: 6 }}>Publicada</Tag>
                       : <Tag style={{ marginRight: 6 }}>Borrador</Tag>}
          {v}
        </span>
      )},
    { title: 'Slug', dataIndex: 'slug', ellipsis: true, width: 180,
      render: (v: string) => <code style={{ fontSize: 11 }}>{v}</code> },
    { title: 'Publicada', dataIndex: 'publishedAt', width: 110,
      render: (v?: string) => v ? dayjs(v).format('DD/MM/YYYY') : '—' },
    { title: '', width: 150, align: 'center',
      render: (_: unknown, r: News) => (
        <Space>
          <Button size="small"
            type={r.published ? 'default' : 'primary'}
            onClick={() => toggleNewsPublish(r)}>
            {r.published ? 'Despublicar' : 'Publicar'}
          </Button>
          <Button size="small" icon={<PencilSimple size={13} />} onClick={() => openNewsModal(r)} />
          <Popconfirm title="¿Eliminar noticia?" onConfirm={() => deleteNews(r.id)} okText="Sí" cancelText="No">
            <Button size="small" danger icon={<Trash size={13} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const galleryCols: ColumnsType<GalleryItem> = [
    { title: 'Vista previa', dataIndex: 'url', width: 80,
      render: (v: string) => (
        <img src={v} alt="" style={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 4 }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      )},
    { title: 'Título', dataIndex: 'title', ellipsis: true, render: (v?: string) => v || '—' },
    { title: 'Categoría', dataIndex: 'category', width: 120, render: (v?: string) => v ? <Tag>{v}</Tag> : '—' },
    { title: 'Orden', dataIndex: 'order', width: 70, align: 'center' },
    { title: '', width: 100, align: 'center',
      render: (_: unknown, r: GalleryItem) => (
        <Space>
          <Button size="small" icon={<Eye size={13} />} onClick={() => window.open(r.url, '_blank')} />
          <Button size="small" icon={<PencilSimple size={13} />} onClick={() => openGalleryModal(r)} />
          <Popconfirm title="¿Eliminar imagen?" onConfirm={() => deleteGallery(r.id)} okText="Sí" cancelText="No">
            <Button size="small" danger icon={<Trash size={13} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const projectCols: ColumnsType<Project> = [
    { title: 'Proyecto', dataIndex: 'name', ellipsis: true },
    { title: 'Estado', dataIndex: 'active', width: 120,
      render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? 'Activo (en sitio)' : 'Inactivo'}</Tag> },
    { title: 'Creado', dataIndex: 'createdAt', width: 110,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
    { title: '', width: 100, align: 'center',
      render: () => (
        <Button size="small" href="/proyectos" icon={<ArrowSquareOut size={13} />}>
          Editar
        </Button>
      ),
    },
  ];

  /* ── Tab items ───────────────────────────────────────── */
  const tabItems = [
    {
      key: 'noticias', label: `Noticias (${news.length})`,
      children: (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <Input placeholder="Buscar noticias..."
              prefix={<MagnifyingGlass size={14} />}
              value={newsSearch} onChange={e => setNewsSearch(e.target.value)}
              style={{ width: 260 }} />
            <Button type="primary" icon={<Plus size={14} />} onClick={() => openNewsModal()}>
              Nueva noticia
            </Button>
          </div>
          <Table dataSource={news} columns={newsCols} rowKey="id" loading={newsLoading}
            size="small" pagination={{ pageSize: 15 }} />
        </>
      ),
    },
    {
      key: 'contenido', label: 'Contenido del sitio',
      children: contentLoading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
      ) : (
        <Form form={contentForm} layout="vertical" onFinish={saveContent} style={{ maxWidth: 700 }}>
          <Alert type="info" showIcon style={{ marginBottom: 16 }}
            message="Edita los textos e indicadores que aparecen en el sitio web público. Los cambios se aplican al presionar 'Publicar sitio'." />

          <Divider>Estadísticas de impacto (inicio)</Divider>
          <Row gutter={12}>
            <Col span={6}><Form.Item name="stats__anos" label="Valor: Años"><Input placeholder="+27" /></Form.Item></Col>
            <Col span={6}><Form.Item name="stats__label_anos" label="Etiqueta"><Input placeholder="años de trabajo" /></Form.Item></Col>
            <Col span={6}><Form.Item name="stats__comunidades" label="Valor: Comunidades"><Input placeholder="+50" /></Form.Item></Col>
            <Col span={6}><Form.Item name="stats__label_comunidades" label="Etiqueta"><Input placeholder="comunidades atendidas" /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={6}><Form.Item name="stats__arboles" label="Valor: Árboles"><Input placeholder="+10K" /></Form.Item></Col>
            <Col span={6}><Form.Item name="stats__label_arboles" label="Etiqueta"><Input placeholder="árboles plantados" /></Form.Item></Col>
            <Col span={6}><Form.Item name="stats__donaciones" label="Valor: Donaciones"><Input placeholder="100%" /></Form.Item></Col>
            <Col span={6}><Form.Item name="stats__label_donaciones" label="Etiqueta"><Input placeholder="sin fines de lucro" /></Form.Item></Col>
          </Row>

          <Divider>Textos del hero (inicio)</Divider>
          <Form.Item name="hero__subtitulo" label="Badge / Subtítulo superior">
            <Input placeholder="Desde 1997 · El Salvador" />
          </Form.Item>
          <Form.Item name="hero__titulo" label="Título principal">
            <Input placeholder="Recuperando ecosistemas para la vida" />
          </Form.Item>
          <Form.Item name="hero__descripcion" label="Descripción">
            <Input.TextArea rows={3} placeholder="Trabajamos con comunidades..." />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={contentSaving}>
              Guardar contenido
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'galeria', label: 'Galería de fotos',
      children: (
        <>
          <div style={{ marginBottom: 12 }}>
            <Button type="primary" icon={<Plus size={14} />} onClick={() => openGalleryModal()}>
              Agregar foto
            </Button>
          </div>
          <Alert type="info" showIcon style={{ marginBottom: 12, maxWidth: 700 }}
            message="Las fotos de la galería se muestran en la sección 'El campo, nuestra oficina' del sitio web. Usa URLs de Cloudinary o imágenes externas." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, marginBottom: 16, maxWidth: 800 }}>
            {gallery.map(item => (
              <div key={item.id} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', background: '#f0f0f0' }}>
                <img src={item.url} alt={item.title || ''} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover' }}
                  onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23ddd" width="100" height="100"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999">IMG</text></svg>'; }} />
                <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 2 }}>
                  <Button size="small" icon={<PencilSimple size={10} />} onClick={() => openGalleryModal(item)} style={{ padding: '0 4px' }} />
                  <Popconfirm title="¿Eliminar?" onConfirm={() => deleteGallery(item.id)} okText="Sí" cancelText="No">
                    <Button size="small" danger icon={<Trash size={10} />} style={{ padding: '0 4px' }} />
                  </Popconfirm>
                </div>
                {item.title && <div style={{ fontSize: 10, padding: '2px 4px', background: 'rgba(0,0,0,0.5)', color: '#fff', position: 'absolute', bottom: 0, width: '100%', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{item.title}</div>}
              </div>
            ))}
          </div>
          {gallery.length === 0 && !galleryLoading && (
            <Alert type="info" message="No hay fotos en la galería. Agrega la primera con el botón de arriba." />
          )}
        </>
      ),
    },
    {
      key: 'proyectos-web', label: 'Proyectos en el sitio',
      children: (
        <>
          <Alert type="success" showIcon style={{ marginBottom: 16, maxWidth: 700 }}
            message="Integración automática"
            description="Los proyectos marcados como Activos en el módulo de Proyectos aparecen automáticamente en el sitio web. Para cambiar cuáles aparecen, activa/desactiva desde el módulo de Proyectos." />
          <Table dataSource={projects} columns={projectCols} rowKey="id" loading={projLoading}
            size="small" pagination={false} style={{ maxWidth: 700 }} />
          <div style={{ marginTop: 12 }}>
            <Button icon={<ArrowSquareOut size={14} />} href="/proyectos">
              Ir al módulo de Proyectos
            </Button>
          </div>
        </>
      ),
    },
    {
      key: 'publicar', label: 'Publicar sitio',
      children: (
        <div style={{ maxWidth: 600 }}>
          <Alert type="info" showIcon style={{ marginBottom: 16 }}
            message="¿Cómo funciona?"
            description="Cada vez que guardes noticias, edites contenido o cambies proyectos, debes presionar 'Publicar sitio' para que los cambios aparezcan en el sitio web público. Esto tarda aproximadamente 1-2 minutos." />

          <Card size="small" style={{ borderRadius: 12, marginBottom: 16 }}>
            <Row gutter={16} align="middle">
              <Col flex="1">
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Sitio web público</div>
                <a href="https://asistedcos.org" target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 13, color: 'hsl(var(--brand-primary))' }}>
                  https://asistedcos.org ↗
                </a>
              </Col>
              <Col>
                <Button type="primary" size="large" icon={<Rocket size={16} />}
                  loading={deploying} onClick={triggerDeploy}
                  style={{ height: 44, paddingInline: 24 }}>
                  Publicar sitio ahora
                </Button>
              </Col>
            </Row>
            {deployResult === 'success' && (
              <Alert type="success" showIcon style={{ marginTop: 12 }}
                message="Redespliegue iniciado. El sitio se actualizará en 1-2 minutos." />
            )}
            {deployResult === 'error' && (
              <Alert type="warning" showIcon style={{ marginTop: 12 }}
                message="No se pudo iniciar el redespliegue. Verifica que VERCEL_DEPLOY_HOOK_ONG esté configurado en las variables de entorno del servidor." />
            )}
          </Card>

          <Divider>Configuración de Vercel</Divider>
          <Alert type="warning" showIcon style={{ marginBottom: 12 }}
            message="Para habilitar el botón 'Publicar sitio', agrega la variable de entorno:"
            description={
              <div>
                <code style={{ display: 'block', marginTop: 8, padding: 8, background: '#fff8e6', borderRadius: 4 }}>
                  VERCEL_DEPLOY_HOOK_ONG=https://api.vercel.com/v1/integrations/deploy/...
                </code>
                <p style={{ marginTop: 8, fontSize: 12 }}>
                  Genera el hook desde: Vercel Dashboard → asistedcos_ong → Settings → Git → Deploy Hooks
                </p>
              </div>
            } />
          <Form layout="vertical" style={{ marginTop: 8 }}>
            <Form.Item label="URL del sitio público">
              <Input defaultValue="https://asistedcos.org" readOnly
                addonAfter={
                  <a href="https://asistedcos.org" target="_blank" rel="noopener noreferrer">
                    <ArrowSquareOut size={14} />
                  </a>
                } />
            </Form.Item>
          </Form>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Gestión Web"
        description="Administra el contenido del sitio público — noticias, estadísticas, galería y proyectos"
        icon={<Globe size={20} />}
        actions={tab === 'noticias' ? [{ label: 'Nueva noticia', onClick: () => openNewsModal() }] : []}
      />

      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border-default))', borderRadius: 12, padding: '12px 16px 16px' }}>
        <Tabs activeKey={tab} onChange={setTab} items={tabItems} />
      </div>

      {/* ── Modal Noticia ─────────────────────────────────── */}
      <Modal title={newsEditing ? 'Editar noticia' : 'Nueva noticia'}
        open={newsModal} onCancel={() => setNewsModal(false)}
        onOk={() => newsForm.submit()} okText={newsEditing ? 'Guardar' : 'Crear'}
        confirmLoading={newsSaving} destroyOnClose width={740}
      >
        <Form form={newsForm} layout="vertical" onFinish={saveNews} style={{ marginTop: 12 }}>
          <Form.Item name="title" label="Título" rules={[{ required: true }]}>
            <Input placeholder="Título de la noticia" onChange={onTitleChange} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={16}>
              <Form.Item name="slug" label="Slug (URL)" rules={[{ required: true }]}>
                <Input placeholder="titulo-noticia" addonBefore="noticias/" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="published" label="Publicar en el sitio" valuePropName="checked">
                <Switch checkedChildren="Publicada" unCheckedChildren="Borrador" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="summary" label="Resumen (para listados y SEO)">
            <Input.TextArea rows={2} maxLength={300} showCount />
          </Form.Item>
          <Form.Item name="body" label="Contenido completo" rules={[{ required: true }]}>
            <Input.TextArea rows={10} placeholder="Contenido completo de la noticia..." />
          </Form.Item>
          <Form.Item name="coverImage" label="Imagen de portada">
            <CloudinaryUpload
              folder="asistedcos/noticias"
              label="Subir imagen de portada"
              aspectHint="Proporción 16:9 o 3:2 recomendada"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal Galería ─────────────────────────────────── */}
      <Modal title={galleryEditing ? 'Editar foto' : 'Agregar foto'}
        open={galleryModal} onCancel={() => setGalleryModal(false)}
        onOk={() => galleryForm.submit()} okText={galleryEditing ? 'Guardar' : 'Agregar'}
        confirmLoading={gallerySaving} destroyOnClose width={480}
      >
        <Form form={galleryForm} layout="vertical" onFinish={saveGallery} style={{ marginTop: 12 }}>
          <Form.Item name="url" label="Foto" rules={[{ required: true, message: 'La imagen es requerida' }]}>
            <CloudinaryUpload
              folder="asistedcos/galeria"
              label="Subir foto para la galería"
              aspectHint="Proporción 1:1 o 4:3 recomendada"
            />
          </Form.Item>
          <Form.Item name="title" label="Título / Descripción (alt text)">
            <Input placeholder="Voluntarios plantando en La Libertad" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={14}>
              <Form.Item name="category" label="Categoría">
                <Input placeholder="Reforestación, Galería, Evento..." />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="order" label="Orden de aparición">
                <InputNumber min={0} max={999} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
