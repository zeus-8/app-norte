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
    
    // 1. Si intenta acceder a /admin, verificar rol exclusivo de administrador
    if (pathname.startsWith('/admin') && payload.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // 2. Bloqueo de Módulo de Jornadas Apps (/driver) si no forma parte del plan
    if (pathname.startsWith('/driver') && payload.role !== 'admin' && payload.moduleDriver === false) {
      const url = new URL('/dashboard', request.url);
      url.searchParams.set('restricted', 'driver');
      return NextResponse.redirect(url);
    }

    // 3. Bloqueo de Módulo de Gastos y Cuotas (/expenses) si no forma parte del plan
    if (pathname.startsWith('/expenses') && payload.role !== 'admin' && payload.moduleExpenses === false) {
      const url = new URL('/dashboard', request.url);
      url.searchParams.set('restricted', 'expenses');
      return NextResponse.redirect(url);
    }

    // 4. Bloqueo de Módulo de Mantenimiento Vehicular (/vehicle) si no forma parte del plan
    if (pathname.startsWith('/vehicle') && payload.role !== 'admin' && payload.moduleVehicle === false) {
      const url = new URL('/dashboard', request.url);
      url.searchParams.set('restricted', 'vehicle');
      return NextResponse.redirect(url);
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
