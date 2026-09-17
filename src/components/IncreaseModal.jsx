'use client';

import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function IncreaseModal({
  isOpen,
  onClose,
  expense,
  currentMonth,
  onSuccess
}) {
  const [newAmount, setNewAmount] = useState('');
  const [effectiveMonth, setEffectiveMonth] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (expense) {
      setNewAmount('');
      // Default to next month or current month
      const [y, m] = (currentMonth || new Date().toISOString().slice(0, 7)).split('-').map(Number);
      let nextM = m + 1;
      let nextY = y;
      if (nextM > 12) {
        nextM = 1;
        nextY++;
      }
      setEffectiveMonth(`${nextY}-${String(nextM).padStart(2, '0')}`);
      setNotes('');
      setError('');
      setSuccessMsg('');
    }
  }, [expense, currentMonth, isOpen]);

  if (!isOpen || !expense) return null;

  const currentMonthly = Number(expense.installmentAmount || expense.monthly_amount || expense.totalAmount || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const parsedNew = Number(newAmount);
    if (!parsedNew || parsedNew <= 0) {
      setError('Ingresa un nuevo monto válido mayor a 0');
      return;
    }

    if (!effectiveMonth) {
      setError('Selecciona el mes a partir del cual rige el aumento');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/expenses/${expense.id}/increase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newAmount: parsedNew,
          effectiveMonth,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al aplicar el aumento');
      }

      setSuccessMsg(data.message || 'Aumento aplicado con éxito');
      if (onSuccess) {
        await onSuccess();
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 110,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(4px)',
      padding: '16px'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '24px', position: 'relative' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fbbf24'
            }}>
              <TrendingUp size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'white', margin: 0 }}>
                Aplicar Aumento / Ajuste
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                {expense.name} ({expense.category})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            color: '#fb7185',
            fontSize: '0.85rem',
            marginBottom: '16px'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            color: '#34d399',
            fontSize: '0.85rem',
            marginBottom: '16px'
          }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Info actual */}
        <div style={{
          background: 'rgba(0,0,0,0.25)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 14px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MONTO ACTUAL HISTÓRICO</div>
            <div className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white' }}>
              ${currentMonthly.toLocaleString()}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            <div>Vigente desde {expense.startMonth}</div>
            <div>{expense.isShared ? `Compartido (${expense.user_share_pct || expense.userSharePct || 100}%)` : '100% propio'}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
              NUEVO MONTO TOTAL ($) *
            </label>
            <input
              type="number"
              step="any"
              required
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder={`Ej. ${(currentMonthly * 1.2).toFixed(0)}`}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                color: 'white',
                fontSize: '1.1rem',
                fontWeight: 800
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
              VIGENTE A PARTIR DE (AAAA-MM) *
            </label>
            <input
              type="month"
              required
              value={effectiveMonth}
              onChange={(e) => setEffectiveMonth(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                color: 'white'
              }}
            />
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '4px 0 0' }}>
              ℹ️ Los meses anteriores a {effectiveMonth || 'este mes'} conservarán el valor de ${currentMonthly.toLocaleString()} en los reportes y balances.
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
              MOTIVO / NOTA (OPCIONAL)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Ajuste cuatrimestral por IPC / ICL"
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                color: 'white'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: '6px' }}
          >
            <span>{loading ? 'Aplicando aumento...' : 'Confirmar y Guardar Aumento'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
