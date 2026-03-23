'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, Switch, Space,
  Tabs, Tag, Popconfirm, Row, Col, Alert, Card, Divider,
  InputNumber, Spin, Progress, Select, Image, Tooltip, Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  Globe, PencilSimple, Trash, MagnifyingGlass, Plus, Eye,
  Copy, ArrowClockwise, CloudArrowUp, Image as ImageIcon,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import PageHeader from '@/components/shared/PageHeader';
import CloudinaryUpload from '@/components/shared/CloudinaryUpload';

/* ─── GalleryGrid — simple photo wall ───────────────── */
function GalleryGrid({
  gallery,
  loading,
  onUpload,
  onDelete,
}: {
  gallery: { id: string; url: string; title?: string }[];
  loading: boolean;
  onUpload: (url: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [uploadUrl, setUploadUrl] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSelect(url: string) {
    if (!url) return;
    setSaving(true);
    await onUpload(url);
    setUploadUrl('');
    setSaving(false);
  }

  return (
    <Spin spinning={loading}>
      <div style={{ marginBottom: 12, color: 'hsl(var(--text-muted))', fontSize: 13 }}>
        {gallery.length} foto{gallery.length !== 1 ? 's' : ''} en la galería del sitio web.
        Haz clic en <strong>+</strong> para agregar, o en <Trash size={12} style={{ display: 'inline' }} /> para eliminar.
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
        gap: 12,
      }}>
        {/* ── Add card ── */}
        <div style={{
          borderRadius: 10,
          border: '2px dashed hsl(var(--border-default))',
          minHeight: 160,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 12,
          background: 'hsl(var(--bg-muted))',
        }}>
          <CloudinaryUpload
            value={uploadUrl}
            onChange={handleSelect}
            folder="asistedcos/galeria"
            label={saving ? 'Guardando...' : 'Agregar foto'}
          />
        </div>

        {/* ── Photo cards ── */}
        {gallery.map(item => (
          <div
            key={item.id}
            style={{
              borderRadius: 10,
              overflow: 'hidden',
              border: '1px solid hsl(var(--border-default))',
              position: 'relative',
              background: '#000',
              minHeight: 160,
            }}
            className="gallery-card"
          >
            <Image
              src={item.url}
              alt={item.title ?? 'Foto galería'}
              style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block', opacity: 0.92 }}
              preview={{ mask: <Eye size={18} /> }}
            />
            <Tooltip title="Eliminar foto">
              <Button
                size="small"
                danger
                icon={<Trash size={12} />}
                onClick={() => onDelete(item.id)}
                style={{ position: 'absolute', top: 6, right: 6, opacity: 0.85 }}
              />
            </Tooltip>
          </div>
        ))}
      </div>
    </Spin>
  );
}

/* ─── Types ──────────────────────────────────────────── */
type News = {
  id: string; title: string; slug: string; summary?: string;
  body: string; categoria?: string; coverImage?: string; published: boolean;
  publishedAt?: string; createdAt: string; updatedAt: string;
};
type WebContent = { id: string; section: string; key: string; value: string; type: string };
type GalleryItem = { id: string; title?: string; url: string; category?: string; order: number; createdAt: string };
type Cause = {
  id: string; titulo: string; descripcion?: string; tag?: string;
  coverImage?: string; meta: number; recaudado: number; active: boolean; order: number;
};
type FaqItem = { id: string; question: string; answer: string; order: number; active: boolean };
type Partner = { id: string; name: string; logo?: string; url?: string; active: boolean; order: number };

function slugify(text: string) {
  return text.toLowerCase()
    .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e')
    .replace(/[íìï]/g, 'i').replace(/[óòö]/g, 'o')
    .replace(/[úùü]/g, 'u').replace(/ñ/g, 'n')
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

export default function GestionWebPage() {
  const [tab, setTab] = useState('noticias');

  /* ── Noticias ─────────────────────────────────── */
  const [news, setNews] = useState<News[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsModal, setNewsModal] = useState(false);
  const [newsEditing, setNewsEditing] = useState<News | null>(null);
  const [newsSaving, setNewsSaving] = useState(false);
  const [newsSearch, setNewsSearch] = useState('');
  const [newsForm] = Form.useForm();

  /* ── WebContent ─────────────────────────────────── */
  const [content, setContent] = useState<WebContent[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentSaving, setContentSaving] = useState(false);
  const [contentForm] = Form.useForm();

  /* ── Galería ─────────────────────────────────── */
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryModal, setGalleryModal] = useState(false);
  const [galleryEditing, setGalleryEditing] = useState<GalleryItem | null>(null);
  const [gallerySaving, setGallerySaving] = useState(false);
  const [galleryForm] = Form.useForm();

  /* ── Causas ─────────────────────────────────── */
  const [causes, setCauses] = useState<Cause[]>([]);
  const [causesLoading, setCausesLoading] = useState(false);
  const [causesModal, setCausesModal] = useState(false);
  const [causeEditing, setCauseEditing] = useState<Cause | null>(null);
  const [causesSaving, setCausesSaving] = useState(false);
  const [causesForm] = Form.useForm();

  /* ── FAQ ─────────────────────────────────── */
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [faqLoading, setFaqLoading] = useState(false);
  const [faqModal, setFaqModal] = useState(false);
  const [faqEditing, setFaqEditing] = useState<FaqItem | null>(null);
  const [faqSaving, setFaqSaving] = useState(false);
  const [faqForm] = Form.useForm();

  /* ── Aliados ─────────────────────────────────── */
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(false);
  const [partnersModal, setPartnersModal] = useState(false);
  const [partnerEditing, setPartnerEditing] = useState<Partner | null>(null);
  const [partnersSaving, setPartnersSaving] = useState(false);
  const [partnersForm] = Form.useForm();

  /* ── Deploy ─────────────────────────────────── */
  const [deploying, setDeploying] = useState(false);

  /* ── Biblioteca ─────────────────────────────────── */
  const [biblioteca, setBiblioteca] = useState<{ publicId: string; url: string; fullUrl: string; bytes: number; folder: string; createdAt: string }[]>([]);
  const [bibLoading, setBibLoading] = useState(false);
  const [bibFolder, setBibFolder] = useState('');
  const [bibSearch, setBibSearch] = useState('');

  /* ── Loaders ─────────────────────────────────── */
  const loadNews = useCallback(async () => {
    setNewsLoading(true);
    try {
      const r = await fetch('/api/gestion-web/noticias?limit=100');
      const d = await r.json();
      setNews(d.data ?? []);
    } catch { toast.error('Error cargando noticias'); }
    finally { setNewsLoading(false); }
  }, []);

  const loadContent = useCallback(async () => {
    setContentLoading(true);
    try {
      const r = await fetch('/api/gestion-web/contenido');
      const d = await r.json();
      setContent(d.data ?? []);
      const vals: Record<string, string> = {};
      (d.data ?? []).forEach((c: WebContent) => { vals[`${c.section}__${c.key}`] = c.value; });
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

  const loadCauses = useCallback(async () => {
    setCausesLoading(true);
    try {
      const r = await fetch('/api/gestion-web/causas?limit=100');
      const d = await r.json();
      setCauses(d.data ?? []);
    } catch { toast.error('Error cargando causas'); }
    finally { setCausesLoading(false); }
  }, []);

  const loadFaq = useCallback(async () => {
    setFaqLoading(true);
    try {
      const r = await fetch('/api/gestion-web/faq?limit=100');
      const d = await r.json();
      setFaqs(d.data ?? []);
    } catch { toast.error('Error cargando FAQ'); }
    finally { setFaqLoading(false); }
  }, []);

  const loadPartners = useCallback(async () => {
    setPartnersLoading(true);
    try {
      const r = await fetch('/api/gestion-web/aliados?limit=100');
      const d = await r.json();
      setPartners(d.data ?? []);
    } catch { toast.error('Error cargando aliados'); }
    finally { setPartnersLoading(false); }
  }, []);

  const loadBiblioteca = useCallback(async () => {
    setBibLoading(true);
    try {
      const r = await fetch(`/api/cloudinary/media${bibFolder ? `?folder=${bibFolder}` : ''}`);
      const d = await r.json();
      setBiblioteca(d.data ?? []);
    } catch { toast.error('Error cargando imágenes'); }
    finally { setBibLoading(false); }
  }, [bibFolder]);

  useEffect(() => { if (tab === 'noticias') loadNews(); }, [tab, loadNews]);
  useEffect(() => { if (tab === 'contenido') loadContent(); }, [tab, loadContent]);
  useEffect(() => { if (tab === 'galeria') loadGallery(); }, [tab, loadGallery]);
  useEffect(() => { if (tab === 'causas') loadCauses(); }, [tab, loadCauses]);
  useEffect(() => { if (tab === 'faq') loadFaq(); }, [tab, loadFaq]);
  useEffect(() => { if (tab === 'aliados') loadPartners(); }, [tab, loadPartners]);
  useEffect(() => { if (tab === 'biblioteca') loadBiblioteca(); }, [tab, bibFolder, loadBiblioteca]);

  /* ── News CRUD ─────────────────────────────────── */
  function openNewsModal(item?: News) {
    setNewsEditing(item ?? null);
    newsForm.resetFields();
    if (item) newsForm.setFieldsValue({ ...item });
    setNewsModal(true);
  }

  async function saveNews(vals: Record<string, unknown>) {
    setNewsSaving(true);
    try {
      const url = newsEditing ? `/api/gestion-web/noticias/${newsEditing.id}` : '/api/gestion-web/noticias';
      const method = newsEditing ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(vals) });
      if (!r.ok) throw new Error((await r.json()).error ?? 'Error');
      toast.success(newsEditing ? 'Noticia actualizada' : 'Noticia creada');
      setNewsModal(false);
      loadNews();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setNewsSaving(false); }
  }

  async function deleteNews(id: string) {
    try {
      await fetch(`/api/gestion-web/noticias/${id}`, { method: 'DELETE' });
      toast.success('Noticia eliminada');
      loadNews();
    } catch { toast.error('Error eliminando'); }
  }

  /* ── Content CRUD ─────────────────────────────────── */
  async function saveContent(vals: Record<string, string>) {
    setContentSaving(true);
    try {
      const IMAGE_KEYS = ['hero__imagen', 'about__imagen'];
      const entries = Object.entries(vals)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => {
          const [section, ...rest] = key.split('__');
          const fieldKey = rest.join('__');
          const type = IMAGE_KEYS.includes(key) ? 'image' : 'text';
          return { section, key: fieldKey, value: value ?? '', type };
        });
      const r = await fetch('/api/gestion-web/contenido', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      });
      if (!r.ok) throw new Error('Error guardando');
      toast.success('Contenido guardado correctamente');
    } catch { toast.error('Error guardando contenido'); }
    finally { setContentSaving(false); }
  }

  /* ── Gallery CRUD ─────────────────────────────────── */
  function openGalleryModal(item?: GalleryItem) {
    setGalleryEditing(item ?? null);
    galleryForm.resetFields();
    if (item) galleryForm.setFieldsValue(item);
    setGalleryModal(true);
  }

  async function saveGallery(vals: Record<string, unknown>) {
    setGallerySaving(true);
    try {
      const url    = galleryEditing ? `/api/gestion-web/galeria/${galleryEditing.id}` : '/api/gestion-web/galeria';
      const method = galleryEditing ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(vals) });
      if (!r.ok) throw new Error('Error');
      toast.success(galleryEditing ? 'Foto actualizada' : 'Foto agregada');
      setGalleryModal(false);
      loadGallery();
    } catch { toast.error('Error guardando'); }
    finally { setGallerySaving(false); }
  }

  async function deleteGallery(id: string) {
    try {
      await fetch(`/api/gestion-web/galeria/${id}`, { method: 'DELETE' });
      toast.success('Foto eliminada');
      loadGallery();
    } catch { toast.error('Error eliminando'); }
  }

  /* ── Causes CRUD ─────────────────────────────────── */
  function openCausesModal(item?: Cause) {
    setCauseEditing(item ?? null);
    causesForm.resetFields();
    if (item) causesForm.setFieldsValue({ ...item, meta: Number(item.meta), recaudado: Number(item.recaudado) });
    setCausesModal(true);
  }

  async function saveCause(vals: Record<string, unknown>) {
    setCausesSaving(true);
    try {
      const url = causeEditing ? `/api/gestion-web/causas/${causeEditing.id}` : '/api/gestion-web/causas';
      const method = causeEditing ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(vals) });
      if (!r.ok) throw new Error((await r.json()).error ?? 'Error');
      toast.success(causeEditing ? 'Causa actualizada' : 'Causa creada');
      setCausesModal(false);
      loadCauses();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setCausesSaving(false); }
  }

  async function deleteCause(id: string) {
    try {
      await fetch(`/api/gestion-web/causas/${id}`, { method: 'DELETE' });
      toast.success('Causa eliminada');
      loadCauses();
    } catch { toast.error('Error eliminando'); }
  }

  /* ── FAQ CRUD ─────────────────────────────────── */
  function openFaqModal(item?: FaqItem) {
    setFaqEditing(item ?? null);
    faqForm.resetFields();
    if (item) faqForm.setFieldsValue(item);
    setFaqModal(true);
  }

  async function saveFaq(vals: Record<string, unknown>) {
    setFaqSaving(true);
    try {
      const url = faqEditing ? `/api/gestion-web/faq/${faqEditing.id}` : '/api/gestion-web/faq';
      const method = faqEditing ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(vals) });
      if (!r.ok) throw new Error('Error');
      toast.success(faqEditing ? 'Pregunta actualizada' : 'Pregunta creada');
      setFaqModal(false);
      loadFaq();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setFaqSaving(false); }
  }

  async function deleteFaq(id: string) {
    try {
      await fetch(`/api/gestion-web/faq/${id}`, { method: 'DELETE' });
      toast.success('Pregunta eliminada');
      loadFaq();
    } catch { toast.error('Error eliminando'); }
  }

  /* ── Partners CRUD ─────────────────────────────────── */
  function openPartnersModal(item?: Partner) {
    setPartnerEditing(item ?? null);
    partnersForm.resetFields();
    if (item) partnersForm.setFieldsValue(item);
    setPartnersModal(true);
  }

  async function savePartner(vals: Record<string, unknown>) {
    setPartnersSaving(true);
    try {
      const url = partnerEditing ? `/api/gestion-web/aliados/${partnerEditing.id}` : '/api/gestion-web/aliados';
      const method = partnerEditing ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(vals) });
      if (!r.ok) throw new Error('Error');
      toast.success(partnerEditing ? 'Aliado actualizado' : 'Aliado creado');
      setPartnersModal(false);
      loadPartners();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setPartnersSaving(false); }
  }

  async function deletePartner(id: string) {
    try {
      await fetch(`/api/gestion-web/aliados/${id}`, { method: 'DELETE' });
      toast.success('Aliado eliminado');
      loadPartners();
    } catch { toast.error('Error eliminando'); }
  }

  /* ── Deploy ─────────────────────────────────── */
  async function triggerDeploy() {
    setDeploying(true);
    try {
      const r = await fetch('/api/gestion-web/deploy', { method: 'POST' });
      if (!r.ok) throw new Error('Error disparando deploy');
      toast.success('¡Deploy iniciado! El sitio se actualizará en 1-2 minutos.');
    } catch { toast.error('Error al publicar. Configura el webhook de Vercel.'); }
    finally { setDeploying(false); }
  }

  /* ── Table columns ─────────────────────────────────── */
  const newsCols: ColumnsType<News> = [
    {
      title: '', key: 'img', width: 56, render: (_, r) => r.coverImage
        ? <img src={r.coverImage} alt="" style={{ width: 44, height: 32, objectFit: 'cover', borderRadius: 4 }} />
        : <div style={{ width: 44, height: 32, borderRadius: 4, background: 'hsl(var(--bg-muted))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 16 }}>📄</span></div>
    },
    { title: 'Título', dataIndex: 'title', key: 'title', ellipsis: true },
    { title: 'Categoría', dataIndex: 'categoria', key: 'categoria', width: 110, render: v => v ? <Tag color="blue">{v}</Tag> : <span style={{ color: '#ccc' }}>—</span> },
    { title: 'Estado', key: 'published', render: (_, r) => r.published ? <Tag color="success">Publicado</Tag> : <Tag>Borrador</Tag>, width: 110 },
    { title: 'Fecha', dataIndex: 'publishedAt', key: 'publishedAt', render: v => v ? dayjs(v).format('DD/MM/YYYY') : '—', width: 110 },
    {
      title: '', key: 'actions', width: 110, render: (_, r) => (
        <Space>
          <Button size="small" icon={<PencilSimple size={13} />} onClick={() => openNewsModal(r)} />
          <Button size="small" icon={<Eye size={13} />} href={`https://asistedcosong.vercel.app/noticias/${r.slug}`} target="_blank" title="Ver en el sitio" />
          <Popconfirm title="¿Eliminar noticia?" onConfirm={() => deleteNews(r.id)} okText="Sí" cancelText="No">
            <Button size="small" danger icon={<Trash size={13} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const causesCols: ColumnsType<Cause> = [
    { title: 'Título', dataIndex: 'titulo', key: 'titulo', ellipsis: true },
    { title: 'Tag', dataIndex: 'tag', key: 'tag', render: v => v ? <Tag color="green">{v}</Tag> : '-', width: 110 },
    {
      title: 'Progreso', key: 'pct', width: 160, render: (_, r) => {
        const meta = Number(r.meta); const rec = Number(r.recaudado);
        const pct = meta > 0 ? Math.round((rec / meta) * 100) : 0;
        return <Progress percent={pct} size="small" strokeColor="#16a34a" />;
      }
    },
    { title: 'Meta', dataIndex: 'meta', key: 'meta', render: v => `$${Number(v).toLocaleString()}`, width: 90 },
    { title: 'Activo', dataIndex: 'active', key: 'active', render: v => v ? <Tag color="success">Sí</Tag> : <Tag>No</Tag>, width: 80 },
    {
      title: '', key: 'actions', width: 90, render: (_, r) => (
        <Space>
          <Button size="small" icon={<PencilSimple size={13} />} onClick={() => openCausesModal(r)} />
          <Popconfirm title="¿Eliminar causa?" onConfirm={() => deleteCause(r.id)} okText="Sí" cancelText="No">
            <Button size="small" danger icon={<Trash size={13} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const galleryCols: ColumnsType<GalleryItem> = [
    {
      title: 'Imagen', key: 'img', width: 80, render: (_, r) => (
        <img src={r.url} alt={r.title ?? ''} style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 4 }} />
      )
    },
    { title: 'Título', dataIndex: 'title', key: 'title', ellipsis: true },
    { title: 'Categoría', dataIndex: 'category', key: 'category', width: 110 },
    { title: 'Orden', dataIndex: 'order', key: 'order', width: 70 },
    {
      title: '', key: 'actions', width: 90, render: (_, r) => (
        <Space>
          <Button size="small" icon={<PencilSimple size={13} />} onClick={() => openGalleryModal(r)} />
          <Popconfirm title="¿Eliminar foto?" onConfirm={() => deleteGallery(r.id)} okText="Sí" cancelText="No">
            <Button size="small" danger icon={<Trash size={13} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const faqCols: ColumnsType<FaqItem> = [
    { title: 'Pregunta', dataIndex: 'question', key: 'question', ellipsis: true },
    { title: 'Activo', dataIndex: 'active', key: 'active', render: v => v ? <Tag color="success">Sí</Tag> : <Tag>No</Tag>, width: 80 },
    { title: 'Orden', dataIndex: 'order', key: 'order', width: 70 },
    {
      title: '', key: 'actions', width: 90, render: (_, r) => (
        <Space>
          <Button size="small" icon={<PencilSimple size={13} />} onClick={() => openFaqModal(r)} />
          <Popconfirm title="¿Eliminar pregunta?" onConfirm={() => deleteFaq(r.id)} okText="Sí" cancelText="No">
            <Button size="small" danger icon={<Trash size={13} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const partnersCols: ColumnsType<Partner> = [
    {
      title: 'Logo', key: 'logo', width: 70, render: (_, r) => r.logo
        ? <img src={r.logo} alt={r.name} style={{ height: 32, maxWidth: 80, objectFit: 'contain' }} />
        : <span style={{ color: '#999', fontSize: 12 }}>Sin logo</span>
    },
    { title: 'Nombre', dataIndex: 'name', key: 'name' },
    { title: 'URL', dataIndex: 'url', key: 'url', ellipsis: true, render: v => v ? <a href={v} target="_blank" rel="noopener noreferrer">{v}</a> : '-' },
    { title: 'Activo', dataIndex: 'active', key: 'active', render: v => v ? <Tag color="success">Sí</Tag> : <Tag>No</Tag>, width: 80 },
    {
      title: '', key: 'actions', width: 90, render: (_, r) => (
        <Space>
          <Button size="small" icon={<PencilSimple size={13} />} onClick={() => openPartnersModal(r)} />
          <Popconfirm title="¿Eliminar aliado?" onConfirm={() => deletePartner(r.id)} okText="Sí" cancelText="No">
            <Button size="small" danger icon={<Trash size={13} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  /* ── Tabs ─────────────────────────────────── */
  const tabItems = [
    {
      key: 'noticias', label: 'Noticias',
      children: (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <Input prefix={<MagnifyingGlass size={14} />} placeholder="Buscar noticia..." value={newsSearch}
              onChange={e => setNewsSearch(e.target.value)} style={{ maxWidth: 300 }} allowClear />
            <Button type="primary" icon={<Plus size={14} />} onClick={() => openNewsModal()}>Nueva noticia</Button>
          </div>
          <Table dataSource={news.filter(n => n.title.toLowerCase().includes(newsSearch.toLowerCase()))}
            columns={newsCols} rowKey="id" loading={newsLoading} size="small" pagination={{ pageSize: 10 }} />
        </div>
      ),
    },
    {
      key: 'causas', label: 'Causas / Proyectos',
      children: (
        <div>
          <Alert type="info" showIcon style={{ marginBottom: 16 }}
            message="Las causas aparecen en la página principal del sitio web como tarjetas con barras de progreso de recaudación." />
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <Button type="primary" icon={<Plus size={14} />} onClick={() => openCausesModal()}>Nueva causa</Button>
          </div>
          <Table dataSource={causes} columns={causesCols} rowKey="id" loading={causesLoading} size="small" pagination={false} />
        </div>
      ),
    },
    {
      key: 'galeria', label: 'Galería de fotos',
      children: (
        <GalleryGrid
          gallery={gallery}
          loading={galleryLoading}
          onUpload={async (url) => {
            try {
              await fetch('/api/gestion-web/galeria', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, title: '', order: gallery.length }),
              });
              toast.success('Foto agregada a la galería');
              loadGallery();
            } catch { toast.error('Error agregando foto'); }
          }}
          onDelete={async (id) => {
            try {
              await fetch(`/api/gestion-web/galeria/${id}`, { method: 'DELETE' });
              toast.success('Foto eliminada');
              loadGallery();
            } catch { toast.error('Error eliminando foto'); }
          }}
        />
      ),
    },
    {
      key: 'faq', label: 'FAQ',
      children: (
        <div>
          <Alert type="info" showIcon style={{ marginBottom: 16 }}
            message="Las preguntas frecuentes aparecen en la sección FAQ del sitio web." />
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <Button type="primary" icon={<Plus size={14} />} onClick={() => openFaqModal()}>Nueva pregunta</Button>
          </div>
          <Table dataSource={faqs} columns={faqCols} rowKey="id" loading={faqLoading} size="small" pagination={false} />
        </div>
      ),
    },
    {
      key: 'aliados', label: 'Aliados',
      children: (
        <div>
          <Alert type="info" showIcon style={{ marginBottom: 16 }}
            message="Los aliados y patrocinadores aparecen en la sección de aliados del sitio web." />
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <Button type="primary" icon={<Plus size={14} />} onClick={() => openPartnersModal()}>Nuevo aliado</Button>
          </div>
          <Table dataSource={partners} columns={partnersCols} rowKey="id" loading={partnersLoading} size="small" pagination={false} />
        </div>
      ),
    },
    {
      key: 'contenido', label: 'Textos del sitio',
      children: (
        <Spin spinning={contentLoading}>
          <Form form={contentForm} layout="vertical" onFinish={saveContent}>
            <Divider>Textos del hero (inicio)</Divider>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item name="hero__subtitulo" label="Badge superior (ej: Desde 1997 · El Salvador)">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="hero__titulo" label="Título principal">
                  <Input.TextArea rows={2} />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="hero__descripcion" label="Descripción del hero">
                  <Input.TextArea rows={3} />
                </Form.Item>
              </Col>
            </Row>
            <Divider>Imágenes del sitio</Divider>
            <Form.Item name="hero__imagen" label="Imagen de fondo del hero (inicio)">
              <CloudinaryUpload folder="asistedcos/hero" aspectHint="16:9 — 1920×1080 recomendado" />
            </Form.Item>
            <Form.Item name="about__imagen" label="Imagen de la sección Nosotros/Misión">
              <CloudinaryUpload folder="asistedcos/about" aspectHint="4:3 — 800×600 recomendado" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={contentSaving}>Guardar contenido</Button>
          </Form>
        </Spin>
      ),
    },
    {
      key: 'biblioteca', label: 'Biblioteca de medios',
      children: (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <Select
              value={bibFolder}
              onChange={v => setBibFolder(v)}
              style={{ minWidth: 220 }}
              placeholder="Filtrar por carpeta"
            >
              <Select.Option value="">Todas las carpetas</Select.Option>
              <Select.Option value="asistedcos/noticias">asistedcos/noticias</Select.Option>
              <Select.Option value="asistedcos/causas">asistedcos/causas</Select.Option>
              <Select.Option value="asistedcos/galeria">asistedcos/galeria</Select.Option>
              <Select.Option value="asistedcos/hero">asistedcos/hero</Select.Option>
              <Select.Option value="asistedcos/about">asistedcos/about</Select.Option>
              <Select.Option value="asistedcos/aliados">asistedcos/aliados</Select.Option>
              <Select.Option value="asistedcos/ong">asistedcos/ong</Select.Option>
            </Select>
            <Input
              prefix={<MagnifyingGlass size={14} />}
              placeholder="Buscar por ID..."
              value={bibSearch}
              onChange={e => setBibSearch(e.target.value)}
              style={{ maxWidth: 240 }}
              allowClear
            />
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              <CloudinaryUpload
                folder={bibFolder || 'asistedcos/ong'}
                label="Subir imagen"
                onChange={() => loadBiblioteca()}
              />
              <Tooltip title="Refrescar">
                <Button icon={<ArrowClockwise size={15} />} onClick={loadBiblioteca} loading={bibLoading} />
              </Tooltip>
            </div>
          </div>
          <Spin spinning={bibLoading}>
            {biblioteca.filter(img => !bibSearch || img.publicId.toLowerCase().includes(bibSearch.toLowerCase())).length === 0 && !bibLoading
              ? <Empty description="No hay imágenes en esta carpeta" />
              : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {biblioteca
                    .filter(img => !bibSearch || img.publicId.toLowerCase().includes(bibSearch.toLowerCase()))
                    .map(img => (
                      <Card
                        key={img.publicId}
                        size="small"
                        bodyStyle={{ padding: 8 }}
                        cover={
                          <Image
                            src={img.url}
                            alt={img.publicId}
                            style={{ height: 80, objectFit: 'cover', width: '100%' }}
                            preview={{ src: img.fullUrl }}
                          />
                        }
                      >
                        <div style={{ fontSize: 11, color: '#666', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <Tooltip title={img.publicId}>
                            <ImageIcon size={11} style={{ marginRight: 4 }} />
                            {img.publicId.split('/').pop()}
                          </Tooltip>
                        </div>
                        <div style={{ fontSize: 11, color: '#999', marginBottom: 6 }}>
                          {(img.bytes / 1024).toFixed(1)} KB
                        </div>
                        <Tooltip title="Copiar URL completa">
                          <Button
                            size="small"
                            icon={<Copy size={12} />}
                            style={{ width: '100%' }}
                            onClick={() => {
                              navigator.clipboard.writeText(img.fullUrl);
                              toast.success('URL copiada');
                            }}
                          >
                            Copiar URL
                          </Button>
                        </Tooltip>
                      </Card>
                    ))}
                </div>
              )
            }
          </Spin>
        </div>
      ),
    },
  ];

  /* ── Render ─────────────────────────────────── */
  const addActionByTab: Record<string, { label: string; onClick: () => void } | undefined> = {
    noticias: { label: 'Nueva noticia', onClick: () => openNewsModal() },
  };

  return (
    <>
      <PageHeader
        icon={<Globe size={22} />}
        title="Gestión Web"
        description="Administra el contenido del sitio público — noticias, causas, galería, FAQ y aliados"
        actions={[
          ...(addActionByTab[tab] ? [addActionByTab[tab]!] : []),
          {
            label: deploying ? 'Publicando...' : 'Publicar sitio',
            onClick: triggerDeploy,
          },
        ]}
      />

      <Tabs activeKey={tab} onChange={setTab} items={tabItems} />

      {/* News Modal */}
      <Modal
        title={newsEditing ? 'Editar noticia' : 'Nueva noticia'}
        open={newsModal}
        onCancel={() => setNewsModal(false)}
        onOk={() => newsForm.submit()}
        confirmLoading={newsSaving}
        width={700}
        okText={newsEditing ? 'Actualizar' : 'Crear'}
      >
        <Form form={newsForm} layout="vertical" onFinish={saveNews}>
          <Form.Item name="title" label="Título" rules={[{ required: true }]}>
            <Input onChange={e => { if (!newsEditing) newsForm.setFieldValue('slug', slugify(e.target.value)); }} />
          </Form.Item>
          <Form.Item name="slug" label="Slug (URL)" rules={[{ required: true }]}>
            <Input prefix="/" />
          </Form.Item>
          <Form.Item name="summary" label="Resumen">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            name="body"
            label="Contenido"
            extra="Escribe el contenido completo. Separa los párrafos con una línea en blanco."
          >
            <Input.TextArea rows={10} placeholder={"Escribe aquí el contenido completo de la noticia...\n\nSepara los párrafos con una línea en blanco para que se vean correctamente en el sitio web."} />
          </Form.Item>
          <Form.Item name="coverImage" label="Imagen de portada">
            <CloudinaryUpload folder="asistedcos/noticias" aspectHint="16:9 recomendado" />
          </Form.Item>
          <Form.Item name="categoria" label="Categoría">
            <Select placeholder="Seleccionar categoría" allowClear>
              <Select.Option value="Proyectos">Proyectos</Select.Option>
              <Select.Option value="Eventos">Eventos</Select.Option>
              <Select.Option value="Logros">Logros</Select.Option>
              <Select.Option value="Comunidades">Comunidades</Select.Option>
              <Select.Option value="Alianzas">Alianzas</Select.Option>
              <Select.Option value="Voluntariado">Voluntariado</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="published" label="Publicado" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Causes Modal */}
      <Modal
        title={causeEditing ? 'Editar causa' : 'Nueva causa'}
        open={causesModal}
        onCancel={() => setCausesModal(false)}
        onOk={() => causesForm.submit()}
        confirmLoading={causesSaving}
        width={600}
        okText={causeEditing ? 'Actualizar' : 'Crear'}
      >
        <Form form={causesForm} layout="vertical" onFinish={saveCause}>
          <Row gutter={12}>
            <Col span={16}>
              <Form.Item name="titulo" label="Título" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="tag" label="Etiqueta (ej: Manglar)">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="descripcion" label="Descripción">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="coverImage" label="Imagen">
            <CloudinaryUpload folder="asistedcos/causas" aspectHint="4:3 recomendado" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="meta" label="Meta (USD)" rules={[{ required: true }]}>
                <InputNumber min={0} step={1000} prefix="$" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="recaudado" label="Recaudado (USD)" rules={[{ required: true }]}>
                <InputNumber min={0} step={100} prefix="$" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="order" label="Orden">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="active" label="Activo" valuePropName="checked" initialValue={true}>
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Gallery Modal */}
      <Modal
        title={galleryEditing ? 'Editar foto' : 'Agregar foto'}
        open={galleryModal}
        onCancel={() => setGalleryModal(false)}
        onOk={() => galleryForm.submit()}
        confirmLoading={gallerySaving}
        width={500}
        okText={galleryEditing ? 'Actualizar' : 'Agregar'}
      >
        <Form form={galleryForm} layout="vertical" onFinish={saveGallery}>
          <Form.Item name="url" label="Imagen" rules={[{ required: true }]}>
            <CloudinaryUpload folder="asistedcos/galeria" />
          </Form.Item>
          <Form.Item name="title" label="Título (opcional)">
            <Input />
          </Form.Item>
          <Form.Item name="category" label="Categoría (ej: Reforestación, Manglar)">
            <Input />
          </Form.Item>
          <Form.Item name="order" label="Orden" initialValue={0}>
            <InputNumber min={0} style={{ width: 100 }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* FAQ Modal */}
      <Modal
        title={faqEditing ? 'Editar pregunta' : 'Nueva pregunta'}
        open={faqModal}
        onCancel={() => setFaqModal(false)}
        onOk={() => faqForm.submit()}
        confirmLoading={faqSaving}
        width={600}
        okText={faqEditing ? 'Actualizar' : 'Crear'}
      >
        <Form form={faqForm} layout="vertical" onFinish={saveFaq}>
          <Form.Item name="question" label="Pregunta" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="answer" label="Respuesta" rules={[{ required: true }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="order" label="Orden" initialValue={0}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="active" label="Activo" valuePropName="checked" initialValue={true}>
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Partners Modal */}
      <Modal
        title={partnerEditing ? 'Editar aliado' : 'Nuevo aliado'}
        open={partnersModal}
        onCancel={() => setPartnersModal(false)}
        onOk={() => partnersForm.submit()}
        confirmLoading={partnersSaving}
        width={500}
        okText={partnerEditing ? 'Actualizar' : 'Crear'}
      >
        <Form form={partnersForm} layout="vertical" onFinish={savePartner}>
          <Form.Item name="name" label="Nombre del aliado" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="logo" label="Logo">
            <CloudinaryUpload folder="asistedcos/aliados" aspectHint="Logo horizontal recomendado" />
          </Form.Item>
          <Form.Item name="url" label="Sitio web">
            <Input placeholder="https://..." />
          </Form.Item>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="order" label="Orden" initialValue={0}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="active" label="Activo" valuePropName="checked" initialValue={true}>
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
}
