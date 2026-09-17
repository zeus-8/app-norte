'use client';

import React, { useState, useEffect } from 'react';
import { X, Wrench, Calendar, Gauge, AlertCircle } from 'lucide-react';

const CATEGORIES = [
  'Motor / Service',
  'Documentación / GNC',
  'Documentación / Legal',
  'Impuestos / Patente',
  'Neumáticos',
  'Frenos',
  'Suspensión',
  'Eléctrico',
  'Encendido',
  'Transmisión',
  'Otro'
];

export default function NewServiceModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  currentOdometer = 0
}) {
  const [name, setName] = useState('');
  const [trackingType, setTrackingType] = useState('hybrid'); // 'km' | 'time' | 'hybrid'
  const [intervalKm, setIntervalKm] = useState('10000');
  const [intervalMonths, setIntervalMonths] = useState('12');
  const [fixedDueMonth, setFixedDueMonth] = useState('');
  const [lastServiceKm, setLastServiceKm] = useState('');
  const [lastServiceDate, setLastServiceDate] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [category, setCategory] = useState('Motor / Service');
  const [priority, setPriority] = useState('normal');
  const [isDocument, setIsDocument] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setTrackingType(initialData.trackingType || initialData.tracking_type || 'hybrid');
      setIntervalKm(String(initialData.intervalKm || initialData.interval_km || 10000));
      setIntervalMonths(String(initialData.intervalMonths || initialData.interval_months || 12));
      setFixedDueMonth(initialData.fixedDueMonth || initialData.fixed_due_month ? String(initialData.fixedDueMonth || initialData.fixed_due_month) : '');
      setLastServiceKm(String(initialData.lastServiceKm || initialData.last_service_km || 0));
      setLastServiceDate(initialData.lastServiceDate || initialData.last_service_date || '');
      setEstimatedCost(String(initialData.estimatedCost || initialData.estimated_cost || ''));
      setCategory(initialData.category || 'Motor / Service');
      setPriority(initialData.priority || 'normal');
      setIsDocument(Boolean(initialData.isDocument || initialData.is_document));
      setNotes(initialData.notes || '');
    } else {
      setName('');
      setTrackingType('hybrid');
      setIntervalKm('10000');
      setIntervalMonths('12');
      setFixedDueMonth('');
      setLastServiceKm(currentOdometer ? String(currentOdometer) : '0');
      setLastServiceDate(new Date().toISOString().slice(0, 10));
      setEstimatedCost('');
      setCategory('Motor / Service');
      setPriority('normal');
      setIsDocument(false);
      setNotes('');
    }
    setError('');
  }, [initialData, isOpen, currentOdometer]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Por favor indica el nombre del servicio o trámite');
      return;
    }

    const cost = Number(estimatedCost);
    if (!cost || cost <= 0) {
      setError('El costo estimado debe ser mayor a $0');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        id: initialData?.id,
        name: name.trim(),
        trackingType: isDocument ? 'time' : trackingType,
        intervalKm: Number(intervalKm) || 0,
        intervalMonths: Number(intervalMonths) || 12,
        fixedDueMonth: fixedDueMonth ? parseInt(fixedDueMonth, 10) : null,
        lastServiceKm: Number(lastServiceKm) || 0,
        lastServiceDate,
        estimatedCost: cost,
        category,
        priority,
        isDocument,
        notes,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Error al guardar el servicio');
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
              {initialData ? 'Editar Mantenimiento' : 'Nuevo Mantenimiento / Trámite'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Controla services mecánicos, VTV, Oblea GNC, patente y repuestos
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
          
          {/* Documento vs Mecánica */}
          <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>¿Es un Trámite / Documento / Impuesto?</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>VTV, Oblea GNC, Patente automotor, Seguro</div>
            </div>
            <input
              type="checkbox"
              checked={isDocument}
              onChange={(e) => {
                setIsDocument(e.target.checked);
                if (e.target.checked) setTrackingType('time');
              }}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
          </div>

          {/* Nombre */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
              NOMBRE DEL SERVICIO / TRÁMITE
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Cambio de Aceite y Filtros"
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'white', fontWeight: 700 }}
            />
          </div>

          {/* Tipo de Seguimiento (si no es documento) */}
          {!isDocument && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                MÉTODO DE CONTROL
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setTrackingType('hybrid')}
                  style={{
                    padding: '8px',
                    borderRadius: 'var(--radius-md)',
                    border: trackingType === 'hybrid' ? '2px solid #06b6d4' : '1px solid var(--border-color)',
                    background: trackingType === 'hybrid' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(0,0,0,0.2)',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  ⚡ Híbrido (Km o Tiempo)
                </button>
                <button
                  type="button"
                  onClick={() => setTrackingType('km')}
                  style={{
                    padding: '8px',
                    borderRadius: 'var(--radius-md)',
                    border: trackingType === 'km' ? '2px solid #3b82f6' : '1px solid var(--border-color)',
                    background: trackingType === 'km' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(0,0,0,0.2)',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  🚗 Por Kilometraje
                </button>
                <button
                  type="button"
                  onClick={() => setTrackingType('time')}
                  style={{
                    padding: '8px',
                    borderRadius: 'var(--radius-md)',
                    border: trackingType === 'time' ? '2px solid #8b5cf6' : '1px solid var(--border-color)',
                    background: trackingType === 'time' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(0,0,0,0.2)',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  📅 Por Calendario
                </button>
              </div>
            </div>
          )}

          {/* Intervalos */}
          <div style={{ display: 'grid', gridTemplateColumns: (!isDocument && trackingType !== 'time') ? '1fr 1fr' : '1fr', gap: '10px' }}>
            {!isDocument && trackingType !== 'time' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  INTERVALO (CADA CUÁNTOS KM)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={intervalKm}
                  onChange={(e) => setIntervalKm(e.target.value)}
                  placeholder="Ej. 10000"
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: '#38bdf8', fontWeight: 700 }}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                INTERVALO EN MESES (EJ. 12 = ANUAL)
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={intervalMonths}
                onChange={(e) => setIntervalMonths(e.target.value)}
                placeholder="12"
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'white', fontWeight: 700 }}
              />
            </div>
          </div>

          {/* Costo Estimado y Categoría */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                COSTO ESTIMADO REPUESTO/SERVICE ($)
              </label>
              <input
                type="number"
                step="any"
                inputMode="decimal"
                required
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                placeholder="Ej. 95000"
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: '#34d399', fontSize: '1.1rem', fontWeight: 800 }}
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

          {/* Último Service Hecho */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                KM DEL ÚLTIMO SERVICE
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={lastServiceKm}
                onChange={(e) => setLastServiceKm(e.target.value)}
                placeholder="Ej. 140000"
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'white' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                FECHA ÚLTIMO SERVICE
              </label>
              <input
                type="date"
                value={lastServiceDate}
                onChange={(e) => setLastServiceDate(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'white' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: '6px' }}
          >
            <span>{loading ? 'Guardando...' : (initialData ? 'Actualizar Mantenimiento' : 'Guardar Mantenimiento')}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
