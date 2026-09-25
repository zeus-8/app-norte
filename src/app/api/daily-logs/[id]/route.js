import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { dailyLogs } from '@/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth.js';
import { syncUserOdometer } from '@/lib/odometer.js';

export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;
    await db.delete(dailyLogs).where(and(eq(dailyLogs.id, id), eq(dailyLogs.userId, user.id)));

    // Recalcular y restablecer el odómetro al valor anterior real
    const newOdometer = await syncUserOdometer(user.id);

    return NextResponse.json({ success: true, current_odometer: newOdometer });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
