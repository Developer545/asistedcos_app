import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    await getCurrentUser();

    const { folder = 'asistedcos', public_id } = await req.json();

    const timestamp = Math.round(Date.now() / 1000);
    const apiSecret = process.env.CLOUDINARY_API_SECRET!;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
    const apiKey    = process.env.CLOUDINARY_API_KEY!;

    // Build the params to sign
    const params: Record<string, string | number> = { folder, timestamp };
    if (public_id) params.public_id = public_id;

    // Sort params alphabetically and create string
    const paramStr = Object.keys(params)
      .sort()
      .map(k => `${k}=${params[k]}`)
      .join('&');

    const signature = crypto
      .createHash('sha256')
      .update(paramStr + apiSecret)
      .digest('hex');

    return NextResponse.json({
      signature,
      timestamp,
      apiKey,
      cloudName,
      folder,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error generando firma' },
      { status: 500 }
    );
  }
}
