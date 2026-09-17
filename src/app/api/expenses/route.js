import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { expenses, households, householdMembers, expensePayments } from '@/db/schema.js';
import { eq, and, ne, or, inArray, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth.js';
import { expenseSchema } from '@/lib/validations.js';

export const dynamic = 'force-dynamic';

function getMonthDiff(startStr, currentStr) {
  const [startY, startM] = startStr.split('-').map(Number);
  const [currY, currM] = currentStr.split('-').map(Number);
  return (currY - startY) * 12 + (currM - startM);
}

function addMonths(startStr, count) {
  const [year, month] = startStr.split('-').map(Number);
  const date = new Date(year, month - 1 + count, 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// GET: Obtener gastos activos y proyectados para un mes (ej: ?month=2026-03)
export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const targetMonth = searchParams.get('month') || new Date().toISOString().slice(0, 7);

    // 1. Obtener membresías de Hogar aceptadas
    const memberships = await db
      .select({
        householdId: householdMembers.householdId,
        defaultSharePct: householdMembers.defaultSharePct,
        householdName: households.name,
      })
      .from(householdMembers)
      .leftJoin(households, eq(householdMembers.householdId, households.id))
      .where(
        and(
          eq(householdMembers.userId, user.id),
          eq(householdMembers.status, 'accepted')
        )
      );

    const householdMap = {};
    const householdIds = [];
    memberships.forEach(m => {
      householdMap[m.householdId] = {
        pct: Number(m.defaultSharePct) || 50,
        name: m.householdName || 'Hogar Compartido',
      };
      householdIds.push(m.householdId);
    });

    // 2. Obtener gastos personales y compartidos
    let allExpenses = [];
    if (householdIds.length > 0) {
      allExpenses = await db.query.expenses.findMany({
        where: and(
          ne(expenses.status, 'cancelled'),
          or(
            eq(expenses.userId, user.id),
            inArray(expenses.householdId, householdIds)
          )
        ),
        orderBy: (expenses, { desc }) => [desc(expenses.createdAt)],
      });
    } else {
      allExpenses = await db.query.expenses.findMany({
        where: and(
          eq(expenses.userId, user.id),
          ne(expenses.status, 'cancelled')
        ),
        orderBy: (expenses, { desc }) => [desc(expenses.createdAt)],
      });
    }

    // 3. Obtener checklist de pagos del usuario para este mes
    const payments = await db
      .select()
      .from(expensePayments)
      .where(
        and(
          eq(expensePayments.userId, user.id),
          eq(expensePayments.month, targetMonth)
        )
      );

    const paymentsMap = {};
    payments.forEach(p => {
      paymentsMap[p.expenseId] = {
        isPaid: Boolean(p.isPaid),
        paidAt: p.paidAt,
      };
    });

    const activeInMonth = [];
    let totalUserFixed = 0;
    let totalUserInstallments = 0;
    let totalUserOneTime = 0;
    let totalHouseholdAll = 0;
    let totalPaidAmount = 0;

    for (const exp of allExpenses) {
      let isApplicable = false;
      let currentInstallmentNum = 1;
      let totalInstallments = exp.installmentCount || 1;

      if (exp.type === 'fixed') {
        if (targetMonth >= exp.startMonth && (!exp.endMonth || targetMonth <= exp.endMonth)) {
          isApplicable = true;
        }
      } else if (exp.type === 'one_time') {
        if (targetMonth === exp.startMonth) isApplicable = true;
      } else if (exp.type === 'installment') {
        const diffMonths = getMonthDiff(exp.startMonth, targetMonth);
        if (diffMonths >= 0 && diffMonths < exp.installmentCount) {
          isApplicable = true;
          currentInstallmentNum = diffMonths + 1;
        }
      }

      if (isApplicable) {
        const monthlyAmount = Number(exp.installmentAmount) || 0;
        
        // Calcular porcentaje del usuario
        let userPct = 100;
        let householdName = null;

        if (exp.householdId && householdMap[exp.householdId]) {
          userPct = householdMap[exp.householdId].pct;
          householdName = householdMap[exp.householdId].name;
        } else if (exp.isShared && exp.userSharePct !== null && exp.userSharePct !== undefined) {
          userPct = Number(exp.userSharePct);
        }

        const userAmount = Math.round(monthlyAmount * (userPct / 100));
        const otherAmount = monthlyAmount - userAmount;
        const isPaid = Boolean(paymentsMap[exp.id]?.isPaid);
        const paidAt = paymentsMap[exp.id]?.paidAt || null;

        if (exp.isShared || exp.householdId) {
          totalHouseholdAll += monthlyAmount;
        }

        if (exp.type === 'fixed') {
          totalUserFixed += userAmount;
        } else if (exp.type === 'installment') {
          totalUserInstallments += userAmount;
        } else {
          totalUserOneTime += userAmount;
        }

        if (isPaid) {
          totalPaidAmount += userAmount;
        }

        activeInMonth.push({
          ...exp,
          monthly_amount: monthlyAmount,
          user_amount: userAmount,
          other_amount: otherAmount,
          user_share_pct: userPct,
          is_household: Boolean(exp.householdId),
          household_name: householdName,
          is_paid: isPaid,
          paid_at: paidAt,
          current_installment_num: currentInstallmentNum,
          total_installments: totalInstallments,
          installments_remaining: totalInstallments - currentInstallmentNum + 1,
        });
      }
    }

    const totalUserMonthlyTarget = totalUserFixed + totalUserInstallments + totalUserOneTime;
    const totalPendingAmount = Math.max(0, totalUserMonthlyTarget - totalPaidAmount);
    const paidPercentage = totalUserMonthlyTarget > 0 ? Math.round((totalPaidAmount / totalUserMonthlyTarget) * 100) : 100;

    return NextResponse.json({
      month: targetMonth,
      expenses: activeInMonth,
      summary: {
        totalUserFixed,
        totalUserInstallments,
        totalUserOneTime,
        totalUserMonthlyTarget,
        totalHouseholdAll,
        totalPaidAmount,
        totalPendingAmount,
        paidPercentage,
      },
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Crear nuevo gasto (Fijo, Único o en Cuotas)
export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const validation = expenseSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.errors[0]?.message || 'Datos de gasto inválidos';
      return NextResponse.json({ error: firstError, details: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, category, type, totalAmount, installmentCount, startMonth, householdId, isShared, userSharePct, paymentMethod, notes } = validation.data;
    const count = type === 'installment' ? Math.max(1, installmentCount) : 1;
    const instAmount = (totalAmount / count);

    let endMonth = null;
    if (type === 'installment') {
      endMonth = addMonths(startMonth, count - 1);
    } else if (type === 'one_time') {
      endMonth = startMonth;
    }

    const [newExp] = await db.insert(expenses).values({
      userId: user.id,
      householdId: householdId || null,
      name,
      category,
      type,
      totalAmount: String(totalAmount),
      installmentCount: count,
      installmentAmount: String(instAmount.toFixed(2)),
      startMonth,
      endMonth,
      isShared: Boolean(isShared || householdId),
      userSharePct: String(userSharePct),
      paymentMethod,
      status: 'active',
      notes,
    }).returning();

    return NextResponse.json({ success: true, id: newExp.id, message: 'Gasto creado correctamente' });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

