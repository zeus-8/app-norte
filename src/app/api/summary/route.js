import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth.js';
import { getUserFinancialSummary } from '@/lib/summary.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const targetMonth = searchParams.get('month') || new Date().toISOString().slice(0, 7);

    const summary = await getUserFinancialSummary(user.id, targetMonth);

    const {
      month,
      daysInMonth,
      daysRemaining,
      daysWorked,
      totalMinutesWorked,
      totalTrips,
      grossIncome,
      fuelExpense,
      otherExpense,
      netIncome,
      fixedExpensesUserShare,
      installmentsUserShare,
      oneTimeUserShare,
      totalObligations,
      totalPaidObligations,
      totalPendingObligations,
      paidPct,
      expensesBreakdown,
    } = summary;

    const today = new Date();
    const [yearStr, monthStr] = targetMonth.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);
    const isCurrentMonth = today.getFullYear() === year && (today.getMonth() + 1) === monthNum;
    const currentDay = isCurrentMonth ? today.getDate() : (targetMonth < today.toISOString().slice(0, 7) ? daysInMonth : 1);

    // Provisión recomendada para el auto (solo si es auto propio)
    const autoMonthlyReserveTarget = user.driverType === 'owner' ? 100000 : 0;

    // Metas del termómetro:
    const targetMinimum = totalObligations;
    const targetExpected = totalObligations + autoMonthlyReserveTarget + 100000;

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
        totalMinutes: totalMinutesWorked,
        totalHours: Number((totalMinutesWorked / 60).toFixed(1)),
        avgNetPerDayWorked: daysWorked > 0 ? Math.round(netIncome / daysWorked) : 0,
        hourlyRate: totalMinutesWorked > 0 ? Math.round(netIncome / (totalMinutesWorked / 60)) : 0,
      },
      obligations: {
        userFixedObligations: fixedExpensesUserShare,
        userInstallmentObligations: installmentsUserShare,
        userOneTimeObligations: oneTimeUserShare,
        totalUserObligations: totalObligations,
        totalPaidObligations,
        totalPendingObligations,
        paidPct,
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
      expensesBreakdown,
    });
  } catch (error) {
    console.error('Error generating summary:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
