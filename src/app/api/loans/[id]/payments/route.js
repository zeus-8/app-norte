import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { loans, loanPayments } from '@/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth.js';

export const dynamic = 'force-dynamic';

// POST — Registrar un pago/adelanto sobre un préstamo
export async function POST(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id: loanId } = await params;
    const body = await request.json();
    const { amount, date, notes } = body;

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: 'El monto del pago debe ser mayor a 0' }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ error: 'La fecha del pago es requerida' }, { status: 400 });
    }

    // Verificar que el préstamo pertenece al usuario
    const loan = await db.query.loans.findFirst({
      where: and(eq(loans.id, loanId), eq(loans.userId, user.id)),
      with: { payments: true },
    });
    if (!loan) return NextResponse.json({ error: 'Préstamo no encontrado' }, { status: 404 });

    // Calcular saldo antes del pago
    const totalPaid = loan.payments.reduce((s, p) => s + Number(p.amount), 0);
    const balance = Math.max(0, Number(loan.totalAmount) - totalPaid);
    if (balance === 0) {
      return NextResponse.json({ error: 'Este préstamo ya está saldo' }, { status: 400 });
    }

    const month = date.slice(0, 7); // "YYYY-MM"
    const payAmount = Math.min(Number(amount), balance); // No pagar más del saldo

    const [newPayment] = await db.insert(loanPayments).values({
      loanId,
      userId: user.id,
      amount: String(payAmount),
      date,
      month,
      notes: notes?.trim() || null,
    }).returning();

    // Si el saldo queda en 0, marcar préstamo como pagado
    const newBalance = balance - payAmount;
    if (newBalance === 0) {
      await db.update(loans).set({ status: 'paid', updatedAt: new Date() })
        .where(eq(loans.id, loanId));
    }

    return NextResponse.json({
      success: true,
      id: newPayment.id,
      paidAmount: payAmount,
      newBalance,
      loanPaid: newBalance === 0,
      message: newBalance === 0
        ? '🎉 ¡Préstamo saldado completamente!'
        : `Pago registrado. Saldo restante: $${Math.round(newBalance).toLocaleString()}`,
    });
  } catch (error) {
    console.error('Error registering loan payment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — Eliminar un pago específico
export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id: loanId } = await params;
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');

    if (!paymentId) return NextResponse.json({ error: 'paymentId requerido' }, { status: 400 });

    await db.delete(loanPayments).where(
      and(eq(loanPayments.id, paymentId), eq(loanPayments.userId, user.id))
    );

    // Si el préstamo estaba marcado como pagado, reactivarlo
    await db.update(loans).set({ status: 'active', updatedAt: new Date() })
      .where(and(eq(loans.id, loanId), eq(loans.userId, user.id), eq(loans.status, 'paid')));

    return NextResponse.json({ success: true, message: 'Pago eliminado' });
  } catch (error) {
    console.error('Error deleting loan payment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
