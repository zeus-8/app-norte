import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { users, vehicleMaintenance, userSettings } from '@/db/schema.js';
import { eq } from 'drizzle-orm';
import { createSessionToken, setSessionCookie } from '@/lib/auth.js';
import { exchangeCodeForTokens, getGoogleUserInfo } from '@/lib/google-auth.js';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    const simulated = searchParams.get('simulated');

    if (errorParam) {
      console.error('[Google OAuth Error Param]', errorParam);
      return NextResponse.redirect(`${appUrl}/login?error=google_cancelled`);
    }

    let profile;

    if (simulated === 'true' && process.env.NODE_ENV !== 'production') {
      profile = {
        id: 'google-sim-123456',
        email: (searchParams.get('email') || 'chofer.google@gmail.com').toLowerCase(),
        name: searchParams.get('name') || 'Chofer Google Demo',
        picture: 'https://lh3.googleusercontent.com/a/default-user',
      };
    } else {
      if (!code) {
        return NextResponse.redirect(`${appUrl}/login?error=missing_code`);
      }

      const tokenData = await exchangeCodeForTokens(code);
      profile = await getGoogleUserInfo(tokenData.access_token);
    }

    if (!profile || !profile.email) {
      return NextResponse.redirect(`${appUrl}/login?error=google_no_profile`);
    }

    // 1. Buscar usuario en base de datos por email
    let [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, profile.email))
      .limit(1);

    let finalUser = existingUser;

    if (!finalUser) {
      // 2. Crear nuevo usuario suscriptor (SIEMPRE rol 'user')
      const randomPassword = Math.random().toString(36).slice(-12) + 'A1!';
      const passwordHash = await bcrypt.hash(randomPassword, 10);

      const [newUser] = await db
        .insert(users)
        .values({
          email: profile.email,
          passwordHash,
          name: profile.name || profile.email.split('@')[0],
          role: 'user', // Rol de chofer/suscriptor (Admin es nativo)
          driverType: 'owner',
          activeApps: ['uber', 'cabify', 'didi'],
          moduleDriver: true,
          moduleExpenses: true,
          moduleVehicle: true,
          themePreference: 'dark',
          googleId: profile.id,
          avatarUrl: profile.picture,
          subscriptionStatus: 'active',
        })
        .returning();

      finalUser = newUser;

      // 3. Inicializar odómetro base para el nuevo usuario
      await db.insert(userSettings).values({
        userId: finalUser.id,
        key: 'current_odometer',
        value: '145000',
      }).onConflictDoNothing();

      // 4. Pre-cargar catálogo de mantenimientos estándar de Argentina
      const defaultMaintenance = [
        { name: 'Oblea GNC (Permiso Anual)', trackingType: 'time', intervalKm: 0, intervalMonths: 12, fixedDueMonth: 11, fixedDueDay: 30, lastServiceKm: 0, lastServiceDate: '2025-11-25', estimatedCost: '28000', category: 'Documentación / GNC', priority: 'high', isDocument: true, notes: 'Renovación anual obligatoria' },
        { name: 'VTV (Verificación Técnica)', trackingType: 'time', intervalKm: 0, intervalMonths: 12, fixedDueMonth: 11, fixedDueDay: 30, lastServiceKm: 0, lastServiceDate: '2025-11-25', estimatedCost: '44000', category: 'Documentación / Legal', priority: 'high', isDocument: true, notes: 'Vence cada Noviembre por patente' },
        { name: 'Cambio de Aceite y Filtros', trackingType: 'hybrid', intervalKm: 10000, intervalMonths: 12, lastServiceKm: 140000, lastServiceDate: '2026-05-10', estimatedCost: '95000', category: 'Motor / Service', priority: 'high', isDocument: false, notes: 'Aceite sintético + filtros' },
        { name: 'Impuesto de Patente', trackingType: 'time', intervalKm: 0, intervalMonths: 2, fixedDueMonth: null, fixedDueDay: 10, lastServiceKm: 0, lastServiceDate: '2026-07-10', estimatedCost: '38000', category: 'Impuestos / Patente', priority: 'high', isDocument: true, notes: 'Impuesto bimestral automotor' },
      ];

      for (const item of defaultMaintenance) {
        await db.insert(vehicleMaintenance).values({
          userId: finalUser.id,
          ...item,
        });
      }
    } else {
      // Actualizar datos de Google si no los tenía
      const updateData = {};
      if (!existingUser.googleId && profile.id) updateData.googleId = profile.id;
      if (!existingUser.avatarUrl && profile.picture) updateData.avatarUrl = profile.picture;

      if (Object.keys(updateData).length > 0) {
        await db.update(users).set(updateData).where(eq(users.id, existingUser.id));
      }
    }

    // 5. Generar token de sesión JWT y establecer cookie
    const token = await createSessionToken({
      id: finalUser.id,
      email: finalUser.email,
      name: finalUser.name,
      role: finalUser.role,
    });

    await setSessionCookie(token);

    return NextResponse.redirect(`${appUrl}/dashboard`);
  } catch (error) {
    console.error('Error en callback de Google OAuth:', error);
    return NextResponse.redirect(`${appUrl}/login?error=google_auth_failed`);
  }
}
