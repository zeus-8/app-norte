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
 * EarningsChart — Gráfico mixto Barras + Líneas estilo Uber
 *
 * Props:
 *   logs              []     — dailyLogs del mes (con campo date "YYYY-MM-DD" y net_profit)
 *   dailyBaseTarget   number — Meta fija diaria (obligaciones / días del mes)
 *   dailyTargetNeeded number — Ritmo dinámico actual
 *   daysInMonth       number — Días totales del mes
 *   currentMonth      string — "YYYY-MM"
 */
export default function EarningsChart({
  logs = [],
  dailyBaseTarget = 0,
  dailyTargetNeeded = 0,
  daysInMonth = 30,
  currentMonth = '',
}) {
  const now = new Date();
  const fallbackMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const safeMonth = currentMonth || fallbackMonth;
  const [yearStr, monthStr] = safeMonth.split('-');

  const safeDaysInMonth = Number(daysInMonth) > 0 ? Number(daysInMonth) : 30;

  // ── Eje X: todos los días del mes ─────────────────────────────────────────
  const labels = Array.from({ length: safeDaysInMonth }, (_, i) => {
    const day = String(i + 1).padStart(2, '0');
    return `${day}/${monthStr}`;
  });

  // ── Mapear net_profit al número de día ────────────────────────────────────
  const netByDay = {};
  logs.forEach(log => {
    // date puede venir como "YYYY-MM-DD" o "YYYY-MM-DDT..."
    const dateStr = (log.date || '').substring(0, 10); // garantizar "YYYY-MM-DD"
    const dayStr = dateStr.slice(8, 10);               // "DD"
    if (dayStr) {
      const dayNum = parseInt(dayStr, 10);
      if (dayNum >= 1 && dayNum <= 31) {
        netByDay[dayNum] = (netByDay[dayNum] || 0) + Number(log.net_profit || 0);
      }
    }
  });

  const isCurrentMonth =
    now.getFullYear() === parseInt(yearStr, 10) &&
    now.getMonth() + 1 === parseInt(monthStr, 10);
  const currentDay = isCurrentMonth ? now.getDate() : safeDaysInMonth;

  // ── Dataset 1: BARRAS — ganancia neta por día ─────────────────────────────
  const barData = labels.map((_, i) => {
    const dayNum = i + 1;
    return Object.prototype.hasOwnProperty.call(netByDay, dayNum) ? netByDay[dayNum] : null;
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

  // ── Dataset 2: LÍNEA FIJA — tarifa mensual base ───────────────────────────
  const fixedLineData = labels.map(() => dailyBaseTarget > 0 ? dailyBaseTarget : null);

  // ── Dataset 3: LÍNEA RITMO — solo desde hoy en adelante ──────────────────
  const rhythmLineData = labels.map((_, i) => {
    const dayNum = i + 1;
    if (dailyTargetNeeded <= 0) return null;
    return dayNum >= currentDay ? dailyTargetNeeded : null;
  });

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
        label: 'Ritmo Necesario',
        data: rhythmLineData,
        borderColor: 'rgba(251, 191, 36, 0.95)',
        backgroundColor: 'rgba(251, 191, 36, 0.08)',
        borderWidth: 2.5,
        borderDash: [],
        pointRadius: 3,
        pointBackgroundColor: '#fbbf24',
        pointBorderColor: '#fbbf24',
        pointHoverRadius: 6,
        tension: 0,
        fill: false,
        order: 2,
        spanGaps: false,
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
            return `📅 ${items[0]?.label || ''}`;
          },
          label(ctx) {
            if (ctx.parsed.y === null || ctx.parsed.y === undefined) return null;
            const val = ctx.parsed.y;
            const fmt = v => `$${Math.round(v).toLocaleString('es-AR')}`;
            if (ctx.dataset.label === 'Ganancia Neta del Día') {
              if (dailyBaseTarget > 0) {
                const diff = val - dailyBaseTarget;
                const sign = diff >= 0 ? '▲ +' : '▼ ';
                return `💰 Ganancia: ${fmt(val)}   ${sign}${fmt(Math.abs(diff))} vs meta`;
              }
              return `💰 Ganancia: ${fmt(val)}`;
            }
            if (ctx.dataset.label === 'Meta Fija Mensual') return `📊 Meta Fija: ${fmt(val)}/día`;
            if (ctx.dataset.label === 'Ritmo Necesario') return `⚡ Ritmo: ${fmt(val)}/día`;
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
            const dayNum = index + 1;
            if (safeDaysInMonth <= 15 || dayNum % 2 === 1) return this.getLabelForValue(val);
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
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            📈 Ganancia Diaria vs Metas del Mes
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Barras = ganancia neta &nbsp;·&nbsp;
            <span style={{ color: '#22d3ee' }}>Cyan = meta fija</span> &nbsp;·&nbsp;
            <span style={{ color: '#fbbf24' }}>Ámbar = ritmo necesario</span>
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
            <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>Sin jornadas registradas este mes</p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
              Registrá una jornada para ver el gráfico
            </p>
          </div>
        ) : (
          <Chart type="bar" data={data} options={options} />
        )}
      </div>
    </div>
  );
}
