'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Smartphone, 
  DollarSign, 
  Building2, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  ArrowRight
} from 'lucide-react';

const APP_NAMES = {
  uber: 'Uber',
  cabify: 'Cabify',
  didi: 'DiDi',
  particular: 'Particular / Privado',
  indrive: 'InDrive',
  rappi: 'Rappi',
  pedidosya: 'PedidosYa',
};

export default function AppAdvanceModal({
  isOpen,
  onClose,
  onSaved,
  currentMonth,
  activeApps = ['uber', 'cabify', 'didi'],
  appBreakdownTotals = {},
  advancesByApp = {},
}) {
  const [app, setApp] = useState('uber');
  const [amount, setAmount] = useState('');
  const [destination, setDestination] = useState('Mercado Pago');
  const [expenseId, setExpenseId] = useState('');
  const [expensesList, setExpensesList] = useState([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const advanceApps = (activeApps.length > 0 ? activeApps : ['uber', 'cabify', 'didi'])
    .filter(a => {
      const l = (a || '').toLowerCase();
      return l !== 'particular' && l !== 'privado' && l !== 'remis';
    });
  const validAdvanceApps = advanceApps.length > 0 ? advanceApps : ['uber'];

  useEffect(() => {
    if (isOpen) {
      setApp(validAdvanceApps[0] || 'uber');
      setAmount('');
      setDestination('Mercado Pago');
      setExpenseId('');
      setDate(new Date().toISOString().slice(0, 10));
      setNotes('');
      setError('');

      fetch(`/api/expenses?month=${currentMonth || new Date().toISOString().slice(0, 7)}`)
        .then(r => r.json())
        .then(d => {
          if (d.expenses) setExpensesList(d.expenses);
        })
        .catch(err => console.error('Error fetching expenses for advance:', err));
    }
  }, [isOpen, activeApps, currentMonth]);

  if (!isOpen) return null;

  const currentAppBilled = appBreakdownTotals[app] || 0;
  const currentAppAdv = advancesByApp[app] || 0;
  const numAmount = parseFloat(amount) || 0;
  const newAdvTotal = currentAppAdv + numAmount;
  const pendingAfterAdvance = Math.max(0, currentAppBilled - newAdvTotal);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!numAmount || numAmount <= 0) {
      setError('Por favor ingresa un monto válido mayor a $0.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const res = await fetch('/api/advances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app,
          amount: numAmount,
          destination,
          expenseId: expenseId || null,
          date,
          notes,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al guardar adelanto');

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="modal-overlay modal-backdrop" 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        padding: 16,
      }}
    >
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: 540, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Encabezado */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 14, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
              <Smartphone size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Adelanto / Retiro Inmediato de App
              </h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Cobro anticipado antes de la liquidación semanal
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn btn-secondary btn-sm" style={{ padding: '6px 8px' }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="card" style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--accent-red)', color: '#f87171', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Selector de App */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: 6 }}>
              Aplicación de Movilidad:
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {validAdvanceApps.map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setApp(a)}
                  className={`btn btn-sm ${app === a ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ textTransform: 'capitalize' }}
                >
                  {APP_NAMES[a] || a}
                </button>
              ))}
            </div>
          </div>

          {/* Tarjeta de Saldo en la App */}
          <div className="card" style={{ padding: 14, background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--border-color)', marginBottom: 16, borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 6 }}>
              <span style={{ color: 'var(--text-muted)' }}>Facturado en {APP_NAMES[app] || app} este mes:</span>
              <strong>${Math.round(currentAppBilled).toLocaleString('es-AR')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 6 }}>
              <span style={{ color: 'var(--text-muted)' }}>Adelantos ya retirados:</span>
              <span style={{ color: '#fbbf24' }}>-${Math.round(currentAppAdv).toLocaleString('es-AR')}</span>
            </div>
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: 700 }}>
              <span>Saldo pendiente tras este retiro:</span>
              <span style={{ color: '#34d399' }}>${Math.round(pendingAfterAdvance).toLocaleString('es-AR')}</span>
            </div>
          </div>

          {/* Monto y Destino */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: 4 }}>
                Monto Retirado ($):
              </label>
              <input
                type="number"
                className="input"
                placeholder="Ej. 40000"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: 4 }}>
                Destino del dinero:
              </label>
              <select
                className="input"
                value={destination}
                onChange={e => setDestination(e.target.value)}
              >
                <option value="Mercado Pago">Mercado Pago</option>
                <option value="Banco">Cuenta Bancaria</option>
                <option value="Efectivo">Efectivo en mano</option>
              </select>
            </div>
          </div>

          {/* Imputación a Gasto del Mes (Opcional) */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: 4 }}>
              ¿Destinar este adelanto a un Gasto del Mes? (Opcional):
            </label>
            <select
              className="input"
              value={expenseId}
              onChange={e => setExpenseId(e.target.value)}
              style={{ background: 'var(--bg-input)' }}
            >
              <option value="">Ninguno — Gasto libre o uso personal</option>
              {expensesList.map(exp => {
                const quota = Math.round(exp.user_amount || exp.userAmount || exp.monthly_amount || exp.totalAmount || 0);
                const remaining = exp.remaining_amount !== undefined ? Math.round(exp.remaining_amount) : quota;
                return (
                  <option key={exp.id} value={exp.id}>
                    {exp.name} — Cuota: ${quota.toLocaleString('es-AR')}{remaining < quota ? ` (Resta: $${remaining.toLocaleString('es-AR')})` : ''}
                  </option>
                );
              })}
            </select>
            {expenseId ? (
              <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={14} />
                <span>Se descontará de tus obligaciones pendientes del mes y rebajará tu meta diaria.</span>
              </div>
            ) : (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 3 }}>
                Si compras comida o pagas un servicio con este adelanto, elígelo para abonarlo a tu presupuesto mensual.
              </div>
            )}
          </div>

          {/* Fecha y Notas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 18 }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: 4 }}>
                Fecha:
              </label>
              <input
                type="date"
                className="input"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: 4 }}>
                Notas / Referencia:
              </label>
              <input
                type="text"
                className="input"
                placeholder="Ej. Cobro Flash / Emergencia"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Recordatorio amigable */}
          <div style={{ padding: '10px 14px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: 'var(--radius-md)', marginBottom: 20, fontSize: '0.78rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <HelpCircle size={18} color="#60a5fa" />
            <span>Este retiro no altera tu rendimiento bruto, viajes ni odómetro. Solo actualiza tu saldo en la app y suma liquidez a tu caja real.</span>
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={loading || !numAmount} className="btn btn-primary">
              {loading ? 'Guardando...' : 'Registrar Adelanto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
