import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { loans } from '@/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth.js';

export const dynamic = 'force-dynamic';

// PUT — Editar préstamo
export async function PUT(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { lenderName, totalAmount, startDate, scheduledFrequency, scheduledAmount, status, notes } = body;

    const existing = await db.query.loans.findFirst({
      where: and(eq(loans.id, id), eq(loans.userId, user.id)),
    });
    if (!existing) return NextResponse.json({ error: 'Préstamo no encontrado' }, { status: 404 });

    await db.update(loans).set({
      lenderName: lenderName?.trim() || existing.lenderName,
      totalAmount: totalAmount ? String(Number(totalAmount)) : existing.totalAmount,
      startDate: startDate || existing.startDate,
      scheduledFrequency: scheduledFrequency || existing.scheduledFrequency,
      scheduledAmount: scheduledAmount !== undefined ? String(Number(scheduledAmount)) : existing.scheduledAmount,
      status: status || existing.status,
      notes: notes !== undefined ? (notes?.trim() || null) : existing.notes,
      updatedAt: new Date(),
    }).where(and(eq(loans.id, id), eq(loans.userId, user.id)));

    return NextResponse.json({ success: true, message: 'Préstamo actualizado' });
  } catch (error) {
    console.error('Error updating loan:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — Cancelar préstamo
export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;

    const existing = await db.query.loans.findFirst({
      where: and(eq(loans.id, id), eq(loans.userId, user.id)),
    });
    if (!existing) return NextResponse.json({ error: 'Préstamo no encontrado' }, { status: 404 });

    await db.update(loans).set({
      status: 'cancelled',
      updatedAt: new Date(),
    }).where(and(eq(loans.id, id), eq(loans.userId, user.id)));

    return NextResponse.json({ success: true, message: 'Préstamo cancelado' });
  } catch (error) {
    console.error('Error cancelling loan:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
