'use client';

import React, { useState, useEffect } from 'react';
import { X, Gauge, AlertCircle } from 'lucide-react';

export default function OdometerModal({
  isOpen,
  onClose,
  onSave,
  currentOdometer = 0
}) {
  const [km, setKm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setKm(currentOdometer ? String(currentOdometer) : '');
    setError('');
  }, [isOpen, currentOdometer]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const odo = Number(km);
    if (!odo || odo <= 0) {
      setError('Ingresa un kilometraje válido mayor a 0');
      return;
    }

    setLoading(true);
    try {
      await onSave(odo);
      onClose();
    } catch (err) {
      setError(err.message || 'Error al actualizar odómetro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', padding: '16px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '24px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Gauge size={20} className="text-cyan" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white', margin: 0 }}>
              Actualizar Odómetro
            </h3>
          </div>
          <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: '#fb7185', fontSize: '0.85rem', marginBottom: '14px' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
              KILOMETRAJE ACTUAL DEL VEHÍCULO
            </label>
            <input
              type="number"
              inputMode="numeric"
              required
              value={km}
              onChange={(e) => setKm(e.target.value)}
              placeholder="Ej. 145800"
              style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: '#38bdf8', fontSize: '1.25rem', fontWeight: 800, textAlign: 'center' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
          >
            <span>{loading ? 'Actualizando...' : 'Guardar Odómetro'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
