import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { userSettings } from '@/db/schema.js';
import { getCurrentUser } from '@/lib/auth.js';

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const km = Number(body.odometer_km || body.odometerKm);

    if (!km || km <= 0) {
      return NextResponse.json({ error: 'Kilometraje inválido' }, { status: 400 });
    }

    await db.insert(userSettings).values({
      userId: user.id,
      key: 'current_odometer',
      value: String(km),
    }).onConflictDoUpdate({
      target: [userSettings.userId, userSettings.key],
      set: { value: String(km), updatedAt: new Date() },
    });

    return NextResponse.json({ success: true, current_odometer: km });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
