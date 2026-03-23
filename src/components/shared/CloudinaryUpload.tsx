'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Button, Progress, Image, Modal, Input, Spin, Empty, Tooltip } from 'antd';
import { UploadSimple, X, Images, ArrowsClockwise, MagnifyingGlass } from '@phosphor-icons/react';
import { toast } from 'sonner';

interface Props {
  value?: string;
  onChange?: (url: string) => void;
  folder?: string;
  accept?: string;
  label?: string;
  aspectHint?: string;
}

interface CloudItem {
  publicId: string;
  url: string;
  fullUrl: string;
  bytes: number;
  folder: string;
  createdAt: string;
}

export default function CloudinaryUpload({
  value,
  onChange,
  folder = 'asistedcos',
  accept = 'image/*',
  label = 'Subir imagen',
  aspectHint,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading]     = useState(false);
  const [progress, setProgress]       = useState(0);

  // Gallery picker
  const [pickerOpen, setPickerOpen]   = useState(false);
  const [images, setImages]           = useState<CloudItem[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [search, setSearch]           = useState('');

  /* ── Upload file ─────────────────────────────── */
  async function handleFile(file: File) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Solo se permiten imágenes'); return; }
    if (file.size > 10 * 1024 * 1024)   { toast.error('La imagen no puede superar 10 MB'); return; }

    setUploading(true);
    setProgress(10);
    try {
      const signRes = await fetch('/api/cloudinary/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder }),
      });
      if (!signRes.ok) throw new Error('Error obteniendo firma de Cloudinary');
      const { signature, timestamp, apiKey, cloudName } = await signRes.json();

      setProgress(35);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', String(timestamp));
      formData.append('signature', signature);
      formData.append('folder', folder);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: formData }
      );
      setProgress(85);
      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error?.message || 'Error subiendo a Cloudinary');
      }
      const data = await uploadRes.json();
      setProgress(100);
      const optimizedUrl = data.secure_url.replace('/upload/', '/upload/q_auto,f_auto/');
      onChange?.(optimizedUrl);
      toast.success('Imagen subida correctamente');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error subiendo imagen');
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  /* ── Gallery picker ──────────────────────────── */
  const loadImages = useCallback(async () => {
    setPickerLoading(true);
    try {
      const r = await fetch('/api/cloudinary/media');
      const d = await r.json();
      setImages(d.data ?? []);
    } catch {
      toast.error('Error cargando imágenes');
    } finally {
      setPickerLoading(false);
    }
  }, []);

  function openPicker() {
    setPickerOpen(true);
    setSearch('');
    loadImages();
  }

  function selectImage(item: CloudItem) {
    onChange?.(item.fullUrl);
    setPickerOpen(false);
    toast.success('Imagen seleccionada');
  }

  const filtered = search
    ? images.filter(i => i.publicId.toLowerCase().includes(search.toLowerCase()) || i.folder.toLowerCase().includes(search.toLowerCase()))
    : images;

  /* ── Render ──────────────────────────────────── */
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* ── State A: has image ── */}
        {value ? (
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            {/* Preview */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <Image
                src={value}
                alt="Preview"
                style={{ width: 140, height: 100, objectFit: 'cover', borderRadius: 8, display: 'block' }}
                preview={{ mask: 'Ver' }}
              />
            </div>
            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button
                size="small"
                icon={<UploadSimple size={13} />}
                onClick={() => inputRef.current?.click()}
                loading={uploading}
              >
                Subir nueva
              </Button>
              <Button
                size="small"
                icon={<Images size={13} />}
                onClick={openPicker}
              >
                Seleccionar de galería
              </Button>
              <Button
                size="small"
                danger
                icon={<X size={13} />}
                onClick={() => onChange?.('')}
              >
                Quitar imagen
              </Button>
              {uploading && (
                <Progress percent={progress} size="small" status="active" style={{ width: 160 }} />
              )}
            </div>
          </div>
        ) : (
          /* ── State B: no image ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 420 }}>
            {/* Drop zone */}
            <div
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onDragOver={e => e.preventDefault()}
              onClick={() => !uploading && inputRef.current?.click()}
              style={{
                border: '2px dashed hsl(var(--border-default))',
                borderRadius: 8,
                padding: '20px',
                textAlign: 'center',
                background: uploading ? 'hsl(var(--bg-muted))' : 'transparent',
                cursor: uploading ? 'not-allowed' : 'pointer',
                transition: 'border-color 0.2s',
              }}
            >
              {uploading ? (
                <div>
                  <Progress percent={progress} size="small" status="active" style={{ marginBottom: 6 }} />
                  <span style={{ fontSize: 12, color: 'hsl(var(--text-muted))' }}>Subiendo a Cloudinary...</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <UploadSimple size={28} color="hsl(var(--text-muted))" />
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: 11, color: 'hsl(var(--text-muted))' }}>
                    Arrastra una imagen o haz click · PNG, JPG, WebP · Máx. 10 MB
                    {aspectHint && <><br /><span style={{ color: 'hsl(var(--brand-primary))' }}>{aspectHint}</span></>}
                  </div>
                </div>
              )}
            </div>

            {/* Select from gallery */}
            <Button
              icon={<Images size={14} />}
              onClick={openPicker}
              style={{ alignSelf: 'flex-start' }}
            >
              Seleccionar de mi galería Cloudinary
            </Button>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>

      {/* ── Gallery picker modal ─────────────────── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Images size={18} />
            <span>Galería de Cloudinary</span>
          </div>
        }
        open={pickerOpen}
        onCancel={() => setPickerOpen(false)}
        footer={null}
        width={860}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <Input
            prefix={<MagnifyingGlass size={14} />}
            placeholder="Buscar imagen por nombre o carpeta..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1 }}
            allowClear
          />
          <Tooltip title="Recargar">
            <Button icon={<ArrowsClockwise size={14} />} onClick={loadImages} loading={pickerLoading} />
          </Tooltip>
        </div>

        <Spin spinning={pickerLoading}>
          {filtered.length === 0 && !pickerLoading ? (
            <Empty description="No hay imágenes. Sube tu primera imagen desde el campo de arriba." />
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 10,
            }}>
              {filtered.map(img => (
                <div
                  key={img.publicId}
                  onClick={() => selectImage(img)}
                  style={{
                    cursor: 'pointer',
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: '2px solid transparent',
                    transition: 'border-color 0.15s, transform 0.15s',
                    background: 'hsl(var(--bg-muted))',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'hsl(var(--brand-primary))';
                    (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.02)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent';
                    (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
                  }}
                >
                  <img
                    src={img.url}
                    alt={img.publicId}
                    style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }}
                    loading="lazy"
                  />
                  <div style={{ padding: '6px 8px' }}>
                    <div style={{ fontSize: 10, color: 'hsl(var(--text-muted))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {img.publicId.split('/').pop()}
                    </div>
                    <div style={{ fontSize: 10, color: 'hsl(var(--text-muted))' }}>
                      {Math.round(img.bytes / 1024)} KB
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Spin>
      </Modal>
    </>
  );
}
