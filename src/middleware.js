import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super_secreto_para_firmar_tokens_jwt_saas_2026_autogastos'
);

const COOKIE_NAME = 'autogastos_session';

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Rutas públicas que no requieren autenticación
  const isPublicRoute = 
    pathname === '/' || 
    pathname.startsWith('/login') || 
    pathname.startsWith('/register') || 
    pathname.startsWith('/api/auth');

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Comprobar token en cookie
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    // Si intenta acceder a /admin, verificar rol
    if (pathname.startsWith('/admin') && payload.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
  } catch (err) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/driver/:path*',
    '/expenses/:path*',
    '/vehicle/:path*',
    '/settings/:path*',
    '/admin/:path*',
  ],
};
