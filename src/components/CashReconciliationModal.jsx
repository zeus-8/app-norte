'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Scale, 
  Wallet, 
  Building2, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Trash2, 
  ArrowRight,
  TrendingDown,
  TrendingUp,
  HelpCircle,
  PlusCircle,
  Smartphone
} from 'lucide-react';

export default function CashReconciliationModal({
  isOpen,
  onClose,
  onSaved,
  currentMonth,
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Inputs del arqueo
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [realCash, setRealCash] = useState('');
  const [realBank, setRealBank] = useState('');
  const [realApps, setRealApps] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('none');
  const [expenseName, setExpenseName] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Varios / Otros');
  const [notes, setNotes] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/cash-reconciliation?month=${currentMonth || new Date().toISOString().slice(0, 7)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al cargar arqueo');
      setData(json);
      if (json.totalPendingApps !== undefined) {
        setRealApps(String(Math.round(json.totalPendingApps)));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    if (isOpen) {
      loadData();
      setDate(new Date().toISOString().slice(0, 10));
      setRealCash('');
      setRealBank('');
      setAdjustmentType('none');
      setExpenseName('');
      setExpenseCategory('Varios / Otros');
      setNotes('');
      setError('');
      setSuccessMsg('');
    }
  }, [isOpen, loadData]);

  if (!isOpen) return null;

  const theoreticalBalance = data ? Number(data.theoreticalBalance || 0) : 0;
  const cashNum = parseFloat(realCash) || 0;
  const bankNum = parseFloat(realBank) || 0;
  const appsNum = parseFloat(realApps) || 0;
  const totalReal = cashNum + bankNum + appsNum;
  const hasInput = realCash !== '' || realBank !== '' || realApps !== '';
  const difference = hasInput ? totalReal - theoreticalBalance : 0;
  const absDiff = Math.abs(difference);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasInput) {
      setError('Por favor ingresa los montos en efectivo, bancos o apps para realizar el arqueo.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const res = await fetch('/api/cash-reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          realCash: cashNum,
          realBank: bankNum,
          realApps: appsNum,
          theoreticalBalance,
          difference,
          adjustmentType,
          adjustmentAmount: adjustmentType !== 'none' ? absDiff : 0,
          expenseName,
          expenseCategory,
          notes,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Error al guardar arqueo');

      setSuccessMsg('¡Arqueo de caja registrado correctamente!');
      await loadData();
      if (onSaved) onSaved();

      setTimeout(() => {
        setSuccessMsg('');
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este registro de arqueo?')) return;
    try {
      const res = await fetch(`/api/cash-reconciliation/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al eliminar');
      }
      await loadData();
      if (onSaved) onSaved();
    } catch (err) {
      alert(err.message);
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
        style={{ maxWidth: 840, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Encabezado */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 14, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
              <Scale size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Arqueo & Conciliación de Caja
              </h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Verificación del Saldo Teórico del Sistema vs Dinero Real Líquido ({currentMonth})
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

        {successMsg && (
          <div className="card" style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--accent-emerald)', color: '#34d399', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem' }}>
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
            Calculando saldo teórico y obligaciones del mes...
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Comparativa de 2 Columnas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
              
              {/* Columna 1: Sistema (Teórico) */}
              <div className="card" style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--border-color)', padding: 18, borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 800, color: 'var(--text-dim)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>1. Saldo Teórico del Sistema</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.88rem', marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Ganancia neta jornadas:</span>
                    <strong style={{ color: '#34d399' }}>+${Math.round(data?.netIncome || 0).toLocaleString('es-AR')}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Gastos pagados del mes:</span>
                    <strong style={{ color: '#f87171' }}>-${Math.round(data?.totalPaidObligations || 0).toLocaleString('es-AR')}</strong>
                  </div>
                  {data?.totalSavingsTransfers > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Ahorro / Retiros previos:</span>
                      <strong style={{ color: '#fbbf24' }}>-${Math.round(data.totalSavingsTransfers).toLocaleString('es-AR')}</strong>
                    </div>
                  )}
                  {data?.totalDirectAdjustments !== 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Ajustes previos de caja:</span>
                      <strong>{data.totalDirectAdjustments > 0 ? '+' : ''}${Math.round(data.totalDirectAdjustments).toLocaleString('es-AR')}</strong>
                    </div>
                  )}
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>Disponible Teórico:</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#60a5fa' }}>
                    ${Math.round(theoreticalBalance).toLocaleString('es-AR')}
                  </span>
                </div>
              </div>

              {/* Columna 2: Realidad (Declarado por el Chofer) */}
              <div className="card" style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: 18, borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 800, color: '#60a5fa', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>2. Dinero Real en Mano & Cuentas</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Wallet size={14} className="text-emerald" />
                      <span>Efectivo en Billetera ($)</span>
                    </label>
                    <input
                      type="number"
                      className="input"
                      placeholder="Ej. 60000"
                      value={realCash}
                      onChange={e => setRealCash(e.target.value)}
                      style={{ background: 'rgba(0, 0, 0, 0.3)' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Building2 size={14} className="text-cyan" />
                      <span>Banco / Mercado Pago ($)</span>
                    </label>
                    <input
                      type="number"
                      className="input"
                      placeholder="Ej. 50000"
                      value={realBank}
                      onChange={e => setRealBank(e.target.value)}
                      style={{ background: 'rgba(0, 0, 0, 0.3)' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                        <Smartphone size={14} style={{ color: '#a78bfa' }} />
                        <span>Acumulado en Apps a Cobrar ($)</span>
                      </label>
                      {data?.totalPendingApps > 0 && (
                        <span style={{ fontSize: '0.68rem', color: '#a78bfa', background: 'rgba(167, 139, 250, 0.12)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                          Uber/Cabify Semanal
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      className="input"
                      placeholder="Ej. 120000"
                      value={realApps}
                      onChange={e => setRealApps(e.target.value)}
                      style={{ background: 'rgba(0, 0, 0, 0.3)' }}
                    />
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 3 }}>
                      Prellenado según jornadas menos adelantos. Suma a tu patrimonio líquido real.
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>Total Real Declarado:</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 900, color: hasInput ? 'var(--text-main)' : 'var(--text-dim)' }}>
                    ${Math.round(totalReal).toLocaleString('es-AR')}
                  </span>
                </div>
              </div>

            </div>

            {/* Banner de Brecha / Diferencia en Tiempo Real */}
            {hasInput && (
              <div 
                className="card" 
                style={{ 
                  padding: '16px 20px', 
                  marginBottom: 20, 
                  background: difference === 0 
                    ? 'rgba(16, 185, 129, 0.15)' 
                    : difference < 0 
                    ? 'rgba(239, 68, 68, 0.15)' 
                    : 'rgba(245, 158, 11, 0.15)',
                  border: `1px solid ${difference === 0 ? '#10b981' : difference < 0 ? '#ef4444' : '#f59e0b'}`,
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {difference === 0 ? (
                      <CheckCircle2 size={28} className="text-emerald" />
                    ) : difference < 0 ? (
                      <TrendingDown size={28} className="text-red" />
                    ) : (
                      <TrendingUp size={28} style={{ color: '#fbbf24' }} />
                    )}
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: difference === 0 ? '#34d399' : difference < 0 ? '#f87171' : '#fbbf24' }}>
                        {difference === 0 
                          ? '🎯 ¡Caja perfectamente cuadrada!' 
                          : difference < 0 
                          ? `Faltante de dinero en caja: -$${absDiff.toLocaleString('es-AR')}` 
                          : `Sobrante de dinero en caja: +$${absDiff.toLocaleString('es-AR')}`}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
                        {difference === 0 
                          ? 'El dinero físico y virtual en tus cuentas coincide exactamente con lo registrado en el sistema.' 
                          : difference < 0 
                          ? 'Tienes menos dinero disponible del que calcula el sistema. Puedes justificarlo abajo para blanquear la cuenta.' 
                          : 'Tienes más dinero disponible del que calcula el sistema.'}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '1.3rem', fontWeight: 900, fontFamily: 'monospace' }}>
                    {difference >= 0 ? '+' : ''}${Math.round(difference).toLocaleString('es-AR')}
                  </div>
                </div>

                {/* Si hay diferencia: Acciones de Blanqueo / Conciliación */}
                {difference !== 0 && (
                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: 8 }}>
                      ¿Cómo deseas asentar o resolver esta diferencia de ${absDiff.toLocaleString('es-AR')}?
                    </label>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, marginBottom: 12 }}>
                      <button
                        type="button"
                        onClick={() => setAdjustmentType('unrecorded_expense')}
                        className={`btn btn-sm ${adjustmentType === 'unrecorded_expense' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ justifyContent: 'flex-start' }}
                      >
                        <span>☕ Gasto no anotado</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdjustmentType('savings_transfer')}
                        className={`btn btn-sm ${adjustmentType === 'savings_transfer' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ justifyContent: 'flex-start' }}
                      >
                        <span>🏦 Ahorro / Retiro externo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdjustmentType('direct_adjustment')}
                        className={`btn btn-sm ${adjustmentType === 'direct_adjustment' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ justifyContent: 'flex-start' }}
                      >
                        <span>⚖️ Ajuste directo de caja</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdjustmentType('none')}
                        className={`btn btn-sm ${adjustmentType === 'none' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ justifyContent: 'flex-start' }}
                      >
                        <span>Solo dejar constancia</span>
                      </button>
                    </div>

                    {/* Formulario rápido de gasto no anotado */}
                    {adjustmentType === 'unrecorded_expense' && (
                      <div className="card" style={{ padding: 12, background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--border-color)', marginBottom: 10 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#60a5fa', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <PlusCircle size={14} />
                          <span>Crear gasto automático por ${absDiff.toLocaleString('es-AR')} (cuadrará la cuenta inmediatamente)</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Concepto del gasto:</label>
                            <input
                              type="text"
                              className="input"
                              placeholder="Ej. Almuerzo / Café / Farmacia"
                              value={expenseName}
                              onChange={e => setExpenseName(e.target.value)}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Categoría:</label>
                            <select
                              className="input"
                              value={expenseCategory}
                              onChange={e => setExpenseCategory(e.target.value)}
                            >
                              <option value="Varios / Otros">Varios / Otros</option>
                              <option value="Supermercado">Supermercado</option>
                              <option value="Transporte / Auto">Transporte / Auto</option>
                              <option value="Servicios / Hogar">Servicios / Hogar</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {adjustmentType === 'direct_adjustment' && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                        💡 Este ajuste directo descontará la diferencia del cálculo de tu meta diaria, para que el ritmo restante refleje exactamente el dinero real que te falta para cubrir el mes.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Fecha y Notas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Fecha del Arqueo:
                </label>
                <input
                  type="date"
                  className="input"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Observaciones / Notas (opcional):
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej. Arqueo cierre de semana / billetera contada"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Botones de Acción */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid var(--border-color)', paddingTop: 14 }}>
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancelar
              </button>
              <button type="submit" disabled={saving || !hasInput} className="btn btn-primary">
                {saving ? 'Guardando arqueo...' : 'Guardar y Cuadrar Caja'}
              </button>
            </div>
          </form>
        )}

        {/* Historial de Arqueos del Mes */}
        {data?.reconciliations?.length > 0 && (
          <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 12px 0', color: 'var(--text-main)' }}>
              Historial de Arqueos Realizados ({data.reconciliations.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.reconciliations.map(rec => {
                const diff = Number(rec.difference) || 0;
                return (
                  <div 
                    key={rec.id} 
                    className="card" 
                    style={{ padding: '10px 14px', background: 'rgba(0, 0, 0, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}
                  >
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{rec.date}</span>
                        <span style={{ color: diff === 0 ? '#34d399' : diff < 0 ? '#f87171' : '#fbbf24', fontSize: '0.8rem' }}>
                          {diff === 0 ? '✓ Cuadrado' : `${diff > 0 ? '+' : ''}$${Math.round(diff).toLocaleString('es-AR')}`}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Teórico: ${Math.round(Number(rec.theoreticalBalance)).toLocaleString('es-AR')} • 
                        Real: ${Math.round(Number(rec.totalReal)).toLocaleString('es-AR')} 
                        (Efectivo: ${Math.round(Number(rec.realCash)).toLocaleString('es-AR')} / Banco: ${Math.round(Number(rec.realBank)).toLocaleString('es-AR')})
                        {rec.notes && ` • "${rec.notes}"`}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(rec.id)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 6px', color: '#f87171' }}
                      title="Eliminar este arqueo"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
