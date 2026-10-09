import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { loans, loanPayments } from '@/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth.js';

export const dynamic = 'force-dynamic';

// GET — Todos los préstamos activos del usuario con sus pagos
export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const allLoans = await db.query.loans.findMany({
      where: eq(loans.userId, user.id),
      with: {
        payments: {
          orderBy: (p, { desc }) => [desc(p.date)],
        },
      },
      orderBy: [desc(loans.createdAt)],
    });

    // Calcular saldo restante para cada préstamo
    const loansWithBalance = allLoans.map(loan => {
      const totalPaid = loan.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const totalAmount = Number(loan.totalAmount);
      const balance = Math.max(0, totalAmount - totalPaid);
      const progressPct = totalAmount > 0 ? Math.min(100, Math.round((totalPaid / totalAmount) * 100)) : 0;

      return {
        ...loan,
        totalAmount,
        scheduledAmount: Number(loan.scheduledAmount),
        totalPaid,
        balance,
        progressPct,
        isPaidOff: balance === 0,
      };
    });

    return NextResponse.json(loansWithBalance);
  } catch (error) {
    console.error('Error fetching loans:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — Crear nuevo préstamo
export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const { lenderName, totalAmount, startDate, scheduledFrequency, scheduledAmount, notes } = body;

    if (!lenderName?.trim()) return NextResponse.json({ error: 'El nombre del prestamista es requerido' }, { status: 400 });
    if (!totalAmount || Number(totalAmount) <= 0) return NextResponse.json({ error: 'El monto debe ser mayor a 0' }, { status: 400 });
    if (!startDate) return NextResponse.json({ error: 'La fecha de inicio es requerida' }, { status: 400 });

    const [newLoan] = await db.insert(loans).values({
      userId: user.id,
      lenderName: lenderName.trim(),
      totalAmount: String(Number(totalAmount)),
      startDate,
      scheduledFrequency: scheduledFrequency || 'monthly',
      scheduledAmount: String(Number(scheduledAmount) || 0),
      status: 'active',
      notes: notes?.trim() || null,
    }).returning();

    return NextResponse.json({ success: true, id: newLoan.id, message: 'Préstamo registrado correctamente' });
  } catch (error) {
    console.error('Error creating loan:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
