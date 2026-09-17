import { NextResponse } from 'next/server';
import { db } from '@/db/index.js';
import { vehicleMaintenance, userSettings } from '@/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth.js';
import { vehicleMaintenanceSchema } from '@/lib/validations.js';

export const dynamic = 'force-dynamic';

// Helpers de fecha y vencimiento
function addMonthsToDate(dateStr, months) {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length < 3) return null;
  const [y, m, d] = parts.map(Number);
  const targetDate = new Date(y, m - 1 + months, d);
  const outY = targetDate.getFullYear();
  const outM = String(targetDate.getMonth() + 1).padStart(2, '0');
  const outD = String(targetDate.getDate()).padStart(2, '0');
  return `${outY}-${outM}-${outD}`;
}

function getDaysDiff(targetDateStr) {
  if (!targetDateStr) return null;
  const target = new Date(targetDateStr + 'T00:00:00');
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - from.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
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
    return addMonthsToDate(lastDate, intervalM);
  }

  return null;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const odoRow = await db.query.userSettings.findFirst({
      where: and(eq(userSettings.userId, user.id), eq(userSettings.key, 'current_odometer')),
    });
    const currentOdo = odoRow ? parseInt(odoRow.value, 10) : 145000;

    const items = await db.query.vehicleMaintenance.findMany({
      where: eq(vehicleMaintenance.userId, user.id),
      orderBy: (vehicleMaintenance, { desc, asc }) => [desc(vehicleMaintenance.isDocument), desc(vehicleMaintenance.priority), asc(vehicleMaintenance.name)],
    });

    let totalEstimatedCost = 0;
    let totalReserveAccumulated = 0;
    let urgentCount = 0;
    let warningCount = 0;
    let docsCount = 0;
    let mechanicsCount = 0;

    const computedItems = items.map(item => {
      const isDoc = Boolean(item.isDocument) || (item.name && /vtv|gnc|patente|oblea|cédula|seguro/i.test(item.name));
      const trackingType = isDoc ? 'time' : (item.trackingType || 'hybrid');
      const intervalKm = isDoc ? 0 : (item.intervalKm || 0);
      const intervalMonths = item.intervalMonths || 12;
      const lastKm = isDoc ? 0 : (item.lastServiceKm || 0);
      const estCost = Number(item.estimatedCost) || 0;

      if (isDoc) docsCount++;
      else mechanicsCount++;

      // 1. Métricas por Kilometraje
      let kmSinceLast = 0;
      let kmRemaining = null;
      let pctUsedKm = 0;
      let kmStatus = 'ok';

      if (trackingType !== 'time' && intervalKm > 0) {
        kmSinceLast = Math.max(0, currentOdo - lastKm);
        kmRemaining = intervalKm - kmSinceLast;
        pctUsedKm = Math.round((kmSinceLast / intervalKm) * 100);

        if (kmRemaining <= 500) kmStatus = 'danger';
        else if (kmRemaining <= 2000) kmStatus = 'warning';
      }

      // 2. Métricas por Tiempo
      let nextDueDate = computeNextDueDate(item);
      let daysRemaining = nextDueDate ? getDaysDiff(nextDueDate) : null;
      let monthsRemaining = daysRemaining !== null ? Number((daysRemaining / 30.4375).toFixed(1)) : null;
      let pctUsedTime = 0;
      let timeStatus = 'ok';

      if (trackingType !== 'km' && nextDueDate) {
        const totalDays = (intervalMonths > 0 ? intervalMonths : 12) * 30.4375;
        if (daysRemaining !== null) {
          pctUsedTime = Math.round(((totalDays - daysRemaining) / totalDays) * 100);
          if (daysRemaining <= 0) timeStatus = 'danger';
          else if (daysRemaining <= 15) timeStatus = 'danger';
          else if (daysRemaining <= 45) timeStatus = 'warning';
        }
      }

      // 3. Semáforo y porcentaje unificado
      let finalStatus = 'ok';
      let pctUsed = 0;

      if (trackingType === 'time') {
        finalStatus = timeStatus;
        pctUsed = Math.min(100, Math.max(0, pctUsedTime));
      } else if (trackingType === 'km') {
        finalStatus = kmStatus;
        pctUsed = Math.min(100, Math.max(0, pctUsedKm));
      } else {
        if (kmStatus === 'danger' || timeStatus === 'danger') finalStatus = 'danger';
        else if (kmStatus === 'warning' || timeStatus === 'warning') finalStatus = 'warning';
        pctUsed = Math.min(100, Math.max(pctUsedKm, pctUsedTime, 0));
      }

      if (finalStatus === 'danger') urgentCount++;
      else if (finalStatus === 'warning') warningCount++;

      const reserveAccumulated = Math.round(estCost * Math.min(1, Math.max(0, pctUsed / 100)));
      totalEstimatedCost += estCost;
      totalReserveAccumulated += reserveAccumulated;

      return {
        ...item,
        is_document: isDoc,
        tracking_type: trackingType,
        estimated_cost: estCost,
        current_odometer: currentOdo,
        km_since_last: kmSinceLast,
        km_remaining: kmRemaining,
        pct_used_km: pctUsedKm,
        next_due_date: nextDueDate,
        days_remaining: daysRemaining,
        months_remaining: monthsRemaining,
        pct_used_time: pctUsedTime,
        pct_used: pctUsed,
        status: finalStatus,
        reserve_accumulated: reserveAccumulated,
      };
    });

    return NextResponse.json({
      current_odometer: currentOdo,
      driver_type: user.driverType || 'owner',
      items: computedItems,
      summary: {
        totalEstimatedCost,
        totalReserveAccumulated,
        urgentCount,
        warningCount,
        docsCount,
        mechanicsCount,
        totalItems: items.length,
      },
    });
  } catch (error) {
    console.error('Error fetching vehicle maintenance:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Crear nuevo mantenimiento o trámite
export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const validation = vehicleMaintenanceSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.errors[0]?.message || 'Datos de mantenimiento inválidos';
      return NextResponse.json({ error: firstError, details: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, trackingType, intervalKm, intervalMonths, fixedDueMonth, fixedDueDay, lastServiceKm, lastServiceDate, estimatedCost, category, priority, isDocument, notes } = validation.data;

    const calcDueDate = computeNextDueDate({
      fixedDueMonth,
      fixedDueDay,
      lastServiceDate,
      intervalMonths,
    });

    const [newItem] = await db.insert(vehicleMaintenance).values({
      userId: user.id,
      name,
      trackingType: isDocument ? 'time' : trackingType,
      intervalKm,
      intervalMonths,
      fixedDueMonth: fixedDueMonth || null,
      fixedDueDay: fixedDueDay || 30,
      lastServiceKm,
      lastServiceDate: lastServiceDate || new Date().toISOString().slice(0, 10),
      nextDueDate: calcDueDate,
      estimatedCost: String(estimatedCost),
      category,
      priority,
      isDocument,
      notes,
    }).returning();

    return NextResponse.json({ success: true, item: newItem });
  } catch (error) {
    console.error('Error creating maintenance:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
