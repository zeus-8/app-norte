import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { expenses } from '@/db/schema.js';
import { eq, and, ne } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth.js';

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

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const startMonth = searchParams.get('start_month') || new Date().toISOString().slice(0, 7);
    const monthsCount = parseInt(searchParams.get('months') || '12', 10);

    const allExpenses = await db.query.expenses.findMany({
      where: and(
        eq(expenses.userId, user.id),
        ne(expenses.status, 'cancelled')
      ),
    });

    const projections = [];

    for (let i = 0; i < monthsCount; i++) {
      const monthStr = addMonths(startMonth, i);
      let userFixed = 0;
      let userInstallments = 0;
      let userOneTime = 0;
      const activeInstallmentsList = [];

      for (const exp of allExpenses) {
        let isApplicable = false;
        let currentInstNum = 1;

        if (exp.type === 'fixed' && monthStr >= exp.startMonth) {
          isApplicable = true;
        } else if (exp.type === 'one_time' && monthStr === exp.startMonth) {
          isApplicable = true;
        } else if (exp.type === 'installment') {
          const diff = getMonthDiff(exp.startMonth, monthStr);
          if (diff >= 0 && diff < exp.installmentCount) {
            isApplicable = true;
            currentInstNum = diff + 1;
          }
        }

        if (isApplicable) {
          const monthlyAmount = Number(exp.installmentAmount) || 0;
          const userPct = exp.userSharePct !== null && exp.userSharePct !== undefined ? Number(exp.userSharePct) : 100;
          const share = Math.round(monthlyAmount * (userPct / 100));

          if (exp.type === 'fixed') {
            userFixed += share;
          } else if (exp.type === 'installment') {
            userInstallments += share;
            activeInstallmentsList.push({
              id: exp.id,
              name: exp.name,
              payment_method: exp.paymentMethod,
              current_num: currentInstNum,
              total_count: exp.installmentCount,
              monthly_amount: monthlyAmount,
              is_last_installment: currentInstNum === exp.installmentCount,
            });
          } else {
            userOneTime += share;
          }
        }
      }

      projections.push({
        month: monthStr,
        userFixed,
        userInstallments,
        userOneTime,
        totalUser: userFixed + userInstallments + userOneTime,
        activeInstallmentsCount: activeInstallmentsList.length,
        installments: activeInstallmentsList,
      });
    }

    return NextResponse.json(projections);
  } catch (error) {
    console.error('Error generating projections:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
