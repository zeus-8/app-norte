import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { cashReconciliations } from '@/db/schema.js';
import { getCurrentUser } from '@/lib/auth.js';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;

    const result = await db.delete(cashReconciliations)
      .where(and(eq(cashReconciliations.id, id), eq(cashReconciliations.userId, user.id)))
      .returning();

    if (!result.length) {
      return NextResponse.json({ error: 'Arqueo no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Arqueo de caja eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar arqueo:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
