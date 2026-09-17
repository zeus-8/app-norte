import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { users } from '@/db/schema.js';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth.js';

export async function PATCH(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const { themePreference, telegramChatId, telegramAlertDays, telegramEnabled, driverType, activeApps } = body;

    const updates = {};
    if (themePreference) updates.themePreference = themePreference;
    if (telegramChatId !== undefined) updates.telegramChatId = telegramChatId;
    if (telegramAlertDays !== undefined) updates.telegramAlertDays = Number(telegramAlertDays);
    if (telegramEnabled !== undefined) updates.telegramEnabled = Boolean(telegramEnabled);
    if (driverType) updates.driverType = driverType;
    if (activeApps) updates.activeApps = activeApps;
    updates.updatedAt = new Date();

    await db.update(users).set(updates).where(eq(users.id, user.id));

    return NextResponse.json({ success: true, message: 'Preferencias actualizadas' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
