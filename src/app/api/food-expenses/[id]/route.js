import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { foodExpenses } from '@/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth.js';
import { foodExpenseSchema } from '@/lib/validations.js';

export const dynamic = 'force-dynamic';

// PUT: Actualizar un ticket de comida
export async function PUT(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const body = await request.json();
    const validated = foodExpenseSchema.parse(body);

    const existing = await db.query.foodExpenses.findFirst({
      where: and(eq(foodExpenses.id, id), eq(foodExpenses.userId, user.id)),
    });

    if (!existing) {
      return NextResponse.json({ error: 'Ticket no encontrado o no tienes permisos para editarlo' }, { status: 404 });
    }

    const targetMonth = validated.month || validated.date.slice(0, 7);

    let effectiveHouseholdId = validated.householdId !== undefined ? validated.householdId : existing.householdId;
    if (validated.isShared && !effectiveHouseholdId) {
      const activeMembership = await db.query.householdMembers.findFirst({
        where: and(
          eq(householdMembers.userId, user.id),
          eq(householdMembers.status, 'accepted')
        ),
      });
      if (activeMembership) effectiveHouseholdId = activeMembership.householdId;
    }

    const [updated] = await db
      .update(foodExpenses)
      .set({
        householdId: effectiveHouseholdId,
        month: targetMonth,
        storeName: validated.storeName.trim(),
        amount: String(validated.amount),
        date: validated.date,
        paymentMethod: validated.paymentMethod,
        isShared: Boolean(validated.isShared || effectiveHouseholdId),
        userSharePct: String(validated.userSharePct),
        notes: validated.notes !== undefined ? (validated.notes ? validated.notes.trim() : null) : existing.notes,
        updatedAt: new Date(),
      })
      .where(and(eq(foodExpenses.id, id), eq(foodExpenses.userId, user.id)))
      .returning();

    return NextResponse.json({
      success: true,
      message: 'Ticket de comida actualizado con éxito',
      ticket: updated,
    });
  } catch (error) {
    console.error('Error updating food expense:', error);
    if (error.errors) {
      return NextResponse.json({ error: error.errors[0]?.message || 'Datos inválidos' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Eliminar un ticket de comida
export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const existing = await db.query.foodExpenses.findFirst({
      where: and(eq(foodExpenses.id, id), eq(foodExpenses.userId, user.id)),
    });

    if (!existing) {
      return NextResponse.json({ error: 'Ticket no encontrado o no tienes permisos para eliminarlo' }, { status: 404 });
    }

    await db
      .delete(foodExpenses)
      .where(and(eq(foodExpenses.id, id), eq(foodExpenses.userId, user.id)));

    return NextResponse.json({
      success: true,
      message: 'Ticket de comida eliminado con éxito',
    });
  } catch (error) {
    console.error('Error deleting food expense:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
