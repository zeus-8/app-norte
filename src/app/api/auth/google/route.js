import { NextResponse } from 'next/server';
import { getGoogleAuthUrl, isGoogleAuthConfigured } from '@/lib/google-auth.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const simulate = searchParams.get('simulate');
  const from = searchParams.get('from') || '/dashboard';

  // Si no está configurado pero se solicita simulación en desarrollo
  if (!isGoogleAuthConfigured()) {
    if (simulate === 'true' || process.env.NODE_ENV !== 'production') {
      // Redirigir a callback simulado
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const simEmail = searchParams.get('email') || 'chofer.google@gmail.com';
      const simName = searchParams.get('name') || 'Chofer Google Demo';
      return NextResponse.redirect(`${appUrl}/api/auth/google/callback?simulated=true&email=${encodeURIComponent(simEmail)}&name=${encodeURIComponent(simName)}`);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${appUrl}/login?error=google_not_configured`);
  }

  const authUrl = getGoogleAuthUrl(from);
  return NextResponse.redirect(authUrl);
}
