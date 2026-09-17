import { NextResponse } from 'next/server';
import { removeSessionCookie } from '@/lib/auth.js';

export async function POST() {
  removeSessionCookie();
  return NextResponse.json({ success: true, message: 'Sesión cerrada correctamente' });
}
