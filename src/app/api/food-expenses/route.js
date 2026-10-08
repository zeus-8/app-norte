import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { foodExpenses, households, householdMembers } from '@/db/schema.js';
import { eq, and, or, inArray, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth.js';
import { foodExpenseSchema } from '@/lib/validations.js';

export const dynamic = 'force-dynamic';

// GET: Obtener tickets de comida del mes
export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const targetMonth = searchParams.get('month') || new Date().toISOString().slice(0, 7);

    // 1. Obtener membresías de Hogar aceptadas para incluir tickets compartidos del hogar
    const memberships = await db
      .select({
        householdId: householdMembers.householdId,
        defaultSharePct: householdMembers.defaultSharePct,
      })
      .from(householdMembers)
      .where(
        and(
          eq(householdMembers.userId, user.id),
          eq(householdMembers.status, 'accepted')
        )
      );

    const householdMap = {};
    const householdIds = [];
    memberships.forEach(m => {
      householdMap[m.householdId] = Number(m.defaultSharePct) || 50;
      householdIds.push(m.householdId);
    });

    // 2. Consultar tickets personales y del hogar
    const conditions = [
      eq(foodExpenses.month, targetMonth),
      householdIds.length > 0
        ? or(
            eq(foodExpenses.userId, user.id),
            inArray(foodExpenses.householdId, householdIds)
          )
        : eq(foodExpenses.userId, user.id),
    ];

    const rawTickets = await db
      .select()
      .from(foodExpenses)
      .where(and(...conditions))
      .orderBy(desc(foodExpenses.date), desc(foodExpenses.createdAt));

    let totalRaw = 0;
    let totalUserShare = 0;
    const paymentBreakdown = {
      cash: 0,
      debit: 0,
      visa: 0,
      master: 0,
      transfer: 0,
      other: 0,
    };
    const storeBreakdown = {};

    const tickets = rawTickets.map(t => {
      const amount = Number(t.amount) || 0;
      const isOwner = t.userId === user.id;

      let userSharePct = 100;
      if (t.isShared) {
        if (t.householdId && householdMap[t.householdId] !== undefined) {
          userSharePct = householdMap[t.householdId];
        } else if (t.userSharePct !== null && t.userSharePct !== undefined) {
          userSharePct = isOwner ? Number(t.userSharePct) : (100 - Number(t.userSharePct));
        } else {
          userSharePct = 60;
        }
      }

      const userAmount = Math.round(amount * (userSharePct / 100));

      totalRaw += amount;
      totalUserShare += userAmount;

      // Desglose por medio de pago
      const method = (t.paymentMethod || '').toLowerCase();
      if (method.includes('efectivo')) paymentBreakdown.cash += amount;
      else if (method.includes('débito') || method.includes('debito')) paymentBreakdown.debit += amount;
      else if (method.includes('visa')) paymentBreakdown.visa += amount;
      else if (method.includes('master')) paymentBreakdown.master += amount;
      else if (method.includes('transfer')) paymentBreakdown.transfer += amount;
      else paymentBreakdown.other += amount;

      // Desglose por comercio
      const store = t.storeName || 'Otro';
      storeBreakdown[store] = (storeBreakdown[store] || 0) + amount;

      return {
        ...t,
        amount,
        userSharePct,
        userAmount,
        isOwner,
      };
    });

    return NextResponse.json({
      month: targetMonth,
      tickets,
      summary: {
        ticketsCount: tickets.length,
        totalRaw,
        totalUserShare,
        paymentBreakdown,
        storeBreakdown,
      },
    });
  } catch (error) {
    console.error('Error fetching food expenses:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Registrar nuevo ticket de comida
export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const validated = foodExpenseSchema.parse(body);

    const targetMonth = validated.month || validated.date.slice(0, 7);

    // Auto-asignación de householdId: si es compartido y no vino householdId, buscar el hogar activo
    let effectiveHouseholdId = validated.householdId || null;
    let effectiveUserSharePct = validated.userSharePct;

    if (validated.isShared && !effectiveHouseholdId) {
      const activeMembership = await db.query.householdMembers.findFirst({
        where: and(
          eq(householdMembers.userId, user.id),
          eq(householdMembers.status, 'accepted')
        ),
      });
      if (activeMembership) {
        effectiveHouseholdId = activeMembership.householdId;
        if (!effectiveUserSharePct || effectiveUserSharePct === 100) {
          effectiveUserSharePct = Number(activeMembership.defaultSharePct) || 60;
        }
      }
    }

    const [newTicket] = await db
      .insert(foodExpenses)
      .values({
        userId: user.id,
        householdId: effectiveHouseholdId,
        month: targetMonth,
        storeName: validated.storeName.trim(),
        amount: String(validated.amount),
        date: validated.date,
        paymentMethod: validated.paymentMethod,
        isShared: Boolean(validated.isShared || effectiveHouseholdId),
        userSharePct: String(effectiveUserSharePct),
        notes: validated.notes ? validated.notes.trim() : null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: 'Ticket de comida registrado con éxito',
      ticket: newTicket,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating food expense:', error);
    if (error.errors) {
      return NextResponse.json({ error: error.errors[0]?.message || 'Datos inválidos' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
