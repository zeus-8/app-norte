'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit3, Trash2, DollarSign, ChevronDown, ChevronUp, X } from 'lucide-react';

const FREQ_LABELS = {
  daily:    'Diaria',
  weekly:   'Semanal',
  biweekly: 'Quincenal',
  monthly:  'Mensual',
  none:     'Sin cuota fija (libre)',
};

const PERIODS_LABEL = {
  daily:    'Días para pagar',
  weekly:   'Semanas para pagar',
  biweekly: 'Quincenas para pagar',
  monthly:  'Meses para pagar',
};

const SUGGESTED_PERIODS = {
  daily:    [7, 15, 30, 60],
  weekly:   [4, 8, 12, 24],
  biweekly: [3, 6, 12, 24],
  monthly:  [3, 6, 12, 24],
};

const TODAY = new Date().toISOString().slice(0, 10);
const THIS_MONTH = TODAY.slice(0, 7);

function calcSuggestedAmount(totalAmount, frequency, periods) {
  const total = Number(totalAmount) || 0;
  if (total <= 0 || frequency === 'none') return 0;
  const n = Math.max(1, Number(periods) || 1);
  return Math.ceil(total / n);
}

// ─────────────────────────────────────────────────────────────
// Modal: Crear / Editar préstamo
// ─────────────────────────────────────────────────────────────
function LoanModal({ loan, onClose, onSaved }) {
  const isEdit = Boolean(loan);
  const [form, setForm] = useState({
    lenderName:         loan?.lenderName        || '',
    totalAmount:        loan?.totalAmount        || '',
    startDate:          loan?.startDate          || TODAY,
    scheduledFrequency: loan?.scheduledFrequency || 'monthly',
    numberOfPeriods:    '',
    scheduledAmount:    loan?.scheduledAmount > 0
      ? String(Math.round(Number(loan.scheduledAmount))) : '',
    notes:              loan?.notes              || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const isFree          = form.scheduledFrequency === 'none';
  const suggestedAmount = calcSuggestedAmount(form.totalAmount, form.scheduledFrequency, form.numberOfPeriods);
  const currentAmount   = Number(form.scheduledAmount) || 0;
  const amountTooLow    = !isFree && suggestedAmount > 0 && currentAmount > 0 && currentAmount < suggestedAmount;

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => {
      const next = { ...prev, [name]: value };
      if (['totalAmount', 'numberOfPeriods', 'scheduledFrequency'].includes(name)) {
        const suggested = calcSuggestedAmount(
          name === 'totalAmount'        ? value : next.totalAmount,
          name === 'scheduledFrequency' ? value : next.scheduledFrequency,
          name === 'numberOfPeriods'    ? value : next.numberOfPeriods,
        );
        if (suggested > 0) next.scheduledAmount = String(suggested);
        if (name === 'scheduledFrequency' && value === 'none') next.scheduledAmount = '';
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (amountTooLow) {
      setError(`La cuota ($${currentAmount.toLocaleString('es-AR')}) no puede ser menor a la mínima sugerida ($${suggestedAmount.toLocaleString('es-AR')})`);
      return;
    }
    setLoading(true);
    try {
      const url    = isEdit ? `/api/loans/${loan.id}` : '/api/loans';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lenderName:         form.lenderName,
          totalAmount:        Number(form.totalAmount),
          startDate:          form.startDate,
          scheduledFrequency: form.scheduledFrequency,
          scheduledAmount:    isFree ? 0 : (Number(form.scheduledAmount) || 0),
          notes:              form.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 500, padding: '28px 28px 24px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
            {isEdit ? '✏️ Editar Préstamo' : '🤝 Registrar Préstamo'}
          </h3>
          <button className="btn btn-sm btn-secondary" onClick={onClose} style={{ padding: '4px 8px' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Prestamista */}
          <div>
            <label className="label">¿A quién le debés?</label>
            <input className="input" name="lenderName" placeholder="Ej: Mi hermano, Banco X..."
              value={form.lenderName} onChange={handleChange} required />
          </div>

          {/* Monto + Fecha */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">Monto Total del Préstamo</label>
              <input className="input font-mono" name="totalAmount" type="number" min="1"
                placeholder="500000" value={form.totalAmount} onChange={handleChange} required />
            </div>
            <div>
              <label className="label">Fecha que lo tomaste</label>
              <input className="input" name="startDate" type="date"
                value={form.startDate} onChange={handleChange} required />
            </div>
          </div>

          {/* Frecuencia + Períodos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">Frecuencia de pago</label>
              <select className="input" name="scheduledFrequency"
                value={form.scheduledFrequency} onChange={handleChange}>
                {Object.entries(FREQ_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            {!isFree && (
              <div>
                <label className="label">{PERIODS_LABEL[form.scheduledFrequency] || 'Períodos'}</label>
                <input className="input font-mono" name="numberOfPeriods" type="number" min="1"
                  placeholder="Ej: 6" value={form.numberOfPeriods} onChange={handleChange} />
                {SUGGESTED_PERIODS[form.scheduledFrequency] && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
                    {SUGGESTED_PERIODS[form.scheduledFrequency].map(n => (
                      <button key={n} type="button" className="btn btn-sm btn-secondary"
                        style={{ fontSize: '0.68rem', padding: '2px 8px' }}
                        onClick={() => handleChange({ target: { name: 'numberOfPeriods', value: String(n) } })}>
                        {n}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Badge: cuota mínima calculada */}
          {!isFree && suggestedAmount > 0 && (
            <div style={{
              background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)',
              borderRadius: 10, padding: '10px 14px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Cuota mínima calculada
                </div>
                <div className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#a78bfa' }}>
                  ${suggestedAmount.toLocaleString('es-AR')}
                  <span style={{ fontSize: '0.72rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>
                    / {FREQ_LABELS[form.scheduledFrequency]?.toLowerCase().replace(' (libre)', '')}
                  </span>
                </div>
              </div>
              {form.numberOfPeriods > 0 && (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textAlign: 'right' }}>
                  en {form.numberOfPeriods}<br />{PERIODS_LABEL[form.scheduledFrequency]?.toLowerCase()}
                </div>
              )}
            </div>
          )}

          {/* Cuota editable (mínimo = sugerida) */}
          {!isFree && (
            <div>
              <label className="label">
                Cuota a pagar
                {suggestedAmount > 0 && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 400, marginLeft: 6 }}>
                    (no puede ser menor a ${suggestedAmount.toLocaleString('es-AR')})
                  </span>
                )}
              </label>
              <input
                className="input font-mono"
                name="scheduledAmount"
                type="number"
                min={suggestedAmount > 0 ? suggestedAmount : 1}
                placeholder={suggestedAmount > 0 ? String(suggestedAmount) : 'Ingresá el monto de la cuota'}
                value={form.scheduledAmount}
                onChange={handleChange}
                style={{ borderColor: amountTooLow ? 'rgba(239,68,68,0.6)' : undefined }}
              />
              {amountTooLow && (
                <div style={{ fontSize: '0.72rem', color: '#f87171', marginTop: 4 }}>
                  ⚠️ Con ${currentAmount.toLocaleString('es-AR')} / {FREQ_LABELS[form.scheduledFrequency]?.toLowerCase()} no alcanzará para cubrir el préstamo en el plazo indicado
                </div>
              )}
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="label">Notas (opcional)</label>
            <textarea className="input" name="notes" rows={2}
              placeholder="Condiciones del préstamo, acuerdos, etc."
              value={form.notes} onChange={handleChange} style={{ resize: 'vertical' }} />
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8, padding: '8px 12px', fontSize: '0.82rem', color: '#f87171',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading || amountTooLow}>
              {loading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Registrar Préstamo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Modal: Registrar pago
// ─────────────────────────────────────────────────────────────
function PaymentModal({ loan, onClose, onSaved }) {
  const [form, setForm] = useState({
    amount: loan.scheduledAmount > 0 ? String(Math.round(loan.scheduledAmount)) : '',
    date: TODAY,
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/loans/${loan.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(form.amount), date: form.date, notes: form.notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar pago');
      onSaved(data.message);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: '28px 28px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>💸 Registrar Pago</h3>
          <button className="btn btn-sm btn-secondary" onClick={onClose} style={{ padding: '4px 8px' }}>
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20 }}>
          Préstamo: <strong style={{ color: 'var(--text-main)' }}>{loan.lenderName}</strong>
          &nbsp;·&nbsp;Saldo: <strong className="font-mono" style={{ color: '#f87171' }}>
            ${Math.round(loan.balance).toLocaleString('es-AR')}
          </strong>
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">Monto a pagar</label>
              <input className="input font-mono" name="amount" type="number" min="1"
                max={loan.balance} placeholder="100000"
                value={form.amount} onChange={handleChange} required />
            </div>
            <div>
              <label className="label">Fecha del pago</label>
              <input className="input" name="date" type="date"
                value={form.date} onChange={handleChange} required />
            </div>
          </div>

          <div>
            <label className="label">Nota (opcional)</label>
            <input className="input" name="notes" placeholder="Adelanto de esta semana..."
              value={form.notes} onChange={handleChange} />
          </div>

          {/* Accesos rápidos */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[25, 50, 100].map(pct => {
              const quick = Math.round(loan.balance * pct / 100);
              return quick > 0 ? (
                <button key={pct} type="button" className="btn btn-sm btn-secondary"
                  onClick={() => setForm(f => ({ ...f, amount: String(quick) }))}
                  style={{ fontSize: '0.75rem' }}>
                  {pct}% (${quick.toLocaleString('es-AR')})
                </button>
              ) : null;
            })}
            {loan.scheduledAmount > 0 && (
              <button type="button" className="btn btn-sm btn-secondary"
                onClick={() => setForm(f => ({ ...f, amount: String(Math.round(loan.scheduledAmount)) }))}
                style={{ fontSize: '0.75rem', color: '#a78bfa' }}>
                Cuota (${Math.round(loan.scheduledAmount).toLocaleString('es-AR')})
              </button>
            )}
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8, padding: '8px 12px', fontSize: '0.82rem', color: '#f87171',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Registrando...' : 'Registrar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tarjeta individual de préstamo
// ─────────────────────────────────────────────────────────────
function LoanCard({ loan, onEdit, onPay, onCancel, onDeletePayment }) {
  const [expanded, setExpanded] = useState(false);

  const thisMonthPayments = loan.payments?.filter(p => p.month === THIS_MONTH) || [];
  const paidThisMonth     = thisMonthPayments.reduce((s, p) => s + Number(p.amount), 0);

  const isPaidOff   = loan.isPaidOff || loan.status === 'paid';
  const isCancelled = loan.status === 'cancelled';

  const statusColor = isPaidOff ? '#34d399' : isCancelled ? '#64748b' : '#a78bfa';
  const statusLabel = isPaidOff ? '✅ Saldado' : isCancelled ? '❌ Cancelado' : '🔄 Activo';

  return (
    <div style={{
      background: 'rgba(0,0,0,0.25)',
      border: `1px solid ${isPaidOff ? 'rgba(52,211,153,0.3)' : 'var(--border-color)'}`,
      borderRadius: 'var(--radius-md)',
      padding: '16px 18px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>
              {loan.lenderName}
            </span>
            <span style={{
              fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px',
              borderRadius: 6, background: `${statusColor}20`, color: statusColor,
              border: `1px solid ${statusColor}40`,
            }}>
              {statusLabel}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Desde {loan.startDate} · {FREQ_LABELS[loan.scheduledFrequency] || 'Sin cuota fija'}
            {loan.scheduledAmount > 0 && ` · Cuota: $${Math.round(loan.scheduledAmount).toLocaleString('es-AR')}`}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Saldo</div>
          <div className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: isPaidOff ? '#34d399' : '#f87171' }}>
            ${Math.round(loan.balance).toLocaleString('es-AR')}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            de ${Math.round(loan.totalAmount).toLocaleString('es-AR')}
          </div>
        </div>
      </div>

      {/* Barra de progreso */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${loan.progressPct}%`,
            background: isPaidOff
              ? 'linear-gradient(90deg, #34d399, #10b981)'
              : 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
            borderRadius: 4, transition: 'width 0.5s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Pagado: <strong className="font-mono">${Math.round(loan.totalPaid).toLocaleString('es-AR')}</strong>
          </span>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: statusColor }}>{loan.progressPct}%</span>
        </div>
      </div>

      {/* Info del mes */}
      {!isPaidOff && !isCancelled && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: '0.75rem', marginBottom: 12 }}>
          <span style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 6, padding: '3px 8px', color: '#c084fc' }}>
            💰 Este mes: ${Math.round(paidThisMonth).toLocaleString('es-AR')}
          </span>
          {loan.scheduledAmount > 0 && paidThisMonth >= loan.scheduledAmount && (
            <span style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 6, padding: '3px 8px', color: '#34d399' }}>
              ✅ Cuota cubierta
            </span>
          )}
          {loan.scheduledAmount > 0 && paidThisMonth < loan.scheduledAmount && (
            <span style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 6, padding: '3px 8px', color: '#fbbf24' }}>
              ⏳ Falta cuota: ${Math.round(loan.scheduledAmount - paidThisMonth).toLocaleString('es-AR')}
            </span>
          )}
        </div>
      )}

      {/* Acciones */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {!isPaidOff && !isCancelled && (
          <button className="btn btn-sm btn-primary" onClick={() => onPay(loan)} style={{ fontSize: '0.78rem' }}>
            <DollarSign size={13} /> Registrar Pago
          </button>
        )}
        <button className="btn btn-sm btn-secondary" onClick={() => onEdit(loan)} style={{ fontSize: '0.78rem' }}>
          <Edit3 size={13} /> Editar
        </button>
        {!isCancelled && (
          <button className="btn btn-sm btn-secondary"
            onClick={() => { if (window.confirm(`¿Cancelar el préstamo con ${loan.lenderName}?`)) onCancel(loan.id); }}
            style={{ fontSize: '0.78rem', color: '#f87171' }}>
            <Trash2 size={13} /> Cancelar
          </button>
        )}
        {loan.payments?.length > 0 && (
          <button className="btn btn-sm btn-secondary" onClick={() => setExpanded(e => !e)}
            style={{ fontSize: '0.78rem', marginLeft: 'auto' }}>
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {loan.payments.length} {loan.payments.length === 1 ? 'pago' : 'pagos'}
          </button>
        )}
      </div>

      {/* Historial de pagos */}
      {expanded && loan.payments?.length > 0 && (
        <div style={{ marginTop: 12, borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Historial de pagos
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {loan.payments.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{p.date}</span>
                  {p.notes && <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>"{p.notes}"</span>}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="font-mono" style={{ fontWeight: 700, color: '#34d399' }}>
                    +${Math.round(Number(p.amount)).toLocaleString('es-AR')}
                  </span>
                  <button
                    onClick={() => { if (window.confirm('¿Eliminar este pago?')) onDeletePayment(loan.id, p.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 2 }}>
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────
export default function LoanSection({ onLoansChanged }) {
  const [loans, setLoans]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [loanModal, setLoanModal] = useState(null);
  const [payModal, setPayModal]   = useState(null);
  const [toast, setToast]         = useState('');

  const loadLoans = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/loans');
      if (res.ok) {
        const data = await res.json();
        setLoans(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadLoans(); }, [loadLoans]);

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 4000); };
  const handleSaved    = () => { loadLoans(); if (onLoansChanged) onLoansChanged(); };
  const handlePaySaved = msg => { showToast(msg); loadLoans(); if (onLoansChanged) onLoansChanged(); };

  const handleCancel = async id => {
    const res = await fetch(`/api/loans/${id}`, { method: 'DELETE' });
    if (res.ok) { showToast('Préstamo cancelado'); handleSaved(); }
  };

  const handleDeletePayment = async (loanId, paymentId) => {
    const res = await fetch(`/api/loans/${loanId}/payments?paymentId=${paymentId}`, { method: 'DELETE' });
    if (res.ok) { showToast('Pago eliminado'); handleSaved(); }
  };

  const activeLoans    = loans.filter(l => l.status !== 'cancelled');
  const cancelledLoans = loans.filter(l => l.status === 'cancelled');

  const totalDebt = activeLoans.reduce((s, l) => s + l.balance, 0);
  const paidThisMonth = activeLoans.reduce((s, l) => {
    const mp = l.payments?.filter(p => p.month === THIS_MONTH) || [];
    return s + mp.reduce((ss, p) => ss + Number(p.amount), 0);
  }, 0);
  const scheduledThisMonth = activeLoans.reduce((s, l) => {
    if (l.scheduledAmount > 0 && l.scheduledFrequency === 'monthly') return s + l.scheduledAmount;
    return s;
  }, 0);

  return (
    <div className="card" style={{ marginBottom: 24, padding: '20px 22px' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 2000,
          background: 'rgba(15,23,42,0.97)', border: '1px solid rgba(52,211,153,0.4)',
          borderRadius: 12, padding: '12px 20px',
          color: '#34d399', fontWeight: 700, fontSize: '0.9rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          {toast}
        </div>
      )}

      {/* Modales */}
      {loanModal && (
        <LoanModal
          loan={loanModal === 'new' ? null : loanModal}
          onClose={() => setLoanModal(null)}
          onSaved={handleSaved}
        />
      )}
      {payModal && (
        <PaymentModal
          loan={payModal}
          onClose={() => setPayModal(null)}
          onSaved={handlePaySaved}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
            🤝 Préstamos Activos
          </h3>
          {totalDebt > 0 && (
            <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Deuda total: <strong className="font-mono" style={{ color: '#f87171', marginLeft: 4 }}>
                ${Math.round(totalDebt).toLocaleString('es-AR')}
              </strong>
              {scheduledThisMonth > 0 && (
                <> · Cuota mensual: <strong className="font-mono" style={{ color: '#a78bfa' }}>
                  ${Math.round(scheduledThisMonth).toLocaleString('es-AR')}
                </strong></>
              )}
              {paidThisMonth > 0 && (
                <> · Pagado este mes: <strong className="font-mono" style={{ color: '#34d399' }}>
                  ${Math.round(paidThisMonth).toLocaleString('es-AR')}
                </strong></>
              )}
            </p>
          )}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setLoanModal('new')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> Nuevo Préstamo
        </button>
      </div>

      {/* Contenido */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
          Cargando préstamos...
        </div>
      ) : activeLoans.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '32px 20px', color: 'var(--text-muted)',
          borderRadius: 12, border: '1px dashed var(--border-color)',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: 8, opacity: 0.5 }}>🤝</div>
          <p style={{ fontWeight: 700, marginBottom: 4 }}>Sin préstamos activos</p>
          <p style={{ fontSize: '0.8rem' }}>Registrá un préstamo para hacer seguimiento del saldo y los pagos</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {activeLoans.map(loan => (
            <LoanCard key={loan.id} loan={loan}
              onEdit={l => setLoanModal(l)}
              onPay={l => setPayModal(l)}
              onCancel={handleCancel}
              onDeletePayment={handleDeletePayment}
            />
          ))}
        </div>
      )}

      {cancelledLoans.length > 0 && (
        <details style={{ marginTop: 16 }}>
          <summary style={{ fontSize: '0.78rem', color: 'var(--text-dim)', cursor: 'pointer', userSelect: 'none' }}>
            {cancelledLoans.length} préstamo{cancelledLoans.length > 1 ? 's' : ''} cancelado{cancelledLoans.length > 1 ? 's' : ''}
          </summary>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cancelledLoans.map(loan => (
              <LoanCard key={loan.id} loan={loan}
                onEdit={l => setLoanModal(l)}
                onPay={() => {}}
                onCancel={() => {}}
                onDeletePayment={handleDeletePayment}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
