import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  try {
    await getCurrentUser();
    const folder = req.nextUrl.searchParams.get('folder') ?? '';
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
    const apiKey    = process.env.CLOUDINARY_API_KEY!;
    const apiSecret = process.env.CLOUDINARY_API_SECRET!;

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/resources/search`;
    const expression = folder ? `folder:${folder}*` : 'resource_type:image';

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`,
      },
      body: JSON.stringify({ expression, max_results: 100, sort_by: [{ created_at: 'desc' }], with_field: ['context', 'tags'] }),
    });

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ success: false, error: err.error?.message ?? 'Error Cloudinary' }, { status: 500 });
    }

    const data = await res.json();
    const images = (data.resources ?? []).map((r: { public_id: string; secure_url: string; width: number; height: number; bytes: number; created_at: string; folder: string }) => ({
      publicId: r.public_id,
      url: r.secure_url.replace('/upload/', '/upload/q_auto,f_auto,w_400/'),
      fullUrl: r.secure_url.replace('/upload/', '/upload/q_auto,f_auto/'),
      width: r.width,
      height: r.height,
      bytes: r.bytes,
      createdAt: r.created_at,
      folder: r.folder ?? '',
    }));

    return NextResponse.json({ success: true, data: images, total: data.total_count ?? images.length });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await getCurrentUser();
    const { publicId } = await req.json();
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
    const apiKey    = process.env.CLOUDINARY_API_KEY!;
    const apiSecret = process.env.CLOUDINARY_API_SECRET!;
    const timestamp = Math.round(Date.now() / 1000);
    const str = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha256').update(str).digest('hex');

    const form = new URLSearchParams();
    form.set('public_id', publicId);
    form.set('api_key', apiKey);
    form.set('timestamp', String(timestamp));
    form.set('signature', signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    const data = await res.json();
    return NextResponse.json({ success: data.result === 'ok', result: data.result });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
