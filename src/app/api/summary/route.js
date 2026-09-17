import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { dailyLogs, expenses } from '@/db/schema.js';
import { eq, and, sql, ne } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth.js';

export const dynamic = 'force-dynamic';

function getMonthDiff(startStr, currentStr) {
  const [startY, startM] = startStr.split('-').map(Number);
  const [currY, currM] = currentStr.split('-').map(Number);
  return (currY - startY) * 12 + (currM - startM);
}

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const targetMonth = searchParams.get('month') || new Date().toISOString().slice(0, 7);
    const [yearStr, monthStr] = targetMonth.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);

    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && (today.getMonth() + 1) === monthNum;
    const currentDay = isCurrentMonth ? today.getDate() : (targetMonth < today.toISOString().slice(0, 7) ? daysInMonth : 1);
    const daysRemaining = isCurrentMonth ? Math.max(1, daysInMonth - currentDay + 1) : (targetMonth > today.toISOString().slice(0, 7) ? daysInMonth : 0);

    // 1. Ingresos y combustible del mes
    const logs = await db.query.dailyLogs.findMany({
      where: and(
        eq(dailyLogs.userId, user.id),
        sql`SUBSTRING(${dailyLogs.date}, 1, 7) = ${targetMonth}`
      ),
    });

    let grossIncome = 0;
    let fuelExpense = 0;
    let otherExpense = 0;
    let totalMinutes = 0;

    for (const log of logs) {
      grossIncome += Number(log.grossIncome) || 0;
      fuelExpense += Number(log.fuelExpense) || 0;
      otherExpense += Number(log.otherExpense) || 0;
      totalMinutes += (log.minutesWorked || 0);
    }
    const netIncome = grossIncome - fuelExpense - otherExpense;
    const daysWorked = logs.length;

    // 2. Gastos correspondientes al usuario para este mes
    const allExpenses = await db.query.expenses.findMany({
      where: and(
        eq(expenses.userId, user.id),
        ne(expenses.status, 'cancelled')
      ),
    });

    let userFixedObligations = 0;
    let userInstallmentObligations = 0;
    let userOneTimeObligations = 0;

    for (const exp of allExpenses) {
      let isApplicable = false;
      if (exp.type === 'fixed' && targetMonth >= exp.startMonth) isApplicable = true;
      if (exp.type === 'one_time' && targetMonth === exp.startMonth) isApplicable = true;
      if (exp.type === 'installment') {
        const diff = getMonthDiff(exp.startMonth, targetMonth);
        if (diff >= 0 && diff < exp.installmentCount) isApplicable = true;
      }

      if (isApplicable) {
        const monthlyAmount = Number(exp.installmentAmount) || 0;
        const userPct = exp.userSharePct !== null && exp.userSharePct !== undefined ? Number(exp.userSharePct) : 100;
        const share = Math.round(monthlyAmount * (userPct / 100));

        if (exp.type === 'fixed') userFixedObligations += share;
        else if (exp.type === 'installment') userInstallmentObligations += share;
        else userOneTimeObligations += share;
      }
    }

    const totalUserObligations = userFixedObligations + userInstallmentObligations + userOneTimeObligations;

    // Provisión recomendada para el auto (solo si es auto propio)
    const autoMonthlyReserveTarget = user.driverType === 'owner' ? 100000 : 0;

    // Metas del termómetro:
    const targetMinimum = totalUserObligations;
    const targetExpected = totalUserObligations + autoMonthlyReserveTarget + 100000;

    const progressPct = targetExpected > 0 ? Math.min(150, Math.round((netIncome / targetExpected) * 100)) : 0;
    const minProgressPct = targetMinimum > 0 ? Math.min(150, Math.round((netIncome / targetMinimum) * 100)) : 0;

    const remainingToExpected = Math.max(0, targetExpected - netIncome);
    const dailyTargetNeeded = daysRemaining > 0 ? Math.round(remainingToExpected / daysRemaining) : 0;

    const remainingToMinimum = Math.max(0, targetMinimum - netIncome);
    const dailyTargetMinNeeded = daysRemaining > 0 ? Math.round(remainingToMinimum / daysRemaining) : 0;

    let level = 'below_minimum';
    if (netIncome >= targetExpected) {
      level = 'surpassed';
    } else if (netIncome >= targetMinimum) {
      level = 'minimum_reached';
    }

    return NextResponse.json({
      month: targetMonth,
      calendar: {
        daysInMonth,
        currentDay,
        daysRemaining,
        daysWorked,
        isCurrentMonth,
      },
      earnings: {
        grossIncome,
        fuelExpense,
        otherExpense,
        netIncome,
        totalMinutes,
        totalHours: Number((totalMinutes / 60).toFixed(1)),
        avgNetPerDayWorked: daysWorked > 0 ? Math.round(netIncome / daysWorked) : 0,
        hourlyRate: totalMinutes > 0 ? Math.round(netIncome / (totalMinutes / 60)) : 0,
      },
      obligations: {
        userFixedObligations,
        userInstallmentObligations,
        userOneTimeObligations,
        totalUserObligations,
        totalJuanObligations: totalUserObligations,
        juanFixedObligations: userFixedObligations,
        juanInstallmentObligations: userInstallmentObligations,
        autoMonthlyReserveTarget,
      },
      goals: {
        targetMinimum,
        targetExpected,
        progressPct,
        minProgressPct,
        remainingToExpected,
        dailyTargetNeeded,
        remainingToMinimum,
        dailyTargetMinNeeded,
        level,
        surplusAmount: Math.max(0, netIncome - targetExpected),
      },
    });
  } catch (error) {
    console.error('Error generating summary:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
