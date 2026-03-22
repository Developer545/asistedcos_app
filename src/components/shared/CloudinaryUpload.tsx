'use client';

import React, { useRef, useState } from 'react';
import { Button, Progress, Image } from 'antd';
import { UploadSimple, X, CheckCircle } from '@phosphor-icons/react';
import { toast } from 'sonner';

interface Props {
  value?: string;
  onChange?: (url: string) => void;
  folder?: string;
  accept?: string;
  label?: string;
  aspectHint?: string; // e.g. "16:9 recomendado"
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
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);

  async function handleFile(file: File) {
    if (!file) return;

    // Validate type
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes');
      return;
    }
    // Max 10 MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error('La imagen no puede superar 10 MB');
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      // 1. Get signed params from our API
      const signRes = await fetch('/api/cloudinary/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder }),
      });

      if (!signRes.ok) throw new Error('Error obteniendo firma de Cloudinary');
      const { signature, timestamp, apiKey, cloudName } = await signRes.json();

      setProgress(30);

      // 2. Upload to Cloudinary
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

      setProgress(80);

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error?.message || 'Error subiendo a Cloudinary');
      }

      const data = await uploadRes.json();
      setProgress(100);

      // Return the secure URL (with auto quality and format)
      const optimizedUrl = data.secure_url.replace(
        '/upload/',
        '/upload/q_auto,f_auto/'
      );

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

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Preview */}
      {value && (
        <div style={{ position: 'relative', display: 'inline-block', maxWidth: 280 }}>
          <Image
            src={value}
            alt="Preview"
            style={{ borderRadius: 8, maxHeight: 180, objectFit: 'cover', width: '100%' }}
            preview={{ mask: 'Ver imagen' }}
          />
          <Button
            size="small"
            danger
            icon={<X size={12} />}
            onClick={() => onChange?.('')}
            style={{ position: 'absolute', top: 4, right: 4, padding: '0 4px' }}
          />
        </div>
      )}

      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{
          border: '2px dashed hsl(var(--border-default))',
          borderRadius: 8,
          padding: '16px 20px',
          textAlign: 'center',
          background: uploading ? 'hsl(var(--bg-muted))' : 'transparent',
          cursor: uploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          maxWidth: 400,
        }}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />

        {uploading ? (
          <div>
            <Progress percent={progress} size="small" status="active" style={{ marginBottom: 4 }} />
            <span style={{ fontSize: 12, color: 'hsl(var(--text-muted))' }}>Subiendo a Cloudinary...</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            {value ? (
              <CheckCircle size={24} color="hsl(var(--status-success))" />
            ) : (
              <UploadSimple size={24} color="hsl(var(--text-muted))" />
            )}
            <div style={{ fontSize: 13, fontWeight: 500 }}>
              {label}
            </div>
            <div style={{ fontSize: 11, color: 'hsl(var(--text-muted))' }}>
              Arrastra una imagen o haz click · PNG, JPG, WebP · Máx. 10 MB
              {aspectHint && <><br />{aspectHint}</>}
            </div>
          </div>
        )}
      </div>

      {/* Or paste URL */}
      <div style={{ fontSize: 11, color: 'hsl(var(--text-muted))' }}>
        O pega directamente la URL de Cloudinary en el campo de texto
      </div>
    </div>
  );
}
