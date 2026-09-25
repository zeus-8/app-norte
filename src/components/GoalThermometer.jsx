'use client';

import React, { useEffect } from 'react';
import { Target, TrendingUp, Sparkles, CheckCircle2, AlertTriangle, Flame } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function GoalThermometer({ summaryData }) {
  const { earnings = {}, obligations = {}, goals = {}, calendar = {} } = summaryData || {};
  const netIncome = earnings.netIncome || 0;
  const targetMin = goals.targetMinimum || 1;
  const targetExp = goals.targetExpected || 1;
  const progressPct = goals.progressPct || 0;
  const level = goals.level || 'below_minimum';
  const remainingToExpected = goals.remainingToExpected || 0;
  const dailyTargetNeeded = goals.dailyTargetNeeded || 0;
  const daysRemaining = calendar.daysRemaining || 0;

  useEffect(() => {
    if (level === 'surpassed' && netIncome > 0) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        });
      } catch (e) {
        // ignore
      }
    }
  }, [level, netIncome]);

  if (!summaryData) return null;

  const visualFillPct = Math.min(100, Math.max(0, progressPct));

  return (
    <div className="card" style={{ padding: '22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ padding: '8px', background: level === 'surpassed' ? 'rgba(16, 185, 129, 0.15)' : (level === 'minimum_reached' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(244, 63, 94, 0.15)'), borderRadius: 'var(--radius-md)' }}>
            <Flame className={level === 'surpassed' ? 'text-emerald' : (level === 'minimum_reached' ? 'text-amber' : 'text-rose')} size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'white', margin: 0 }}>
              Termómetro de Metas del Mes
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              Control de cobertura de obligaciones y ritmo diario necesario
            </p>
          </div>
        </div>

        {level === 'surpassed' && (
          <span className="badge badge-green" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            <Sparkles size={14} /> ¡Meta Superada! (+${goals.surplusAmount?.toLocaleString()})
          </span>
        )}
        {level === 'minimum_reached' && (
          <span className="badge badge-yellow" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            <CheckCircle2 size={14} /> Mínimo Cubierto • En Camino
          </span>
        )}
        {level === 'below_minimum' && (
          <span className="badge badge-red" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            <AlertTriangle size={14} /> En Progreso hacia el Mínimo
          </span>
        )}
      </div>

      {/* Grid de 3 Metas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '16px', textAlign: 'center' }}>
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>GANANCIA NETA REAL</div>
          <div className="font-mono text-emerald" style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: 2 }}>
            ${netIncome.toLocaleString()}
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.72rem', color: '#fb7185', fontWeight: 700, textTransform: 'uppercase' }}>🔴 META MÍNIMA (OBLIGACIONES)</div>
          <div className="font-mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f87171', marginTop: 2 }}>
            ${targetMin.toLocaleString()}
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>🎯 META ESPERADA (+RESERVA)</div>
          <div className="font-mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#60a5fa', marginTop: 2 }}>
            ${targetExp.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Barra de Progreso del Termómetro */}
      <div style={{ marginTop: '18px', height: '14px', background: 'rgba(0,0,0,0.3)', borderRadius: '9999px', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }}>
        <div 
          style={{ 
            height: '100%', 
            width: `${visualFillPct}%`, 
            background: level === 'surpassed' 
              ? 'linear-gradient(90deg, #10b981 0%, #34d399 100%)' 
              : (level === 'minimum_reached' 
                  ? 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)' 
                  : 'linear-gradient(90deg, #f43f5e 0%, #fb7185 100%)'),
            borderRadius: '9999px',
            transition: 'width 0.4s ease'
          }}
        />
      </div>

      <div className="font-mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '6px' }}>
        <span>0%</span>
        <span>Mínimo (${targetMin.toLocaleString()})</span>
        <span>Esperado 100% (${targetExp.toLocaleString()})</span>
      </div>

      {/* Ritmo Diario */}
      <div style={{ marginTop: '16px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <TrendingUp className="text-emerald" size={20} />
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>
              {level === 'surpassed' ? (
                '¡Excelente trabajo este mes!'
              ) : (
                `Te faltan $${remainingToExpected.toLocaleString()} para la Meta Esperada`
              )}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              {calendar.isCurrentMonth ? (
                `Quedan ${daysRemaining} días en el mes • Llevas ${calendar.daysWorked || 0} jornadas trabajadas`
              ) : (
                `Mes cerrado • ${calendar.daysWorked || 0} jornadas trabajadas`
              )}
            </div>
          </div>
        </div>

        {level !== 'surpassed' && calendar.isCurrentMonth && (
          <div className="badge badge-blue font-mono" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
            <span>Objetivo diario: </span>
            <strong>${dailyTargetNeeded.toLocaleString()} / día</strong>
          </div>
        )}
      </div>
    </div>
  );
}
