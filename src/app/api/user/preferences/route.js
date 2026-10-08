import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { users, userSettings } from '@/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const cycleSetting = await db.query.userSettings.findFirst({
      where: and(
        eq(userSettings.userId, user.id),
        eq(userSettings.key, 'billing_cycle_start_day')
      ),
    });

    return NextResponse.json({
      themePreference: user.themePreference,
      driverType: user.driverType,
      activeApps: user.activeApps,
      telegramChatId: user.telegramChatId,
      telegramAlertDays: user.telegramAlertDays,
      telegramEnabled: user.telegramEnabled,
      billingCycleStartDay: cycleSetting ? parseInt(cycleSetting.value, 10) : 1,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const { 
      themePreference, 
      telegramChatId, 
      telegramAlertDays, 
      telegramEnabled, 
      driverType, 
      activeApps,
      billingCycleStartDay 
    } = body;

    const updates = {};
    if (themePreference) updates.themePreference = themePreference;
    if (telegramChatId !== undefined) updates.telegramChatId = telegramChatId;
    if (telegramAlertDays !== undefined) updates.telegramAlertDays = Number(telegramAlertDays);
    if (telegramEnabled !== undefined) updates.telegramEnabled = Boolean(telegramEnabled);
    if (driverType) updates.driverType = driverType;
    if (activeApps) updates.activeApps = activeApps;
    updates.updatedAt = new Date();

    await db.update(users).set(updates).where(eq(users.id, user.id));

    if (billingCycleStartDay !== undefined) {
      const dayVal = String(Math.min(28, Math.max(1, parseInt(billingCycleStartDay, 10) || 1)));
      const existing = await db.query.userSettings.findFirst({
        where: and(
          eq(userSettings.userId, user.id),
          eq(userSettings.key, 'billing_cycle_start_day')
        ),
      });

      if (existing) {
        await db
          .update(userSettings)
          .set({ value: dayVal, updatedAt: new Date() })
          .where(eq(userSettings.id, existing.id));
      } else {
        await db.insert(userSettings).values({
          userId: user.id,
          key: 'billing_cycle_start_day',
          value: dayVal,
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Preferencias actualizadas' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

