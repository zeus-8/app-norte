import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { expensePayments } from '@/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

    const payments = await db
      .select()
      .from(expensePayments)
      .where(
        and(
          eq(expensePayments.userId, sessionUser.id),
          eq(expensePayments.month, month)
        )
      );

    const paymentsMap = {};
    payments.forEach(p => {
      paymentsMap[p.expenseId] = {
        isPaid: Boolean(p.isPaid),
        paidAt: p.paidAt,
        notes: p.notes,
      };
    });

    return NextResponse.json({
      month,
      payments: paymentsMap,
    });
  } catch (error) {
    console.error('Error al obtener checklist de pagos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { expenseId, month, isPaid, notes } = body;

    if (!expenseId || !month) {
      return NextResponse.json({ error: 'expenseId y month son requeridos' }, { status: 400 });
    }

    const newPaidStatus = Boolean(isPaid);
    const paidAt = newPaidStatus ? new Date() : null;

    // Verificar si ya existe el registro
    const [existing] = await db
      .select()
      .from(expensePayments)
      .where(
        and(
          eq(expensePayments.expenseId, expenseId),
          eq(expensePayments.userId, sessionUser.id),
          eq(expensePayments.month, month)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(expensePayments)
        .set({
          isPaid: newPaidStatus,
          paidAt,
          notes: notes || existing.notes,
          updatedAt: new Date(),
        })
        .where(eq(expensePayments.id, existing.id));
    } else {
      await db.insert(expensePayments).values({
        expenseId,
        userId: sessionUser.id,
        month,
        isPaid: newPaidStatus,
        paidAt,
        notes: notes || null,
      });
    }

    return NextResponse.json({
      success: true,
      expenseId,
      month,
      isPaid: newPaidStatus,
      paidAt,
    });
  } catch (error) {
    console.error('Error al actualizar estado de pago:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
