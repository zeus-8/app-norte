import { db } from '@/db/index.js';
import { dailyLogs, expenses, vehicleMaintenance, userSettings, users, households, householdMembers, expensePayments } from '@/db/schema.js';
import { eq, and, sql, ne, or, inArray } from 'drizzle-orm';

function getMonthDiff(startStr, currentStr) {
  const [startY, startM] = startStr.split('-').map(Number);
  const [currY, currM] = currentStr.split('-').map(Number);
  return (currY - startY) * 12 + (currM - startM);
}

function computeNextDueDate(item, currentDate = new Date()) {
  if (item.fixedDueMonth || item.fixed_due_month) {
    const currentYear = currentDate.getFullYear();
    const dueMonth = parseInt(item.fixedDueMonth || item.fixed_due_month, 10);
    const dueDay = item.fixedDueDay || item.fixed_due_day || 30;

    let targetYear = currentYear;
    const lastDate = item.lastServiceDate || item.last_service_date;

    if (lastDate) {
      const [lastY, lastM] = lastDate.split('-').map(Number);
      if (lastY === currentYear && lastM >= dueMonth) {
        targetYear = currentYear + 1;
      } else if (lastY > currentYear) {
        targetYear = lastY;
      }
    }

    const mStr = String(dueMonth).padStart(2, '0');
    const lastDayOfMonth = new Date(targetYear, dueMonth, 0).getDate();
    const dStr = String(Math.min(dueDay, lastDayOfMonth)).padStart(2, '0');
    return `${targetYear}-${mStr}-${dStr}`;
  }

  if (item.nextDueDate || item.next_due_date) {
    return item.nextDueDate || item.next_due_date;
  }

  const lastDate = item.lastServiceDate || item.last_service_date;
  const intervalM = item.intervalMonths || item.interval_months || 12;
  if (lastDate && intervalM > 0) {
    const parts = lastDate.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts.map(Number);
      const targetDate = new Date(y, m - 1 + intervalM, d);
      const outY = targetDate.getFullYear();
      const outM = String(targetDate.getMonth() + 1).padStart(2, '0');
      const outD = String(targetDate.getDate()).padStart(2, '0');
      return `${outY}-${outM}-${outD}`;
    }
  }

  return null;
}

export async function getUserFinancialSummary(userId, targetMonth = null) {
  if (!targetMonth) {
    targetMonth = new Date().toISOString().slice(0, 7);
  }

  const [yearStr, monthStr] = targetMonth.split('-');
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && (today.getMonth() + 1) === monthNum;
  const currentDay = isCurrentMonth ? today.getDate() : (targetMonth < today.toISOString().slice(0, 7) ? daysInMonth : 1);
  const daysRemaining = isCurrentMonth ? Math.max(1, daysInMonth - currentDay + 1) : 0;

  // 1. Logs de jornadas
  const logs = await db.query.dailyLogs.findMany({
    where: and(
      eq(dailyLogs.userId, userId),
      sql`SUBSTRING(${dailyLogs.date}, 1, 7) = ${targetMonth}`
    ),
  });

  let grossIncome = 0;
  let fuelExpense = 0;
  let otherExpense = 0;
  let totalMinutesWorked = 0;
  let totalTrips = 0;
  const appBreakdownTotals = {};

  for (const log of logs) {
    grossIncome += Number(log.grossIncome) || 0;
    fuelExpense += Number(log.fuelExpense) || 0;
    otherExpense += Number(log.otherExpense) || 0;
    totalMinutesWorked += (log.minutesWorked || 0);
    totalTrips += (log.tripsCount || 0);

    if (log.appBreakdown && typeof log.appBreakdown === 'object') {
      Object.entries(log.appBreakdown).forEach(([app, amount]) => {
        appBreakdownTotals[app] = (appBreakdownTotals[app] || 0) + (Number(amount) || 0);
      });
    }
  }

  const netIncome = grossIncome - fuelExpense - otherExpense;
  const daysWorked = logs.length;

  // 2. Obtener membresías de Hogar Compartido activas
  const memberships = await db
    .select()
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.userId, userId),
        eq(householdMembers.status, 'accepted')
      )
    );

  const householdMap = {};
  const householdIds = [];
  memberships.forEach(m => {
    householdMap[m.householdId] = Number(m.defaultSharePct) || 50;
    householdIds.push(m.householdId);
  });

  // 3. Obtener gastos personales y compartidos del hogar
  let allExpenses = [];
  if (householdIds.length > 0) {
    allExpenses = await db.query.expenses.findMany({
      where: and(
        ne(expenses.status, 'cancelled'),
        or(
          eq(expenses.userId, userId),
          inArray(expenses.householdId, householdIds)
        )
      ),
    });
  } else {
    allExpenses = await db.query.expenses.findMany({
      where: and(
        eq(expenses.userId, userId),
        ne(expenses.status, 'cancelled')
      ),
    });
  }

  // 4. Checklist de Pagos del mes
  const payments = await db
    .select()
    .from(expensePayments)
    .where(
      and(
        eq(expensePayments.userId, userId),
        eq(expensePayments.month, targetMonth)
      )
    );

  const paymentsMap = {};
  payments.forEach(p => {
    paymentsMap[p.expenseId] = Boolean(p.isPaid);
  });

  let fixedExpensesUserShare = 0;
  let installmentsUserShare = 0;
  let oneTimeUserShare = 0;
  let totalPaidObligations = 0;
  const expensesBreakdown = [];

  for (const exp of allExpenses) {
    let isApplicable = false;

    // Respetar fecha de inicio y fecha de fin (vigencia temporal)
    if (exp.type === 'fixed') {
      if (targetMonth >= exp.startMonth && (!exp.endMonth || targetMonth <= exp.endMonth)) {
        isApplicable = true;
      }
    } else if (exp.type === 'one_time') {
      if (targetMonth === exp.startMonth) isApplicable = true;
    } else if (exp.type === 'installment') {
      const diff = getMonthDiff(exp.startMonth, targetMonth);
      if (diff >= 0 && diff < exp.installmentCount) isApplicable = true;
    }

    if (isApplicable) {
      const monthlyAmount = Number(exp.installmentAmount) || 0;
      
      // Determinar porcentaje correspondiente
      let userPct = 100;
      if (exp.householdId && householdMap[exp.householdId] !== undefined) {
        userPct = householdMap[exp.householdId];
      } else if (exp.isShared && exp.userSharePct !== null) {
        userPct = Number(exp.userSharePct);
      }

      const userShareAmount = Math.round(monthlyAmount * (userPct / 100));
      const isPaid = Boolean(paymentsMap[exp.id]);

      if (exp.type === 'fixed') fixedExpensesUserShare += userShareAmount;
      else if (exp.type === 'installment') installmentsUserShare += userShareAmount;
      else oneTimeUserShare += userShareAmount;

      if (isPaid) {
        totalPaidObligations += userShareAmount;
      }

      expensesBreakdown.push({
        id: exp.id,
        name: exp.name,
        category: exp.category,
        type: exp.type,
        totalAmount: monthlyAmount,
        userSharePct: userPct,
        userShareAmount,
        isShared: Boolean(exp.isShared || exp.householdId),
        isHousehold: Boolean(exp.householdId),
        isPaid,
      });
    }
  }

  const totalObligations = fixedExpensesUserShare + installmentsUserShare + oneTimeUserShare;
  const totalPendingObligations = Math.max(0, totalObligations - totalPaidObligations);
  const paidPct = totalObligations > 0 ? Math.min(100, Math.round((totalPaidObligations / totalObligations) * 100)) : 100;
  const freeBalance = netIncome - totalObligations;

  return {
    month: targetMonth,
    daysInMonth,
    daysRemaining,
    daysWorked,
    totalMinutesWorked,
    totalTrips,
    grossIncome,
    fuelExpense,
    otherExpense,
    netIncome,
    appBreakdownTotals,
    fixedExpensesUserShare,
    installmentsUserShare,
    oneTimeUserShare,
    totalObligations,
    totalPaidObligations,
    totalPendingObligations,
    paidPct,
    freeBalance,
    expensesBreakdown,
  };
}

export async function getUserVehicleAlerts(userId) {
  const odoRow = await db.query.userSettings.findFirst({
    where: and(eq(userSettings.userId, userId), eq(userSettings.key, 'current_odometer')),
  });
  const currentOdo = odoRow ? parseInt(odoRow.value, 10) : 145000;

  const items = await db.query.vehicleMaintenance.findMany({
    where: eq(vehicleMaintenance.userId, userId),
  });

  const alerts = [];

  for (const item of items) {
    const isDoc = Boolean(item.isDocument) || (item.name && /vtv|gnc|patente|oblea|cédula|seguro/i.test(item.name));
    const nextDue = computeNextDueDate(item);
    
    // Check km
    if (!isDoc && item.intervalKm > 0 && item.lastServiceKm > 0) {
      const kmSince = currentOdo - item.lastServiceKm;
      const kmRemaining = item.intervalKm - kmSince;
      if (kmRemaining <= 500) {
        alerts.push({
          name: item.name,
          status: kmRemaining <= 0 ? 'danger' : 'warning',
          message: kmRemaining <= 0 
            ? `Vencido por ${Math.abs(kmRemaining)} km` 
            : `Faltan ${kmRemaining} km para el cambio`,
        });
        continue;
      }
    }

    // Check date
    if (nextDue) {
      const target = new Date(nextDue + 'T00:00:00');
      const from = new Date();
      from.setHours(0, 0, 0, 0);
      const diffDays = Math.round((target.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 30) {
        alerts.push({
          name: item.name,
          status: diffDays <= 5 ? 'danger' : 'warning',
          message: diffDays < 0 
            ? `Vencido hace ${Math.abs(diffDays)} días (${nextDue})`
            : diffDays === 0 
            ? `Vence HOY (${nextDue})`
            : `Vence en ${diffDays} días (${nextDue})`,
        });
      }
    }
  }

  return alerts;
}
