'use client';

import React, { useState, useEffect } from 'react';
import { X, DollarSign, Fuel, Gauge, Clock, Navigation, AlertCircle, Sparkles } from 'lucide-react';

export default function DailyLogModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  currentOdometer = 0,
  activeApps = ['uber', 'cabify', 'didi']
}) {
  const [date, setDate] = useState('');
  const [grossIncome, setGrossIncome] = useState('');
  const [appBreakdown, setAppBreakdown] = useState({});
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [fuelExpense, setFuelExpense] = useState('');
  const [otherExpense, setOtherExpense] = useState('');
  const [odometerKm, setOdometerKm] = useState('');
  const [hoursWorked, setHoursWorked] = useState('');
  const [minutesWorked, setMinutesWorked] = useState('');
  const [tripsCount, setTripsCount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setDate(initialData.date || '');
      setGrossIncome(initialData.grossIncome || initialData.gross_income || '');
      setAppBreakdown(initialData.appBreakdown || initialData.app_breakdown || {});
      setFuelExpense(initialData.fuelExpense || initialData.fuel_expense || '');
      setOtherExpense(initialData.otherExpense || initialData.other_expense || '');
      setOdometerKm(initialData.odometerKm || initialData.odometer_km || '');
      
      const totalMins = initialData.minutesWorked || initialData.minutes_worked || (initialData.hours_worked ? Math.round(initialData.hours_worked * 60) : 0);
      setHoursWorked(Math.floor(totalMins / 60) || '');
      setMinutesWorked(totalMins % 60 || '');
      setTripsCount(initialData.tripsCount || initialData.trips_count || '');
      setNotes(initialData.notes || '');
    } else {
      const today = new Date().toISOString().slice(0, 10);
      setDate(today);
      setGrossIncome('');
      setAppBreakdown({});
      setShowBreakdown(false);
      setFuelExpense('');
      setOtherExpense('');
      setOdometerKm(currentOdometer ? String(currentOdometer) : '');
      setHoursWorked('');
      setMinutesWorked('');
      setTripsCount('');
      setNotes('');
    }
    setError('');
  }, [initialData, isOpen, currentOdometer]);

  if (!isOpen) return null;

  // Cálculo en tiempo real de ganancia limpia y $/hora
  const gross = Number(grossIncome) || 0;
  const fuel = Number(fuelExpense) || 0;
  const other = Number(otherExpense) || 0;
  const net = gross - fuel - other;
  const totalMins = (Number(hoursWorked) || 0) * 60 + (Number(minutesWorked) || 0);
  const hourlyNet = totalMins > 0 ? Math.round(net / (totalMins / 60)) : 0;

  const handleAppAmountChange = (app, val) => {
    const next = { ...appBreakdown, [app]: Number(val) || 0 };
    setAppBreakdown(next);
    const sum = Object.values(next).reduce((a, b) => a + b, 0);
    setGrossIncome(sum > 0 ? String(sum) : '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!date) {
      setError('Por favor indica la fecha de la jornada');
      return;
    }

    if (gross <= 0) {
      setError('Debes ingresar la facturación bruta (mayor a $0)');
      return;
    }

    const odoNum = Number(odometerKm) || 0;
    if (currentOdometer > 0 && odoNum > 0 && odoNum < currentOdometer && !initialData) {
      setError(`El odómetro (${odoNum.toLocaleString()} km) no puede ser inferior al último registrado (${currentOdometer.toLocaleString()} km)`);
      return;
    }

    setLoading(true);
    try {
      await onSave({
        id: initialData?.id,
        date,
        grossIncome: gross,
        appBreakdown,
        fuelExpense: fuel,
        otherExpense: other,
        odometerKm: odoNum,
        minutesWorked: totalMins,
        tripsCount: Number(tripsCount) || 0,
        notes,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Error al guardar la jornada');
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
              {initialData ? 'Editar Jornada' : 'Cargar Jornada de Trabajo'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Mide tus ingresos multiapp, combustible y tiempo trabajado
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
          
          {/* Fecha */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
              FECHA DE LA JORNADA
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'white' }}
            />
          </div>

          {/* Facturación y desglose multiapp */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                FACTURACIÓN BRUTA TOTAL ($)
              </label>
              <button
                type="button"
                onClick={() => setShowBreakdown(!showBreakdown)}
                style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
              >
                {showBreakdown ? 'Ingresar total directo' : '+ Desglosar por App (Uber, Cabify...)'}
              </button>
            </div>

            {!showBreakdown ? (
              <input
                type="number"
                step="any"
                inputMode="decimal"
                required
                value={grossIncome}
                onChange={(e) => setGrossIncome(e.target.value)}
                placeholder="Ej. 65000"
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'white', fontWeight: 700, fontSize: '1.1rem' }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                {activeApps.map(app => (
                  <div key={app} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'capitalize', color: 'white' }}>{app}:</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={appBreakdown[app] || ''}
                      onChange={(e) => handleAppAmountChange(app, e.target.value)}
                      placeholder="$ 0"
                      style={{ width: '140px', padding: '6px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'white', textAlign: 'right' }}
                    />
                  </div>
                ))}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.9rem' }}>
                  <span>Total Calculado:</span>
                  <span className="font-mono text-emerald">${gross.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Combustible y Otros Gastos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                COMBUSTIBLE (GNC/NAFTA)
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={fuelExpense}
                onChange={(e) => setFuelExpense(e.target.value)}
                placeholder="Ej. 12000"
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: '#f87171', fontWeight: 700 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                OTROS GASTOS (PEAJES, ETC)
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={otherExpense}
                onChange={(e) => setOtherExpense(e.target.value)}
                placeholder="Ej. 1500"
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: '#fbbf24' }}
              />
            </div>
          </div>

          {/* Odómetro y Viajes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                ODÓMETRO FINAL (KM)
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={odometerKm}
                onChange={(e) => setOdometerKm(e.target.value)}
                placeholder={currentOdometer ? `Último: ${currentOdometer.toLocaleString()}` : 'Ej. 145200'}
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: '#38bdf8', fontWeight: 700 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                CANTIDAD DE VIAJES
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={tripsCount}
                onChange={(e) => setTripsCount(e.target.value)}
                placeholder="Ej. 18"
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'white' }}
              />
            </div>
          </div>

          {/* Horas y Minutos Exactos */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
              TIEMPO DEDICADO EXACTO
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px' }}>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="24"
                  value={hoursWorked}
                  onChange={(e) => setHoursWorked(e.target.value)}
                  placeholder="0"
                  style={{ width: '100%', padding: '10px 0', background: 'none', border: 'none', color: 'white', fontWeight: 700, textAlign: 'center' }}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>horas</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px' }}>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="59"
                  value={minutesWorked}
                  onChange={(e) => setMinutesWorked(e.target.value)}
                  placeholder="0"
                  style={{ width: '100%', padding: '10px 0', background: 'none', border: 'none', color: 'white', fontWeight: 700, textAlign: 'center' }}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>minutos</span>
              </div>
            </div>
          </div>

          {/* Tarjeta de Resumen en Vivo */}
          <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 'var(--radius-md)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>GANANCIA LIMPIA DEL DÍA</div>
              <div className="font-mono text-emerald" style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                ${net.toLocaleString()}
              </div>
            </div>
            {hourlyNet > 0 && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>RENDIMIENTO POR HORA</div>
                <div className="font-mono text-blue" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                  ${hourlyNet.toLocaleString()}/h
                </div>
              </div>
            )}
          </div>

          {/* Notas */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
              NOTAS / OBSERVACIONES
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Mucha lluvia en la tarde, alta tarifa dinámica"
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'white' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: '6px' }}
          >
            <span>{loading ? 'Guardando...' : (initialData ? 'Actualizar Jornada' : 'Guardar Jornada')}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
