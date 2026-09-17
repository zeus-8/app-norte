import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { expenses } from '@/db/schema.js';
import { eq, and, ne } from 'drizzle-orm';
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

    const allExpenses = await db.query.expenses.findMany({
      where: and(
        eq(expenses.userId, user.id),
        ne(expenses.status, 'cancelled')
      ),
      orderBy: (expenses, { desc }) => [desc(expenses.createdAt)],
    });

    const activeInMonth = [];
    let totalUserFixed = 0;
    let totalUserInstallments = 0;
    let totalUserOneTime = 0;
    let totalHouseholdAll = 0;

    for (const exp of allExpenses) {
      let isApplicable = false;
      let currentInstallmentNum = 1;
      let totalInstallments = exp.installmentCount || 1;

      if (exp.type === 'fixed') {
        if (targetMonth >= exp.startMonth) isApplicable = true;
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
        const userPct = exp.userSharePct !== null && exp.userSharePct !== undefined ? Number(exp.userSharePct) : 100;
        const userAmount = Math.round(monthlyAmount * (userPct / 100));
        const otherAmount = monthlyAmount - userAmount;

        if (exp.isShared) {
          totalHouseholdAll += monthlyAmount;
        }

        if (exp.type === 'fixed') {
          totalUserFixed += userAmount;
        } else if (exp.type === 'installment') {
          totalUserInstallments += userAmount;
        } else {
          totalUserOneTime += userAmount;
        }

        activeInMonth.push({
          ...exp,
          monthly_amount: monthlyAmount,
          user_amount: userAmount,
          other_amount: otherAmount,
          current_installment_num: currentInstallmentNum,
          total_installments: totalInstallments,
          installments_remaining: totalInstallments - currentInstallmentNum + 1,
        });
      }
    }

    const totalUserMonthlyTarget = totalUserFixed + totalUserInstallments + totalUserOneTime;

    return NextResponse.json({
      month: targetMonth,
      expenses: activeInMonth,
      summary: {
        totalUserFixed,
        totalUserInstallments,
        totalUserOneTime,
        totalUserMonthlyTarget,
        totalHouseholdAll,
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

    const { name, category, type, totalAmount, installmentCount, startMonth, isShared, userSharePct, paymentMethod, notes } = validation.data;
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
      status: 'active',
      notes,
    }).returning();

    return NextResponse.json({ success: true, id: newExp.id, message: 'Gasto creado correctamente' });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
