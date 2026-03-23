import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';

const PUBLIC_PAGE_PATHS = ['/login'];
const PUBLIC_API_PATHS  = [
  '/api/public/',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/refresh',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // --- API routes ---
  if (pathname.startsWith('/api/')) {
    // Allow explicitly public API paths
    const isPublicApi = PUBLIC_API_PATHS.some(p => pathname.startsWith(p));
    if (isPublicApi) return NextResponse.next();

    // All other /api/* routes require a valid JWT
    const token = req.cookies.get('ong_access_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // --- Page routes ---
  const isPublicPage = PUBLIC_PAGE_PATHS.some(p => pathname.startsWith(p));
  if (isPublicPage) return NextResponse.next();

  const token = req.cookies.get('ong_access_token')?.value;
  if (!token) return NextResponse.redirect(new URL('/login', req.url));

  const payload = await verifyAccessToken(token);
  if (!payload) return NextResponse.redirect(new URL('/login', req.url));

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
