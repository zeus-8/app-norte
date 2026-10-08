import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { foodBudgetSettings, foodExpenses, expenses, householdMembers } from '@/db/schema.js';
import { eq, and, or, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth.js';
import { foodBudgetSchema } from '@/lib/validations.js';

export const dynamic = 'force-dynamic';

// GET: Obtener configuración de presupuesto de comida del mes
export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const targetMonth = searchParams.get('month') || new Date().toISOString().slice(0, 7);

    // 1. Buscar configuración guardada
    const budget = await db.query.foodBudgetSettings.findFirst({
      where: and(
        eq(foodBudgetSettings.userId, user.id),
        eq(foodBudgetSettings.month, targetMonth)
      ),
    });

    // 1.1 Buscar gasto de comida preexistente en la tabla general de expenses para unificar
    const existingExpense = await db.query.expenses.findFirst({
      where: and(
        eq(expenses.userId, user.id),
        ne(expenses.status, 'cancelled'),
        or(
          eq(expenses.category, 'Comida / Supermercado'),
          sql`LOWER(${expenses.name}) LIKE '%comida%'`,
          sql`LOWER(${expenses.name}) LIKE '%supermercado%'`
        )
      ),
    });

    // 2. Consultar suma de tickets de comida registrados en el mes
    const tickets = await db.query.foodExpenses.findMany({
      where: and(
        eq(foodExpenses.userId, user.id),
        eq(foodExpenses.month, targetMonth)
      ),
    });

    let totalTicketsRaw = 0;
    let totalTicketsUserShare = 0;
    tickets.forEach(t => {
      const amt = Number(t.amount) || 0;
      totalTicketsRaw += amt;
      const pct = t.isShared ? (Number(t.userSharePct) || 60) : 100;
      totalTicketsUserShare += Math.round(amt * (pct / 100));
    });

    // Si no hay foodBudgetSettings aún, tomar el gasto existente de comida como base
    const defaultMonthlyBudget = existingExpense
      ? (Number(existingExpense.installmentAmount) || Number(existingExpense.totalAmount) || 0)
      : 0;
    const defaultUserSharePct = existingExpense
      ? (Number(existingExpense.userSharePct) || 60)
      : 60;
    const defaultIsShared = existingExpense ? Boolean(existingExpense.isShared) : true;

    const monthlyBudget = budget ? Number(budget.monthlyBudget) : defaultMonthlyBudget;
    const budgetType = budget ? budget.budgetType : 'hybrid';
    const isShared = budget ? budget.isShared : defaultIsShared;
    const userSharePct = budget ? Number(budget.userSharePct) : defaultUserSharePct;
    const userMonthlyBudget = Math.round(monthlyBudget * (userSharePct / 100));

    // Determinar qué valor computa en las finanzas del mes:
    // - budget_only: el monto presupuestado
    // - tickets_only: la suma real de tickets
    // - hybrid: si hay presupuesto > 0, se compara contra los tickets (se toma el presupuesto como compromiso base, o los tickets si se excedió)
    let effectiveFoodCost = 0;
    let effectiveUserFoodCost = 0;
    if (budgetType === 'tickets_only') {
      effectiveFoodCost = totalTicketsRaw;
      effectiveUserFoodCost = totalTicketsUserShare;
    } else if (budgetType === 'budget_only') {
      effectiveFoodCost = monthlyBudget;
      effectiveUserFoodCost = userMonthlyBudget;
    } else {
      // hybrid
      effectiveFoodCost = monthlyBudget > 0 ? Math.max(monthlyBudget, totalTicketsRaw) : totalTicketsRaw;
      effectiveUserFoodCost = monthlyBudget > 0 ? Math.max(userMonthlyBudget, totalTicketsUserShare) : totalTicketsUserShare;
    }

    const remainingBudget = Math.max(0, monthlyBudget - totalTicketsRaw);
    const surplusSpent = Math.max(0, totalTicketsRaw - monthlyBudget);
    const pctSpent = monthlyBudget > 0 ? Math.round((totalTicketsRaw / monthlyBudget) * 100) : 0;

    return NextResponse.json({
      month: targetMonth,
      budget: {
        id: budget?.id || null,
        budgetType,
        monthlyBudget,
        userMonthlyBudget,
        isShared,
        userSharePct,
      },
      tracking: {
        ticketsCount: tickets.length,
        totalTicketsRaw,
        totalTicketsUserShare,
        remainingBudget,
        surplusSpent,
        pctSpent,
        isExceeded: monthlyBudget > 0 && totalTicketsRaw > monthlyBudget,
        effectiveFoodCost,
        effectiveUserFoodCost,
      },
    });
  } catch (error) {
    console.error('Error fetching food budget:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Crear o actualizar presupuesto de comida (upsert)
export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const validated = foodBudgetSchema.parse(body);

    const existing = await db.query.foodBudgetSettings.findFirst({
      where: and(
        eq(foodBudgetSettings.userId, user.id),
        eq(foodBudgetSettings.month, validated.month)
      ),
    });

    let result;
    if (existing) {
      const [updated] = await db
        .update(foodBudgetSettings)
        .set({
          budgetType: validated.budgetType,
          monthlyBudget: String(validated.monthlyBudget),
          isShared: validated.isShared,
          userSharePct: String(validated.userSharePct),
          updatedAt: new Date(),
        })
        .where(eq(foodBudgetSettings.id, existing.id))
        .returning();
      result = updated;
    } else {
      const [inserted] = await db
        .insert(foodBudgetSettings)
        .values({
          userId: user.id,
          month: validated.month,
          budgetType: validated.budgetType,
          monthlyBudget: String(validated.monthlyBudget),
          isShared: validated.isShared,
          userSharePct: String(validated.userSharePct),
        })
        .returning();
      result = inserted;
    }

    // Sincronizar en tiempo real con el gasto de comida en la tabla general expenses
    const existingExpense = await db.query.expenses.findFirst({
      where: and(
        eq(expenses.userId, user.id),
        ne(expenses.status, 'cancelled'),
        or(
          eq(expenses.category, 'Comida / Supermercado'),
          sql`LOWER(${expenses.name}) LIKE '%comida%'`,
          sql`LOWER(${expenses.name}) LIKE '%supermercado%'`
        )
      ),
    });

    if (existingExpense) {
      await db
        .update(expenses)
        .set({
          totalAmount: String(validated.monthlyBudget),
          installmentAmount: String(validated.monthlyBudget),
          isShared: validated.isShared,
          userSharePct: String(validated.userSharePct),
          updatedAt: new Date(),
        })
        .where(eq(expenses.id, existingExpense.id));
    }

    return NextResponse.json({
      success: true,
      message: 'Presupuesto de comida configurado y sincronizado con éxito',
      budget: result,
      syncedWithExpense: Boolean(existingExpense),
    });
  } catch (error) {
    console.error('Error saving food budget:', error);
    if (error.errors) {
      return NextResponse.json({ error: error.errors[0]?.message || 'Datos inválidos' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
