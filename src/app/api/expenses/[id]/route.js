import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { expenses } from '@/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth.js';
import { expenseSchema } from '@/lib/validations.js';

function addMonths(startStr, count) {
  const [year, month] = startStr.split('-').map(Number);
  const date = new Date(year, month - 1 + count, 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export async function PUT(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = params;
    const body = await request.json();
    const validation = expenseSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.errors[0]?.message || 'Datos de gasto inválidos';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { name, category, type, totalAmount, installmentCount, startMonth, isShared, userSharePct, paymentMethod, notes } = validation.data;
    const count = type === 'installment' ? Math.max(1, installmentCount) : 1;
    const instAmount = (totalAmount / count);

    let endMonth = null;
    if (type === 'installment') {
      endMonth = addMonths(startMonth, count - 1);
    } else if (type === 'one_time') {
      endMonth = startMonth;
    }

    await db.update(expenses).set({
      name,
      category,
      type,
      totalAmount: String(totalAmount),
      installmentCount: count,
      installmentAmount: String(instAmount.toFixed(2)),
      startMonth,
      endMonth,
      isShared,
      userSharePct: String(userSharePct),
      paymentMethod,
      notes,
      updatedAt: new Date(),
    }).where(and(eq(expenses.id, id), eq(expenses.userId, user.id)));

    return NextResponse.json({ success: true, message: 'Gasto actualizado correctamente' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = params;
    await db.delete(expenses).where(and(eq(expenses.id, id), eq(expenses.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
