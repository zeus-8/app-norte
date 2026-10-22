'use client';

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler
);

/**
 * EarningsChart — Gráfico mixto Barras + Líneas con soporte completo de Ciclo Contable
 *
 * Props:
 *   logs              []     — dailyLogs del mes/ciclo (con campo date "YYYY-MM-DD" y net_profit)
 *   dailyBaseTarget   number — Meta fija diaria (obligaciones / días del ciclo)
 *   dailyTargetNeeded number — Ritmo dinámico actual para días restantes
 *   targetExpected    number — Total de meta esperada a cubrir en el mes
 *   daysInMonth       number — Días totales del mes/ciclo
 *   currentMonth      string — "YYYY-MM"
 *   billingCycle      object — { startDay, startDate, endDate, daysInCycle, dates, isCustom, shortRangeLabel }
 */
export default function EarningsChart({
  logs = [],
  dailyBaseTarget = 0,
  dailyTargetNeeded = 0,
  targetExpected = 0,
  daysInMonth = 30,
  currentMonth = '',
  billingCycle = null,
}) {
  const now = new Date();
  const fallbackMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const safeMonth = currentMonth || fallbackMonth;
  const [yearStr, monthStr] = safeMonth.split('-');

  // ── Determinar lista exacta de fechas del ciclo contable ──────────────────
  let dates = [];
  if (billingCycle?.dates?.length > 0) {
    dates = billingCycle.dates;
  } else {
    const totalDays = Number(daysInMonth) > 0 ? Number(daysInMonth) : 30;
    dates = Array.from({ length: totalDays }, (_, i) => {
      const day = String(i + 1).padStart(2, '0');
      return `${yearStr}-${monthStr}-${day}`;
    });
  }

  const totalCycleDays = dates.length;

  // ── Eje X Labels: "DD/MM" ─────────────────────────────────────────────────
  const labels = dates.map(dStr => {
    const parts = dStr.split('-');
    return `${parts[2]}/${parts[1]}`;
  });

  // ── Mapear net_profit a la fecha exacta "YYYY-MM-DD" ─────────────────────
  const netByDate = {};
  logs.forEach(log => {
    const dStr = (log.date || '').substring(0, 10);
    if (dStr) {
      netByDate[dStr] = (netByDate[dStr] || 0) + Number(log.net_profit || 0);
    }
  });

  // ── Identificar el día actual en el ciclo ─────────────────────────────────
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayIdx = dates.indexOf(todayStr);

  // ── Dataset 1: BARRAS — ganancia neta por día ─────────────────────────────
  const barData = dates.map(dStr => {
    return Object.prototype.hasOwnProperty.call(netByDate, dStr) ? netByDate[dStr] : null;
  });

  const barColors = barData.map(v => {
    if (v === null) return 'rgba(0,0,0,0)';
    if (dailyBaseTarget === 0) return 'rgba(52, 211, 153, 0.85)';
    return v >= dailyBaseTarget
      ? 'rgba(52, 211, 153, 0.85)'
      : 'rgba(248, 113, 113, 0.80)';
  });

  const barBorderColors = barData.map(v => {
    if (v === null) return 'rgba(0,0,0,0)';
    if (dailyBaseTarget === 0) return 'rgba(16, 185, 129, 1)';
    return v >= dailyBaseTarget
      ? 'rgba(16, 185, 129, 1)'
      : 'rgba(239, 68, 68, 1)';
  });

  // ── Dataset 2: LÍNEA FIJA — tarifa mensual base de referencia ─────────────
  const fixedLineData = labels.map(() => dailyBaseTarget > 0 ? dailyBaseTarget : null);

  // ── Dataset 3: LÍNEA RITMO — Historial completo + Proyección hacia adelante
  // Reconstruye el ritmo exigido día a día sin borrar el pasado
  const totalGoal = targetExpected > 0 ? targetExpected : (dailyBaseTarget > 0 ? dailyBaseTarget * totalCycleDays : 0);

  let accumulatedNet = 0;
  const rhythmLineData = [];

  for (let i = 0; i < totalCycleDays; i++) {
    const dStr = dates[i];
    const remainingDays = totalCycleDays - i;

    if (todayIdx >= 0 && i > todayIdx) {
      // Días futuros en el ciclo activo: proyectar el ritmo actual necesario
      rhythmLineData.push(dailyTargetNeeded > 0 ? dailyTargetNeeded : 0);
    } else if (todayIdx >= 0 && i === todayIdx) {
      // Día de hoy: ritmo actual necesario
      rhythmLineData.push(dailyTargetNeeded > 0 ? dailyTargetNeeded : (totalGoal > 0 ? Math.max(0, Math.round((totalGoal - accumulatedNet) / remainingDays)) : null));
      if (netByDate[dStr] !== undefined) {
        accumulatedNet += Number(netByDate[dStr]);
      }
    } else {
      // Días pasados: mantener exactamente el ritmo que se exigía ese día
      const neededOnThisDay = totalGoal > 0
        ? Math.max(0, Math.round((totalGoal - accumulatedNet) / remainingDays))
        : (dailyBaseTarget > 0 ? dailyBaseTarget : null);

      rhythmLineData.push(neededOnThisDay);

      if (netByDate[dStr] !== undefined) {
        accumulatedNet += Number(netByDate[dStr]);
      }
    }
  }

  // ── Chart.js data ─────────────────────────────────────────────────────────
  const data = {
    labels,
    datasets: [
      {
        type: 'bar',
        label: 'Ganancia Neta del Día',
        data: barData,
        backgroundColor: barColors,
        borderColor: barBorderColors,
        borderWidth: 1.5,
        borderRadius: 5,
        borderSkipped: false,
        order: 3,
      },
      {
        type: 'line',
        label: 'Meta Fija Mensual',
        data: fixedLineData,
        borderColor: 'rgba(34, 211, 238, 0.9)',
        backgroundColor: 'rgba(34, 211, 238, 0.05)',
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: '#22d3ee',
        tension: 0,
        fill: false,
        order: 1,
        spanGaps: true,
      },
      {
        type: 'line',
        label: 'Ritmo Necesario (Historial)',
        data: rhythmLineData,
        borderColor: 'rgba(251, 191, 36, 0.95)',
        backgroundColor: 'rgba(251, 191, 36, 0.08)',
        borderWidth: 2.5,
        borderDash: [],
        pointRadius: (ctx) => {
          const idx = ctx.dataIndex;
          if (todayIdx >= 0 && idx === todayIdx) return 6; // Destacar día actual
          return 3;
        },
        pointBackgroundColor: (ctx) => {
          const idx = ctx.dataIndex;
          if (todayIdx >= 0 && idx === todayIdx) return '#ffffff';
          return '#fbbf24';
        },
        pointBorderColor: '#fbbf24',
        pointHoverRadius: 7,
        tension: 0.15,
        fill: false,
        order: 2,
        spanGaps: true,
      },
    ],
  };

  // ── Chart.js options ──────────────────────────────────────────────────────
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          color: 'rgba(203, 213, 225, 0.85)',
          font: { size: 12, family: "'Inter', 'Outfit', sans-serif" },
          boxWidth: 16,
          padding: 18,
          usePointStyle: true,
          pointStyleWidth: 10,
          filter: (item) => item.text !== 'Meta Fija Mensual' || dailyBaseTarget > 0,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#f8fafc',
        bodyColor: 'rgba(203, 213, 225, 0.9)',
        borderColor: 'rgba(51, 65, 85, 0.8)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
        titleFont: { size: 13, weight: '700', family: "'Inter', sans-serif" },
        bodyFont: { size: 12, family: "'Inter', sans-serif" },
        callbacks: {
          title(items) {
            const idx = items[0]?.dataIndex;
            const fullDate = dates[idx] || items[0]?.label || '';
            const isToday = fullDate === todayStr;
            return `📅 ${fullDate}${isToday ? ' (HOY)' : ''}`;
          },
          label(ctx) {
            if (ctx.parsed.y === null || ctx.parsed.y === undefined) return null;
            const val = ctx.parsed.y;
            const fmt = v => `$${Math.round(v).toLocaleString('es-AR')}`;
            if (ctx.dataset.label === 'Ganancia Neta del Día') {
              if (dailyBaseTarget > 0) {
                const diff = val - dailyBaseTarget;
                const sign = diff >= 0 ? '▲ +' : '▼ ';
                return `💰 Ganancia: ${fmt(val)}   ${sign}${fmt(Math.abs(diff))} vs meta base`;
              }
              return `💰 Ganancia: ${fmt(val)}`;
            }
            if (ctx.dataset.label === 'Meta Fija Mensual') return `📊 Meta Fija: ${fmt(val)}/día`;
            if (ctx.dataset.label.includes('Ritmo')) {
              const idx = ctx.dataIndex;
              const isPast = todayIdx >= 0 && idx < todayIdx;
              const isCurrent = todayIdx >= 0 && idx === todayIdx;
              const suffix = isPast ? ' (exigido en este día)' : isCurrent ? ' (hoy)' : ' (proyectado)';
              return `⚡ Ritmo Necesario: ${fmt(val)}/día${suffix}`;
            }
            return `${ctx.dataset.label}: ${fmt(val)}`;
          },
          filter(item) {
            return item.parsed.y !== null && item.parsed.y !== undefined;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(51, 65, 85, 0.35)', lineWidth: 1 },
        ticks: {
          color: 'rgba(148, 163, 184, 0.8)',
          font: { size: 10, family: "'Inter', sans-serif" },
          maxRotation: 45,
          minRotation: 0,
          callback(val, index) {
            if (totalCycleDays <= 15 || index % 2 === 0) return this.getLabelForValue(val);
            return '';
          },
        },
      },
      y: {
        grid: { color: 'rgba(51, 65, 85, 0.35)', lineWidth: 1 },
        ticks: {
          color: 'rgba(148, 163, 184, 0.8)',
          font: { size: 11, family: "'Inter', sans-serif" },
          callback(val) {
            if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`;
            return `$${val}`;
          },
        },
        beginAtZero: true,
      },
    },
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const hasLogs = logs.length > 0;

  return (
    <div className="card" style={{ marginBottom: 24, padding: '20px 22px' }}>
      {/* Encabezado */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 18,
      }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span>📈 Ganancia Diaria vs Metas</span>
            {billingCycle?.isCustom && (
              <span className="badge badge-yellow font-mono" style={{ fontSize: '0.72rem' }}>
                {billingCycle.shortRangeLabel || `Día ${billingCycle.startDay} al ${billingCycle.startDay - 1}`}
              </span>
            )}
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Barras = ganancia neta &nbsp;·&nbsp;
            <span style={{ color: '#22d3ee' }}>Cyan = meta fija</span> &nbsp;·&nbsp;
            <span style={{ color: '#fbbf24' }}>Ámbar = ritmo necesario (historial continuo)</span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(52, 211, 153, 0.85)' }} />
            <span>≥ Meta</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(248, 113, 113, 0.85)' }} />
            <span>&lt; Meta</span>
          </div>
          {dailyBaseTarget > 0 && (
            <span style={{ fontSize: '0.75rem', color: '#22d3ee', fontWeight: 700 }}>
              Base: ${dailyBaseTarget.toLocaleString('es-AR')}/d
            </span>
          )}
          {dailyTargetNeeded > 0 && (
            <span style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 700 }}>
              Ritmo: ${dailyTargetNeeded.toLocaleString('es-AR')}/d
            </span>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div style={{ height: 280, position: 'relative' }}>
        {!hasLogs ? (
          <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            gap: 8,
          }}>
            <span style={{ fontSize: '2rem', opacity: 0.4 }}>📊</span>
            <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>Sin jornadas registradas en este período</p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
              Registrá una jornada dentro de este ciclo para ver el gráfico
            </p>
          </div>
        ) : (
          <Chart type="bar" data={data} options={options} />
        )}
      </div>
    </div>
  );
}
