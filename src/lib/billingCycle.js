/**
 * Utilidades para manejo de Ciclo Contable & Facturación Personalizada
 * Permite que choferes y usuarios con liquidaciones a mitad de mes (ej: día 10 al 9)
 * tengan sus rangos de fechas, metas y gráficas alineadas a su período real.
 */

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Obtiene el rango exacto de fechas (inicio, fin, cantidad de días y array de fechas YYYY-MM-DD)
 * para un mes objetivo y un día de inicio de ciclo.
 *
 * @param {string} targetMonth - Mes formato 'YYYY-MM' (ej: '2026-10')
 * @param {number|string} startDay - Día de inicio (1 a 28). Default: 1 (mes calendario).
 */
export function getBillingCycleRange(targetMonth, startDay = 1) {
  const safeMonth = targetMonth || new Date().toISOString().slice(0, 7);
  const [yearStr, monthStr] = safeMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const sDay = Math.min(28, Math.max(1, parseInt(startDay, 10) || 1));
  const monthName = MONTH_NAMES[month - 1] || safeMonth;

  if (sDay <= 1) {
    const lastDay = new Date(year, month, 0).getDate();
    const startDate = `${safeMonth}-01`;
    const endDate = `${safeMonth}-${String(lastDay).padStart(2, '0')}`;
    const dates = [];
    for (let d = 1; d <= lastDay; d++) {
      dates.push(`${safeMonth}-${String(d).padStart(2, '0')}`);
    }
    return {
      targetMonth: safeMonth,
      startDay: 1,
      startDate,
      endDate,
      daysInCycle: lastDay,
      dates,
      isCustom: false,
      monthName,
      cycleLabel: `${monthName} ${year}`,
      shortRangeLabel: `01/${monthStr} al ${String(lastDay).padStart(2, '0')}/${monthStr}`,
    };
  }

  // Ciclo personalizado: inicia el día `sDay` del mes seleccionado
  // y finaliza el día `sDay - 1` del mes siguiente
  const startDate = `${safeMonth}-${String(sDay).padStart(2, '0')}`;
  const nextMonthDate = new Date(year, month, 1);
  const nextY = nextMonthDate.getFullYear();
  const nextM = nextMonthDate.getMonth() + 1;
  const nextMonthStr = String(nextM).padStart(2, '0');
  const endDay = sDay - 1;
  const endDate = `${nextY}-${nextMonthStr}-${String(endDay).padStart(2, '0')}`;

  const dates = [];
  const cur = new Date(year, month - 1, sDay);
  const end = new Date(nextY, nextM - 1, endDay, 23, 59, 59);

  while (cur <= end) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }

  const startFormatted = `${String(sDay).padStart(2, '0')}/${monthStr}`;
  const endFormatted = `${String(endDay).padStart(2, '0')}/${nextMonthStr}`;

  return {
    targetMonth: safeMonth,
    startDay: sDay,
    startDate,
    endDate,
    daysInCycle: dates.length,
    dates,
    isCustom: true,
    monthName,
    cycleLabel: `Ciclo ${monthName} (${startFormatted} → ${endFormatted})`,
    shortRangeLabel: `${startFormatted} al ${endFormatted}`,
  };
}

/**
 * Determina a qué mes contable ('YYYY-MM') pertenece una fecha específica dada
 * según el día de corte configurado.
 *
 * Ej: Con startDay = 10:
 * - '2026-10-09' -> pertenece a '2026-09' (último día del ciclo Sep)
 * - '2026-10-10' -> pertenece a '2026-10' (primer día del ciclo Oct)
 * - '2026-11-05' -> pertenece a '2026-10' (día dentro del ciclo Oct)
 *
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @param {number|string} startDay - 1 a 28
 */
export function getCycleForDate(dateStr, startDay = 1) {
  if (!dateStr) return new Date().toISOString().slice(0, 7);
  const [yStr, mStr, dStr] = dateStr.substring(0, 10).split('-');
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  const d = parseInt(dStr, 10);
  const sDay = Math.min(28, Math.max(1, parseInt(startDay, 10) || 1));

  if (sDay <= 1) {
    return `${yStr}-${mStr}`;
  }

  if (d >= sDay) {
    return `${yStr}-${mStr}`;
  } else {
    // Pertenece al ciclo del mes anterior
    const prevDate = new Date(y, m - 2, 1);
    const prevY = prevDate.getFullYear();
    const prevM = String(prevDate.getMonth() + 1).padStart(2, '0');
    return `${prevY}-${prevM}`;
  }
}
