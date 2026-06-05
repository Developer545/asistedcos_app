'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Table, Button, Modal, Form, Input, Switch, Space,
  Tabs, Tag, Popconfirm, Row, Col, Alert, Card, Divider, DatePicker,
  InputNumber, Spin, Progress, Select, Image, Tooltip, Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  Globe, PencilSimple, Trash, MagnifyingGlass, Plus, Eye,
  Copy, ArrowClockwise, CloudArrowUp, Image as ImageIcon, Images,
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerImages, setPickerImages] = useState<{ publicId: string; url: string; fullUrl: string; bytes: number }[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  const CARD_H = 190;

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { toast.error('Solo imágenes'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Máximo 10 MB'); return; }
    setUploading(true); setUploadProgress(10);
    try {
      const signRes = await fetch('/api/cloudinary/sign', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: 'asistedcos/galeria' }),
      });
      if (!signRes.ok) throw new Error('Error de firma');
      const { signature, timestamp, apiKey, cloudName } = await signRes.json();
      setUploadProgress(35);
      const fd = new FormData();
      fd.append('file', file); fd.append('api_key', apiKey);
      fd.append('timestamp', String(timestamp)); fd.append('signature', signature);
      fd.append('folder', 'asistedcos/galeria');
      const up = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: fd });
      setUploadProgress(85);
      if (!up.ok) throw new Error('Error subiendo');
      const data = await up.json();
      setUploadProgress(100);
      const url = data.secure_url.replace('/upload/', '/upload/q_auto,f_auto/');
      await onUpload(url);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setUploading(false); setUploadProgress(0); if (inputRef.current) inputRef.current.value = ''; }
  }

  async function openPicker() {
    setPickerOpen(true); setPickerLoading(true); setPickerSearch('');
    try {
      const r = await fetch('/api/cloudinary/media');
      const d = await r.json();
      setPickerImages(d.data ?? []);
    } catch { toast.error('Error cargando galería'); }
    finally { setPickerLoading(false); }
  }

  const filtered = pickerSearch
    ? pickerImages.filter(i => i.publicId.toLowerCase().includes(pickerSearch.toLowerCase()))
    : pickerImages;

  return (
    <Spin spinning={loading}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ color: 'hsl(var(--text-muted))', fontSize: 13 }}>
          <strong>{gallery.length}</strong> foto{gallery.length !== 1 ? 's' : ''} en la galería pública del sitio web
        </span>
        <Space>
          <Button icon={<Images size={14} />} onClick={openPicker}>
            Seleccionar de Cloudinary
          </Button>
          <Button type="primary" icon={<Plus size={14} />} onClick={() => inputRef.current?.click()} loading={uploading}>
            Subir nueva foto
          </Button>
        </Space>
      </div>

      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

      {/* Upload progress bar */}
      {uploading && (
        <Progress percent={uploadProgress} status="active" size="small" style={{ marginBottom: 12 }} />
      )}

      {/* Photo grid */}
      {gallery.length === 0 && !uploading ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No hay fotos en la galería. Sube tu primera foto."
          style={{ padding: '40px 0' }}
        />
      ) : (
        <Image.PreviewGroup>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
            gap: 10,
          }}>
            {gallery.map(item => (
              <div key={item.id} style={{
                position: 'relative',
                borderRadius: 8,
                overflow: 'hidden',
                height: CARD_H,
                background: 'hsl(var(--bg-muted))',
                border: '1px solid hsl(var(--border-default))',
              }}>
                <Image
                  src={item.url}
                  alt={item.title ?? ''}
                  style={{ width: '100%', height: CARD_H, objectFit: 'cover', display: 'block' }}
                  preview={{ mask: <Eye size={16} /> }}
                />
                <Tooltip title="Eliminar foto">
                  <Button
                    size="small" danger icon={<Trash size={13} />}
                    onClick={() => onDelete(item.id)}
                    style={{ position: 'absolute', top: 6, right: 6, boxShadow: '0 1px 4px rgba(0,0,0,0.35)' }}
                  />
                </Tooltip>
              </div>
            ))}
          </div>
        </Image.PreviewGroup>
      )}

      {/* Cloudinary picker modal */}
      <Modal
        title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Images size={16} /> Seleccionar de Cloudinary</span>}
        open={pickerOpen} onCancel={() => setPickerOpen(false)} footer={null} width={820}
        styles={{ body: { maxHeight: '65vh', overflowY: 'auto' } }}
      >
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <Input prefix={<MagnifyingGlass size={13} />} placeholder="Buscar imagen..."
            value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} allowClear style={{ flex: 1 }} />
          <Button icon={<ArrowClockwise size={13} />} onClick={openPicker} loading={pickerLoading} />
        </div>
        <Spin spinning={pickerLoading}>
          {filtered.length === 0 && !pickerLoading
            ? <Empty description="No hay imágenes disponibles" />
            : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
                {filtered.map(img => (
                  <div key={img.publicId}
                    onClick={async () => { setPickerOpen(false); await onUpload(img.fullUrl); }}
                    style={{ cursor: 'pointer', borderRadius: 8, overflow: 'hidden', border: '2px solid transparent',
                      transition: 'border-color 0.15s, transform 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#16a34a'; (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.03)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent'; (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; }}
                  >
                    <img src={img.url} alt="" style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }} loading="lazy" />
                    <div style={{ padding: '4px 6px', fontSize: 10, color: 'hsl(var(--text-muted))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {Math.round(img.bytes / 1024)} KB
                    </div>
                  </div>
                ))}
              </div>
            )}
        </Spin>
      </Modal>
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
  id: string; name: string; description?: string; tag?: string;
  coverImage?: string; ubicacion?: string; estado: string;
  meta: number; recaudado: number; recaudadoReal: number;
  active: boolean; webOrder: number; publishOnWeb: boolean;
};
type FaqItem = { id: string; question: string; answer: string; order: number; active: boolean };
type Partner = { id: string; name: string; logo?: string; url?: string; active: boolean; order: number };
<<<<<<< HEAD
type Campaign = {
  id: string; titulo: string; descripcion?: string;
  fechaEvento?: string; fechaFin?: string;
  metaUnidades: number; recaudadoUnidades: number; unidadLabel: string;
  aporteSugerido: number; coverImage?: string; activo: boolean;
};
=======
type Testimonial = { id: string; quote: string; name: string; role: string; initials: string; photo?: string; active: boolean; order: number };
>>>>>>> 54e548f5a047db3d31dc474be1499d7e0a14ba44

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
  const [causesToggling, setCausesToggling] = useState<string | null>(null);
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

  /* ── Campaña ─────────────────────────────────── */
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [campaignModal, setCampaignModal] = useState(false);
  const [campaignEditing, setCampaignEditing] = useState<Campaign | null>(null);
  const [campaignSaving, setCampaignSaving] = useState(false);
  const [campaignForm] = Form.useForm();

  /* ── Deploy ─────────────────────────────────── */
  const [deploying, setDeploying] = useState(false);

  /* ── Testimonios ─────────────────────────────────── */
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [testimonialsLoading, setTestimonialsLoading] = useState(false);
  const [testimonialsModal, setTestimonialsModal] = useState(false);
  const [testimonialEditing, setTestimonialEditing] = useState<Testimonial | null>(null);
  const [testimonialsSaving, setTestimonialsSaving] = useState(false);
  const [testimonialsForm] = Form.useForm();

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
      const vals: Record<string, unknown> = {};
      (d.data ?? []).forEach((c: WebContent) => {
        const formKey = `${c.section}__${c.key}`;
        if (formKey === 'campaign__active') vals[formKey] = c.value === 'true';
        else if (formKey === 'campaign__endsAt') vals[formKey] = c.value ? dayjs(c.value) : null;
        else vals[formKey] = c.value;
      });
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

<<<<<<< HEAD
  const loadCampaigns = useCallback(async () => {
    setCampaignLoading(true);
    try {
      const r = await fetch('/api/gestion-web/campana');
      const d = await r.json();
      setCampaigns(d.data ?? []);
    } catch { toast.error('Error cargando campañas'); }
    finally { setCampaignLoading(false); }
=======
  const loadTestimonials = useCallback(async () => {
    setTestimonialsLoading(true);
    try {
      const r = await fetch('/api/gestion-web/testimonios');
      const d = await r.json();
      setTestimonials(d.data ?? []);
    } catch { toast.error('Error cargando testimonios'); }
    finally { setTestimonialsLoading(false); }
>>>>>>> 54e548f5a047db3d31dc474be1499d7e0a14ba44
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
<<<<<<< HEAD
  useEffect(() => { if (tab === 'campana') loadCampaigns(); }, [tab, loadCampaigns]);
=======
  useEffect(() => { if (tab === 'testimonios') loadTestimonials(); }, [tab, loadTestimonials]);
>>>>>>> 54e548f5a047db3d31dc474be1499d7e0a14ba44
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
  async function saveContent(vals: Record<string, unknown>) {
    setContentSaving(true);
    try {
      const IMAGE_KEYS = ['hero__imagen', 'about__imagen', 'campaign__image'];
      const entries = Object.entries(vals)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => {
          const [section, ...rest] = key.split('__');
          const fieldKey = rest.join('__');
          const type = IMAGE_KEYS.includes(key) ? 'image' : 'text';
          const normalizedValue =
            typeof value === 'boolean'
              ? String(value)
              : dayjs.isDayjs(value)
                ? value.toISOString()
                : String(value ?? '');
          return { section, key: fieldKey, value: normalizedValue, type };
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
    else causesForm.setFieldsValue({ active: true, publishOnWeb: false, estado: 'Activo', meta: 0, recaudado: 0, webOrder: 0 });
    setCausesModal(true);
  }

  async function saveCause(vals: Record<string, unknown>) {
    setCausesSaving(true);
    try {
      const url = causeEditing ? `/api/gestion-web/causas/${causeEditing.id}` : '/api/gestion-web/causas';
      const method = causeEditing ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(vals) });
      if (!r.ok) throw new Error((await r.json()).error ?? 'Error');
      toast.success(causeEditing ? 'Proyecto actualizado' : 'Proyecto creado');
      setCausesModal(false);
      loadCauses();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setCausesSaving(false); }
  }

  async function deleteCause(id: string) {
    try {
      await fetch(`/api/gestion-web/causas/${id}`, { method: 'DELETE' });
      toast.success('Proyecto eliminado');
      loadCauses();
    } catch { toast.error('Error eliminando'); }
  }

  async function toggleCausePublishOnWeb(cause: Cause) {
    setCausesToggling(cause.id);
    try {
      const r = await fetch(`/api/gestion-web/causas/${cause.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publishOnWeb: !cause.publishOnWeb }),
      });
      if (!r.ok) throw new Error();
      toast.success(!cause.publishOnWeb ? 'Publicado en la web' : 'Quitado de la web');
      loadCauses();
    } catch { toast.error('Error actualizando'); }
    finally { setCausesToggling(null); }
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

<<<<<<< HEAD
  /* ── Campaña CRUD ─────────────────────────────────── */
  function openCampaignModal(item?: Campaign) {
    setCampaignEditing(item ?? null);
    campaignForm.resetFields();
    if (item) {
      campaignForm.setFieldsValue({
        ...item,
        fechaEvento: item.fechaEvento ? dayjs(item.fechaEvento) : null,
        fechaFin: item.fechaFin ? dayjs(item.fechaFin) : null,
      });
    }
    setCampaignModal(true);
  }

  async function saveCampaign(vals: Record<string, unknown>) {
    setCampaignSaving(true);
    try {
      const payload = {
        ...vals,
        fechaEvento: vals.fechaEvento ? (vals.fechaEvento as dayjs.Dayjs).toISOString() : null,
        fechaFin: vals.fechaFin ? (vals.fechaFin as dayjs.Dayjs).toISOString() : null,
      };
      const url = campaignEditing ? `/api/gestion-web/campana/${campaignEditing.id}` : '/api/gestion-web/campana';
      const method = campaignEditing ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error('Error guardando campaña');
      toast.success(campaignEditing ? 'Campaña actualizada' : 'Campaña creada');
      setCampaignModal(false);
      loadCampaigns();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setCampaignSaving(false); }
  }

  async function deleteCampaign(id: string) {
    try {
      await fetch(`/api/gestion-web/campana/${id}`, { method: 'DELETE' });
      toast.success('Campaña eliminada');
      loadCampaigns();
    } catch { toast.error('Error eliminando campaña'); }
=======
  /* ── Testimonials CRUD ─────────────────────────────────── */
  function openTestimonialsModal(item?: Testimonial) {
    setTestimonialEditing(item ?? null);
    testimonialsForm.resetFields();
    if (item) testimonialsForm.setFieldsValue(item);
    setTestimonialsModal(true);
  }

  async function saveTestimonial(vals: Record<string, unknown>) {
    setTestimonialsSaving(true);
    try {
      const url = testimonialEditing ? `/api/gestion-web/testimonios/${testimonialEditing.id}` : '/api/gestion-web/testimonios';
      const method = testimonialEditing ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(vals) });
      if (!r.ok) throw new Error((await r.json()).error ?? 'Error');
      toast.success(testimonialEditing ? 'Testimonio actualizado' : 'Testimonio creado');
      setTestimonialsModal(false);
      loadTestimonials();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setTestimonialsSaving(false); }
  }

  async function deleteTestimonial(id: string) {
    try {
      await fetch(`/api/gestion-web/testimonios/${id}`, { method: 'DELETE' });
      toast.success('Testimonio eliminado');
      loadTestimonials();
    } catch { toast.error('Error eliminando'); }
>>>>>>> 54e548f5a047db3d31dc474be1499d7e0a14ba44
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
    { title: 'Nombre', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: 'Tag', dataIndex: 'tag', key: 'tag', render: v => v ? <Tag color="green">{v}</Tag> : '-', width: 110 },
    {
      title: 'Progreso donaciones', key: 'pct', width: 190, render: (_, r) => {
        const meta = Number(r.meta);
        const rec  = Number(r.recaudadoReal ?? r.recaudado);
        const pct  = meta > 0 ? Math.min(Math.round((rec / meta) * 100), 100) : 0;
        return (
          <div>
            <Progress percent={pct} size="small" strokeColor="#16a34a" />
            <span style={{ fontSize: 11, color: 'hsl(var(--text-muted))' }}>
              ${rec.toLocaleString()} / ${meta.toLocaleString()}
            </span>
          </div>
        );
      }
    },
    { title: 'Meta', dataIndex: 'meta', key: 'meta', render: v => `$${Number(v).toLocaleString()}`, width: 90 },
    { title: 'Activo', dataIndex: 'active', key: 'active', render: v => v ? <Tag color="success">Sí</Tag> : <Tag>No</Tag>, width: 80 },
    {
      title: <Tooltip title="Visible en el sitio web público"><Globe size={14} /></Tooltip>,
      dataIndex: 'publishOnWeb', key: 'publishOnWeb', width: 90, align: 'center' as const,
      render: (_: unknown, r: Cause) => (
        <Switch
          size="small"
          checked={r.publishOnWeb}
          loading={causesToggling === r.id}
          onChange={() => toggleCausePublishOnWeb(r)}
          checkedChildren="Web"
          unCheckedChildren="No"
        />
      ),
    },
    {
      title: '', key: 'actions', width: 90, render: (_, r) => (
        <Space>
          <Button size="small" icon={<PencilSimple size={13} />} onClick={() => openCausesModal(r)} />
          <Popconfirm title="¿Eliminar proyecto?" onConfirm={() => deleteCause(r.id)} okText="Sí" cancelText="No">
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

  const testimonialsCols: ColumnsType<Testimonial> = [
    {
      title: '', key: 'avatar', width: 52, render: (_, r) => r.photo
        ? <img src={r.photo} alt={r.name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
        : <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>{r.initials || '?'}</div>
    },
    { title: 'Nombre', dataIndex: 'name', key: 'name', width: 150 },
    { title: 'Cargo / Rol', dataIndex: 'role', key: 'role', width: 160, ellipsis: true },
    { title: 'Testimonio', dataIndex: 'quote', key: 'quote', ellipsis: true },
    { title: 'Activo', dataIndex: 'active', key: 'active', render: v => v ? <Tag color="success">Sí</Tag> : <Tag>No</Tag>, width: 80 },
    {
      title: '', key: 'actions', width: 90, render: (_, r) => (
        <Space>
          <Button size="small" icon={<PencilSimple size={13} />} onClick={() => openTestimonialsModal(r)} />
          <Popconfirm title="¿Eliminar testimonio?" onConfirm={() => deleteTestimonial(r.id)} okText="Sí" cancelText="No">
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

  const campaignCols: ColumnsType<Campaign> = [
    { title: 'Título', dataIndex: 'titulo', key: 'titulo', ellipsis: true },
    { title: 'Fecha evento', dataIndex: 'fechaEvento', key: 'fechaEvento', width: 120, render: v => v ? dayjs(v).format('DD/MM/YYYY') : '—' },
    { title: 'Fecha fin', dataIndex: 'fechaFin', key: 'fechaFin', width: 120, render: v => v ? dayjs(v).format('DD/MM/YYYY') : '—' },
    { title: 'Meta', dataIndex: 'metaUnidades', key: 'metaUnidades', width: 110, render: (v, r) => `${Number(v).toLocaleString()} ${r.unidadLabel}` },
    { title: 'Aporte', dataIndex: 'aporteSugerido', key: 'aporteSugerido', width: 90, render: v => `$${Number(v)}` },
    { title: 'Activo', dataIndex: 'activo', key: 'activo', width: 80, render: v => v ? <Tag color="success">Sí</Tag> : <Tag>No</Tag> },
    {
      title: '', key: 'actions', width: 90, render: (_, r) => (
        <Space>
          <Button size="small" icon={<PencilSimple size={13} />} onClick={() => openCampaignModal(r)} />
          <Popconfirm title="¿Eliminar campaña?" onConfirm={() => deleteCampaign(r.id)} okText="Sí" cancelText="No">
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
            message='Los proyectos son compartidos con el módulo "Proyectos". Activa "Publicar en web" para que aparezcan en el sitio público con barra de progreso.' />
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <Button type="primary" icon={<Plus size={14} />} onClick={() => openCausesModal()}>Nuevo proyecto</Button>
          </div>
          <Table dataSource={causes} columns={causesCols} rowKey="id" loading={causesLoading} size="small" pagination={false} />
        </div>
      ),
    },
    {
      key: 'campana', label: 'Campaña activa',
      children: (
        <div>
          <Alert type="info" showIcon style={{ marginBottom: 16 }}
            message="La campaña activa aparece en el sitio web con countdown, meta de unidades y aporte sugerido. Solo una campaña puede estar activa a la vez." />
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <Button type="primary" icon={<Plus size={14} />} onClick={() => openCampaignModal()}>Nueva campaña</Button>
          </div>
          <Table dataSource={campaigns} columns={campaignCols} rowKey="id" loading={campaignLoading} size="small" pagination={false} />
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
      key: 'testimonios', label: 'Testimonios',
      children: (
        <div>
          <Alert type="info" showIcon style={{ marginBottom: 16 }}
            message="Los testimonios aparecen en la sección de testimonios del sitio público. Recomendado: 3-6 testimonios activos." />
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <Button type="primary" icon={<Plus size={14} />} onClick={() => openTestimonialsModal()}>Nuevo testimonio</Button>
          </div>
          <Table dataSource={testimonials} columns={testimonialsCols} rowKey="id" loading={testimonialsLoading} size="small" pagination={false} />
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
            <Divider>Campaña destacada</Divider>
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="Aquí ajustas la campaña principal del home y de la página de donar. Puedes cambiarla cada semana o mes sin tocar código."
            />
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item name="campaign__active" label="Campaña activa" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
              <Col xs={24} md={16}>
                <Form.Item name="campaign__slug" label="Slug de campaña (ej: mangles-1m)">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="campaign__badge" label="Fecha corta / badge superior">
                  <Input placeholder="26 mayo 2026" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="campaign__title" label="Título principal de campaña">
                  <Input.TextArea rows={3} placeholder="Siembra de 1 Millón de mangles" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="campaign__description" label="Descripción de campaña">
                  <Input.TextArea rows={4} />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="campaign__image" label="Imagen principal de campaña">
                  <CloudinaryUpload folder="asistedcos/campanas" aspectHint="16:9 — 1920×1080 recomendado" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="campaign__goalLabel" label="Meta destacada">
                  <Input placeholder="1 Millón" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="campaign__goalFigure" label="Meta numérica secundaria">
                  <Input placeholder="1,000,000" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="campaign__unitLabel" label="Unidad / subtítulo de meta">
                  <Input placeholder="mangles nativos" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="campaign__progressPercent" label="Porcentaje de avance">
                  <InputNumber min={0} max={100} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="campaign__impactLabel" label="Etiqueta del avance">
                  <Input placeholder="Impulso inicial" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="campaign__suggestedAmount" label="Monto sugerido (USD)">
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="campaign__amounts" label="Montos sugeridos">
                  <Input placeholder="10,25,50,100,250" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="campaign__endsAt" label="Fecha y hora fin de campaña">
                  <DatePicker
                    showTime
                    format="DD/MM/YYYY HH:mm"
                    style={{ width: '100%' }}
                    placeholder="Selecciona fecha final"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="campaign__volunteerUrl" label="URL botón participar">
                  <Input placeholder="/contacto?campania=mangles-1m" />
                </Form.Item>
              </Col>
            </Row>
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
              <Select.Option value="asistedcos/campanas">asistedcos/campanas</Select.Option>
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
        title={causeEditing ? 'Editar proyecto' : 'Nuevo proyecto'}
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
              <Form.Item name="name" label="Nombre del proyecto" rules={[{ required: true, message: 'El nombre es requerido' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="tag" label="Etiqueta (ej: Manglar)">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Descripción">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="ubicacion" label="Ubicación (ej: Playa San Diego, La Libertad)">
            <Input />
          </Form.Item>
          <Form.Item name="coverImage" label="Imagen">
            <CloudinaryUpload folder="asistedcos/proyectos" aspectHint="4:3 recomendado" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="meta" label="Meta (USD)">
                <InputNumber min={0} step={1000} prefix="$" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="recaudado" label="Recaudado (USD)">
                <InputNumber min={0} step={100} prefix="$" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="estado" label="Estado" initialValue="Activo">
                <Select>
                  <Select.Option value="Activo">Activo</Select.Option>
                  <Select.Option value="Continuo">Continuo</Select.Option>
                  <Select.Option value="Completado">Completado</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="webOrder" label="Orden en web">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="active" label="Activo" valuePropName="checked" initialValue={true}>
                <Switch checkedChildren="Sí" unCheckedChildren="No" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="publishOnWeb" label="Publicar en web" valuePropName="checked" initialValue={false}>
                <Switch checkedChildren="Sí" unCheckedChildren="No" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Campaign Modal */}
      <Modal
        title={campaignEditing ? 'Editar campaña' : 'Nueva campaña'}
        open={campaignModal}
        onCancel={() => setCampaignModal(false)}
        onOk={() => campaignForm.submit()}
        confirmLoading={campaignSaving}
        width={640}
        okText={campaignEditing ? 'Actualizar' : 'Crear'}
      >
        <Form form={campaignForm} layout="vertical" onFinish={saveCampaign}>
          <Form.Item name="titulo" label="Título de la campaña" rules={[{ required: true }]}>
            <Input placeholder="Ej: Siembra de 1 Millón de mangles" />
          </Form.Item>
          <Form.Item name="descripcion" label="Descripción">
            <Input.TextArea rows={3} placeholder="Describe brevemente la campaña..." />
          </Form.Item>
          <Form.Item name="coverImage" label="Imagen de fondo">
            <CloudinaryUpload folder="asistedcos/campana" aspectHint="16:9 — 1920×1080 recomendado" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="fechaEvento" label="Fecha del evento (para mostrar en el sitio)">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="26/07/2026" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="fechaFin" label="Fecha límite (countdown)">
                <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" placeholder="Fin del countdown" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="metaUnidades" label="Meta (unidades)" initialValue={0}>
                <InputNumber min={0} step={1000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="recaudadoUnidades" label="Recaudado (unidades)" initialValue={0}>
                <InputNumber min={0} step={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="unidadLabel" label="Nombre de unidad" initialValue="Unidades">
                <Input placeholder="Ej: Mangles Nativos" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="aporteSugerido" label="Aporte sugerido ($)" initialValue={25}>
                <InputNumber min={1} prefix="$" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="activo" label="Campaña activa" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
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

      {/* Testimonials Modal */}
      <Modal
        title={testimonialEditing ? 'Editar testimonio' : 'Nuevo testimonio'}
        open={testimonialsModal}
        onCancel={() => setTestimonialsModal(false)}
        onOk={() => testimonialsForm.submit()}
        confirmLoading={testimonialsSaving}
        width={560}
        okText={testimonialEditing ? 'Actualizar' : 'Crear'}
      >
        <Form form={testimonialsForm} layout="vertical" onFinish={saveTestimonial}>
          <Form.Item name="quote" label="Testimonio" rules={[{ required: true, message: 'El testimonio es requerido' }]}>
            <Input.TextArea rows={3} placeholder="Escribe el testimonio aquí..." />
          </Form.Item>
          <Row gutter={12}>
            <Col span={14}>
              <Form.Item name="name" label="Nombre completo" rules={[{ required: true }]}>
                <Input placeholder="María López" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="initials" label="Iniciales (avatar)" rules={[{ required: true }]}>
                <Input placeholder="ML" maxLength={3} style={{ textTransform: 'uppercase' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="role" label="Cargo / Rol" rules={[{ required: true }]}>
            <Input placeholder="Pescadora, La Libertad" />
          </Form.Item>
          <Form.Item name="photo" label="Foto de perfil (opcional — reemplaza las iniciales)">
            <CloudinaryUpload folder="asistedcos/testimonios" aspectHint="1:1 cuadrada recomendado" />
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
