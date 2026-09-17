'use client';

import React, { useState, useEffect } from 'react';
import { X, CreditCard, Receipt, Users, AlertCircle } from 'lucide-react';

const CATEGORIES = [
  'Hogar',
  'Alquiler',
  'Servicios (Luz/Gas/Agua)',
  'Comida / Supermercado',
  'Tarjeta VISA',
  'Tarjeta MASTER',
  'Auto / Combustible',
  'Seguro',
  'Salud / Farmacia',
  'Personal',
  'Educación',
  'Otros'
];

const PAYMENT_METHODS = ['Efectivo', 'Transferencia', 'Débito', 'VISA', 'MASTER', 'Otro'];

export default function ExpenseModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  currentMonth
}) {
  const [household, setHousehold] = useState(null);
  const [householdId, setHouseholdId] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Hogar');
  const [type, setType] = useState('fixed'); // 'fixed' | 'one_time' | 'installment'
  const [totalAmount, setTotalAmount] = useState('');
  const [installmentCount, setInstallmentCount] = useState('12');
  const [startMonth, setStartMonth] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [userSharePct, setUserSharePct] = useState('60');
  const [paymentMethod, setPaymentMethod] = useState('Transferencia');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/household')
        .then(r => r.json())
        .then(data => {
          if (data.household) {
            setHousehold(data.household);
          } else {
            setHousehold(null);
          }
        })
        .catch(err => console.error('Error fetching household:', err));
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setCategory(initialData.category || 'Hogar');
      setType(initialData.type || 'fixed');
      setTotalAmount(initialData.totalAmount || initialData.total_amount || '');
      setInstallmentCount(String(initialData.installmentCount || initialData.installment_count || 1));
      setStartMonth(initialData.startMonth || initialData.start_month || currentMonth || new Date().toISOString().slice(0, 7));
      setHouseholdId(initialData.householdId || initialData.household_id || '');
      setIsShared(Boolean(initialData.isShared || initialData.is_shared || initialData.householdId || initialData.household_id));
      setUserSharePct(String(initialData.userSharePct !== undefined ? initialData.userSharePct : (initialData.user_share_pct !== undefined ? initialData.user_share_pct : 100)));
      setPaymentMethod(initialData.paymentMethod || initialData.payment_method || 'Efectivo');
      setNotes(initialData.notes || '');
    } else {
      setName('');
      setCategory('Hogar');
      setType('fixed');
      setTotalAmount('');
      setInstallmentCount('12');
      setStartMonth(currentMonth || new Date().toISOString().slice(0, 7));
      setHouseholdId('');
      setIsShared(false);
      setUserSharePct('100');
      setPaymentMethod('Transferencia');
      setNotes('');
    }
    setError('');
  }, [initialData, isOpen, currentMonth]);

  if (!isOpen) return null;

  const total = Number(totalAmount) || 0;
  const count = type === 'installment' ? Math.max(1, Number(installmentCount) || 1) : 1;
  const monthlyInstAmount = (total / count);
  const userPct = isShared ? Number(userSharePct) || 100 : 100;
  const userMonthlyAmount = Math.round(monthlyInstAmount * (userPct / 100));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Por favor indica el nombre o concepto del gasto');
      return;
    }

    if (total <= 0) {
      setError('El monto total debe ser mayor a $0');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        id: initialData?.id,
        name: name.trim(),
        category,
        type,
        totalAmount: total,
        installmentCount: count,
        installmentAmount: Number(monthlyInstAmount.toFixed(2)),
        startMonth,
        householdId: (isShared && householdId) ? householdId : null,
        isShared,
        userSharePct: userPct,
        paymentMethod,
        notes,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Error al guardar el gasto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', padding: '16px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
        
        {/* Header Modal */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', margin: 0 }}>
              {initialData ? 'Editar Gasto / Cuota' : 'Nuevo Gasto o Compra en Cuotas'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Configura gastos recurrentes, de 1 solo pago o compras en cuotas sin interés
            </p>
          </div>
          <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: '#fb7185', fontSize: '0.85rem', marginBottom: '16px' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Tipo de Gasto */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
              TIPO DE GASTO
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setType('fixed')}
                style={{
                  padding: '8px',
                  borderRadius: 'var(--radius-md)',
                  border: type === 'fixed' ? '2px solid #10b981' : '1px solid var(--border-color)',
                  background: type === 'fixed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0,0,0,0.2)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textAlign: 'center'
                }}
              >
                📌 Fijo Mensual
              </button>

              <button
                type="button"
                onClick={() => setType('installment')}
                style={{
                  padding: '8px',
                  borderRadius: 'var(--radius-md)',
                  border: type === 'installment' ? '2px solid #8b5cf6' : '1px solid var(--border-color)',
                  background: type === 'installment' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(0,0,0,0.2)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textAlign: 'center'
                }}
              >
                💳 En Cuotas
              </button>

              <button
                type="button"
                onClick={() => setType('one_time')}
                style={{
                  padding: '8px',
                  borderRadius: 'var(--radius-md)',
                  border: type === 'one_time' ? '2px solid #f59e0b' : '1px solid var(--border-color)',
                  background: type === 'one_time' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0,0,0,0.2)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textAlign: 'center'
                }}
              >
                ⚡ 1 Solo Pago
              </button>
            </div>
          </div>

          {/* Nombre y Categoría */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                CONCEPTO / NOMBRE
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Alquiler o Lavarropas"
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'white', fontWeight: 600 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                CATEGORÍA
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'white' }}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Montos y Cuotas */}
          <div style={{ display: 'grid', gridTemplateColumns: type === 'installment' ? '1.2fr 0.8fr' : '1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                {type === 'installment' ? 'MONTO TOTAL DE LA COMPRA ($)' : 'MONTO ($)'}
              </label>
              <input
                type="number"
                step="any"
                inputMode="decimal"
                required
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="Ej. 120000"
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'white', fontSize: '1.1rem', fontWeight: 800 }}
              />
            </div>

            {type === 'installment' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  CANTIDAD CUOTAS
                </label>
                <select
                  value={installmentCount}
                  onChange={(e) => setInstallmentCount(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'white', fontWeight: 700 }}
                >
                  {[2, 3, 6, 9, 12, 18, 24].map(n => <option key={n} value={n}>{n} cuotas</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Mes de Inicio y Medio de Pago */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                MES DE INICIO (AAAA-MM)
              </label>
              <input
                type="month"
                required
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'white' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                MEDIO DE PAGO
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'white' }}
              >
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Gasto Compartido del Hogar */}
          <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isShared ? '10px' : '0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={16} className="text-blue" />
                <div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white', display: 'block' }}>
                    ¿Es un gasto compartido del hogar?
                  </span>
                  {household && (
                    <span style={{ fontSize: '0.72rem', color: '#38bdf8' }}>
                      Asociado a: {household.name} (Tu % base: {Number(household.userSharePct)}%)
                    </span>
                  )}
                </div>
              </div>
              <input
                type="checkbox"
                checked={isShared}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsShared(checked);
                  if (checked) {
                    if (household) {
                      setHouseholdId(household.id);
                      setUserSharePct(String(Number(household.userSharePct) || 60));
                    } else if (userSharePct === '100') {
                      setUserSharePct('60');
                    }
                  } else {
                    setHouseholdId('');
                  }
                }}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </div>

            {isShared && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tu porcentaje a pagar:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={userSharePct}
                    onChange={(e) => setUserSharePct(e.target.value)}
                    style={{ width: '60px', padding: '4px 8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'white', textAlign: 'center', fontWeight: 700 }}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>%</span>
                </div>
              </div>
            )}
          </div>

          {/* Tarjeta de Resumen en Vivo */}
          <div style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: 'var(--radius-md)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TU CUOTA / MONTO MENSUAL</div>
              <div className="font-mono text-purple" style={{ fontSize: '1.35rem', fontWeight: 800 }}>
                ${userMonthlyAmount.toLocaleString()}
              </div>
            </div>
            {type === 'installment' && (
              <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                <div>{count} cuotas de ${Math.round(monthlyInstAmount).toLocaleString()}</div>
                <div>{isShared ? `Tu parte: ${userPct}%` : '100% tuyo'}</div>
              </div>
            )}
          </div>

          {/* Notas */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
              NOTAS / RECORDATORIO
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Débito automático día 10"
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'white' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: '6px' }}
          >
            <span>{loading ? 'Guardando...' : (initialData ? 'Actualizar Gasto' : 'Guardar Gasto')}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
