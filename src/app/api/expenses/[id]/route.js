import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { expenses, householdMembers } from '@/db/schema.js';
import { eq, and, or, inArray } from 'drizzle-orm';
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

    const { id } = await params;
    const body = await request.json();
    const validation = expenseSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.errors[0]?.message || 'Datos de gasto inválidos';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { name, category, type, totalAmount, installmentCount, startMonth, dueDay = 5, householdId, isShared, userSharePct, paymentMethod, notes } = validation.data;
    const count = type === 'installment' ? Math.max(1, installmentCount) : 1;
    const instAmount = (totalAmount / count);

    let endMonth = null;
    if (type === 'installment') {
      endMonth = addMonths(startMonth, count - 1);
    } else if (type === 'one_time') {
      endMonth = startMonth;
    }

    // Obtener membresías aceptadas del usuario
    const memberships = await db.query.householdMembers.findMany({
      where: and(
        eq(householdMembers.userId, user.id),
        eq(householdMembers.status, 'accepted')
      ),
    });
    const householdIds = memberships.map(m => m.householdId);

    // Auto-asignar householdId si es compartido y no vino
    let effectiveHouseholdId = householdId || null;
    if (isShared && !effectiveHouseholdId && householdIds.length > 0) {
      effectiveHouseholdId = householdIds[0];
    }

    // Permitir editar si es el creador o si pertenece al mismo hogar
    const canEditCondition = householdIds.length > 0
      ? or(eq(expenses.userId, user.id), inArray(expenses.householdId, householdIds))
      : eq(expenses.userId, user.id);

    const [updated] = await db.update(expenses).set({
      householdId: effectiveHouseholdId,
      name,
      category,
      type,
      totalAmount: String(totalAmount),
      installmentCount: count,
      installmentAmount: String(instAmount.toFixed(2)),
      startMonth,
      endMonth,
      dueDay: Number(dueDay) || 5,
      isShared: Boolean(isShared || effectiveHouseholdId),
      userSharePct: String(userSharePct),
      paymentMethod,
      notes,
      updatedAt: new Date(),
    }).where(and(eq(expenses.id, id), canEditCondition)).returning();

    if (!updated) {
      return NextResponse.json({ error: 'Gasto no encontrado o sin permisos' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Gasto actualizado correctamente' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;

    const memberships = await db.query.householdMembers.findMany({
      where: and(
        eq(householdMembers.userId, user.id),
        eq(householdMembers.status, 'accepted')
      ),
    });
    const householdIds = memberships.map(m => m.householdId);

    const canDeleteCondition = householdIds.length > 0
      ? or(eq(expenses.userId, user.id), inArray(expenses.householdId, householdIds))
      : eq(expenses.userId, user.id);

    await db.delete(expenses).where(and(eq(expenses.id, id), canDeleteCondition));

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
