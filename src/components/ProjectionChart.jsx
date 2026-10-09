'use client';

import React, { useMemo } from 'react';
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

const MONTH_NAMES_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/**
 * ProjectionChart — Cobertura mes a mes: gastos proyectados vs ingresos
 *
 * Eje X: meses (12 meses desde el mes actual)
 * Barras fondo: obligación total de cada mes (techo a cubrir)
 * Barra progreso: ingresos netos acumulados del mes actual
 * Líneas: Propios (ámbar) / Cuotas (púrpura, baja al vencer) / Hogar (cyan)
 *
 * Props:
 *   projections  [] — array de /api/expenses/projections
 *   logs         [] — dailyLogs del mes actual (con net_profit)
 *   currentMonth string — "YYYY-MM"
 */
export default function ProjectionChart({ projections = [], logs = [], currentMonth = '' }) {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const safeMonth = currentMonth || today;

  // ── Calcular ingresos netos acumulados del mes actual ────────────────────
  const currentMonthNet = useMemo(() => {
    return logs.reduce((sum, log) => sum + Number(log.net_profit || 0), 0);
  }, [logs]);

  // ── Datos por mes ────────────────────────────────────────────────────────
  const {
    labels,
    bgBarData,        // fondo: obligación total
    progressBarData,  // progreso: ingresos reales (solo mes actual)
    personalData,
    installmentsData,
    householdData,
    currentIdx,
  } = useMemo(() => {
    const labels         = [];
    const bgBarData      = [];
    const progressBarData = [];
    const personalData   = [];
    const installmentsData = [];
    const householdData  = [];
    let currentIdx = 0;

    projections.forEach((proj, i) => {
      const [y, m] = proj.month.split('-');
      labels.push(`${MONTH_NAMES_SHORT[parseInt(m, 10) - 1]} ${y.slice(2)}`);

      const total        = proj.totalUser ?? 0;
      const personal     = proj.userPersonal ?? 0;
      const installments = proj.userInstallments ?? 0;
      const household    = proj.userHousehold ?? 0;

      bgBarData.push(total);
      personalData.push(personal > 0 ? personal : null);
      installmentsData.push(installments > 0 ? installments : null);
      householdData.push(household > 0 ? household : null);

      if (proj.month === safeMonth) {
        currentIdx = i;
        // Para el mes actual: barra de progreso con ingresos reales
        progressBarData.push(currentMonthNet > 0 ? Math.min(currentMonthNet, total) : null);
      } else {
        progressBarData.push(null);
      }
    });

    return { labels, bgBarData, progressBarData, personalData, installmentsData, householdData, currentIdx };
  }, [projections, safeMonth, currentMonthNet]);

  if (!projections.length) return null;

  // ── Colores de las barras de fondo según posición temporal ───────────────
  const bgColors = projections.map((p, i) => {
    if (i < currentIdx)  return 'rgba(100, 116, 139, 0.18)'; // pasado
    if (i === currentIdx) return 'rgba(139, 92, 246, 0.18)'; // actual: púrpura tenue
    return 'rgba(100, 116, 139, 0.10)';                       // futuro
  });

  const bgBorderColors = projections.map((p, i) => {
    if (i === currentIdx) return 'rgba(139, 92, 246, 0.5)';
    return 'rgba(100, 116, 139, 0.2)';
  });

  // Progreso del mes actual
  const currentProj = projections[currentIdx];
  const currentTotal = currentProj?.totalUser ?? 0;
  const coveragePct  = currentTotal > 0 ? Math.min(100, Math.round((currentMonthNet / currentTotal) * 100)) : 0;

  // Cuotas que bajan en algún mes futuro
  const installmentDrops = projections.filter((p, i) =>
    i < projections.length - 1 &&
    i >= currentIdx &&
    (p.userInstallments ?? 0) > (projections[i + 1]?.userInstallments ?? 0)
  );

  const data = {
    labels,
    datasets: [
      // 1. Fondo: obligación total por mes (muy opaco)
      {
        type: 'bar',
        label: 'Obligación Total',
        data: bgBarData,
        backgroundColor: bgColors,
        borderColor: bgBorderColors,
        borderWidth: 1,
        borderRadius: 5,
        borderSkipped: false,
        order: 5,
        barPercentage: 0.85,
        categoryPercentage: 0.9,
      },
      // 2. Progreso mes actual: ingresos reales
      {
        type: 'bar',
        label: 'Ganado este mes',
        data: progressBarData,
        backgroundColor: coveragePct >= 100
          ? 'rgba(52, 211, 153, 0.75)'    // meta completa: verde
          : coveragePct >= 66
          ? 'rgba(56, 189, 248, 0.75)'    // más del 66%: cyan
          : coveragePct >= 33
          ? 'rgba(192, 132, 252, 0.75)'   // más del 33%: púrpura
          : 'rgba(251, 191, 36, 0.75)',   // menos del 33%: ámbar
        borderColor: coveragePct >= 100 ? 'rgba(16, 185, 129, 1)' : 'rgba(139, 92, 246, 1)',
        borderWidth: 2,
        borderRadius: 5,
        borderSkipped: false,
        order: 4,
        barPercentage: 0.85,
        categoryPercentage: 0.9,
      },
      // 3. Línea Propios (ámbar)
      {
        type: 'line',
        label: 'Propios',
        data: personalData,
        borderColor: 'rgba(251, 191, 36, 0.9)',
        backgroundColor: 'transparent',
        borderWidth: 2.5,
        borderDash: [5, 3],
        pointRadius: (ctx) => ctx.dataIndex === currentIdx ? 5 : 3,
        pointBackgroundColor: '#fbbf24',
        pointBorderColor: '#fbbf24',
        pointHoverRadius: 6,
        tension: 0.1,
        fill: false,
        order: 1,
        spanGaps: true,
      },
      // 4. Línea Cuotas (púrpura — baja conforme vencen)
      {
        type: 'line',
        label: 'Cuotas',
        data: installmentsData,
        borderColor: 'rgba(192, 132, 252, 0.9)',
        backgroundColor: 'transparent',
        borderWidth: 2.5,
        borderDash: [5, 3],
        pointRadius: (ctx) => ctx.dataIndex === currentIdx ? 5 : 3,
        pointBackgroundColor: '#c084fc',
        pointBorderColor: '#c084fc',
        pointHoverRadius: 6,
        tension: 0.1,
        fill: false,
        order: 2,
        spanGaps: true,
      },
      // 5. Línea Hogar (cyan)
      {
        type: 'line',
        label: 'Hogar',
        data: householdData,
        borderColor: 'rgba(56, 189, 248, 0.9)',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [3, 3],
        pointRadius: (ctx) => ctx.dataIndex === currentIdx ? 5 : 3,
        pointBackgroundColor: '#38bdf8',
        pointBorderColor: '#38bdf8',
        pointHoverRadius: 6,
        tension: 0.1,
        fill: false,
        order: 3,
        spanGaps: true,
      },
    ].filter(ds => ds.data.some(v => v !== null && v > 0)),
  };

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
          font: { size: 11, family: "'Inter', 'Outfit', sans-serif" },
          boxWidth: 14,
          padding: 14,
          usePointStyle: true,
          filter: item => item.text !== 'Obligación Total',
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
            const idx = items[0]?.dataIndex ?? 0;
            const proj = projections[idx];
            if (!proj) return items[0]?.label ?? '';
            const isCurrent = proj.month === safeMonth;
            return `📅 ${items[0]?.label}${isCurrent ? '  ← Este mes' : ''}`;
          },
          label(ctx) {
            if (ctx.parsed.y === null || ctx.parsed.y === undefined) return null;
            const v = ctx.parsed.y;
            const fmt = n => `$${Math.round(n).toLocaleString('es-AR')}`;
            const map = {
              'Obligación Total': `📦 Total a cubrir: ${fmt(v)}`,
              'Ganado este mes': `💰 Ganado: ${fmt(v)} (${coveragePct}%)`,
              'Propios': `🟡 Propios: ${fmt(v)}`,
              'Cuotas': `🟣 Cuotas: ${fmt(v)}`,
              'Hogar': `🩵 Hogar: ${fmt(v)}`,
            };
            return map[ctx.dataset.label] ?? `${ctx.dataset.label}: ${fmt(v)}`;
          },
          afterBody(items) {
            const idx = items[0]?.dataIndex ?? 0;
            const proj = projections[idx];
            if (!proj) return [];
            const isCurrent = proj.month === safeMonth;
            const total = proj.totalUser ?? 0;
            if (isCurrent && currentMonthNet > 0 && total > 0) {
              const falta = Math.max(0, total - currentMonthNet);
              return ['──────────────────',
                falta > 0
                  ? `Falta: $${Math.round(falta).toLocaleString('es-AR')}`
                  : '✅ Meta mensual cubierta'
              ];
            }
            return [];
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(51, 65, 85, 0.3)' },
        ticks: {
          color: (ctx) => ctx.index === currentIdx ? '#a78bfa' : 'rgba(148, 163, 184, 0.7)',
          font: (ctx) => ({
            size: 11,
            weight: ctx.index === currentIdx ? '700' : '400',
            family: "'Inter', sans-serif",
          }),
          maxRotation: 0,
        },
      },
      y: {
        grid: { color: 'rgba(51, 65, 85, 0.3)' },
        ticks: {
          color: 'rgba(148, 163, 184, 0.8)',
          font: { size: 11, family: "'Inter', sans-serif" },
          callback(val) {
            if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
            if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`;
            return `$${val}`;
          },
        },
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="card" style={{ marginBottom: 24, padding: '20px 22px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 10, marginBottom: 16,
      }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            📊 Proyección de Gastos — 12 Meses
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            <span style={{ color: '#fbbf24' }}>── Propios</span>
            &nbsp;·&nbsp;
            <span style={{ color: '#c084fc' }}>── Cuotas</span>
            &nbsp;·&nbsp;
            <span style={{ color: '#38bdf8' }}>·· Hogar</span>
            &nbsp;·&nbsp;
            <span style={{ color: '#94a3b8' }}>▐ Total (fondo)</span>
          </p>
        </div>

        {/* Progreso del mes actual */}
        {currentTotal > 0 && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Este mes
            </div>
            <div className="font-mono" style={{ fontSize: '0.95rem', fontWeight: 800 }}>
              <span style={{ color: coveragePct >= 100 ? '#34d399' : '#a78bfa' }}>
                ${Math.round(currentMonthNet).toLocaleString('es-AR')}
              </span>
              <span style={{ color: 'var(--text-dim)', fontWeight: 400, fontSize: '0.75rem' }}>
                {' '}/ ${Math.round(currentTotal).toLocaleString('es-AR')}
              </span>
            </div>
            <div style={{
              fontSize: '0.75rem', fontWeight: 700,
              color: coveragePct >= 100 ? '#34d399' : '#fbbf24',
            }}>
              {coveragePct}% cubierto
            </div>
          </div>
        )}
      </div>

      {/* Canvas */}
      <div style={{ height: 260, position: 'relative' }}>
        <Chart type="bar" data={data} options={options} />
      </div>

      {/* Cuotas que bajan */}
      {installmentDrops.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {installmentDrops.slice(0, 4).map((p, i) => {
            const [y, m] = p.month.split('-');
            const lbl = `${MONTH_NAMES_SHORT[parseInt(m, 10) - 1]} ${y.slice(2)}`;
            const nextProj = projections[projections.indexOf(p) + 1];
            const saving = (p.userInstallments ?? 0) - (nextProj?.userInstallments ?? 0);
            return saving > 0 ? (
              <span key={p.month} style={{
                fontSize: '0.72rem',
                background: 'rgba(192, 132, 252, 0.1)',
                border: '1px solid rgba(192, 132, 252, 0.25)',
                borderRadius: 6, padding: '3px 8px', color: '#c084fc',
              }}>
                ↓ {lbl}: baja ${Math.round(saving).toLocaleString('es-AR')} en cuotas
              </span>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}
