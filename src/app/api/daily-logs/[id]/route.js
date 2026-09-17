import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { dailyLogs } from '@/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth.js';

export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = params;
    await db.delete(dailyLogs).where(and(eq(dailyLogs.id, id), eq(dailyLogs.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
