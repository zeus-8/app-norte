import { db } from '@/db/index.js';
import { dailyLogs, expenses, vehicleMaintenance, userSettings, users } from '@/db/schema.js';
import { eq, and, sql, ne } from 'drizzle-orm';

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

  // 2. Gastos
  const allExpenses = await db.query.expenses.findMany({
    where: and(
      eq(expenses.userId, userId),
      ne(expenses.status, 'cancelled')
    ),
  });

  let fixedExpensesUserShare = 0;
  let installmentsUserShare = 0;
  let oneTimeUserShare = 0;

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

      if (exp.type === 'fixed') fixedExpensesUserShare += share;
      else if (exp.type === 'installment') installmentsUserShare += share;
      else oneTimeUserShare += share;
    }
  }

  const totalObligations = fixedExpensesUserShare + installmentsUserShare + oneTimeUserShare;
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
    freeBalance,
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
