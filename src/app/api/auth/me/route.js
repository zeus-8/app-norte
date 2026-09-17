import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }
    return NextResponse.json({ authenticated: true, user });
  } catch (error) {
    console.error('Error en /api/auth/me:', error);
    return NextResponse.json({ error: 'Error verificando sesión' }, { status: 500 });
  }
}
