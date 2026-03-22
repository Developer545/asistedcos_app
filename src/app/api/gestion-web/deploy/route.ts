import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function POST() {
  try {
    await getCurrentUser();
    const hookUrl = process.env.VERCEL_DEPLOY_HOOK_ONG;
    if (!hookUrl) {
      return NextResponse.json({ success: false, error: 'Deploy hook no configurado. Agrega VERCEL_DEPLOY_HOOK_ONG en las variables de entorno.' }, { status: 400 });
    }
    const res = await fetch(hookUrl, { method: 'POST' });
    if (!res.ok) throw new Error('Vercel respondió con error');
    return NextResponse.json({ success: true, message: 'Redespliegue iniciado en Vercel' });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
