'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ServiceDoneModal({
  isOpen,
  onClose,
  onSave,
  service,
  currentOdometer = 0
}) {
  const [serviceKm, setServiceKm] = useState('');
  const [serviceDate, setServiceDate] = useState('');
  const [costPaid, setCostPaid] = useState('');
  const [workshopNotes, setWorkshopNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (service) {
      setServiceKm(currentOdometer ? String(currentOdometer) : String(service.lastServiceKm || service.last_service_km || 0));
      setServiceDate(new Date().toISOString().slice(0, 10));
      setCostPaid(String(service.estimatedCost || service.estimated_cost || ''));
      setWorkshopNotes('');
    }
    setError('');
  }, [service, isOpen, currentOdometer]);

  if (!isOpen || !service) return null;

  const isTimeOnly = service.trackingType === 'time' || service.tracking_type === 'time' || Boolean(service.isDocument || service.is_document);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cost = Number(costPaid);
    if (isNaN(cost) || cost < 0) {
      setError('Por favor indica un costo válido');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        maintenanceId: service.id,
        serviceDate,
        serviceKm: isTimeOnly ? 0 : (Number(serviceKm) || currentOdometer || 0),
        costPaid: cost,
        workshopNotes,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Error al registrar el service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', padding: '16px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '460px', padding: '24px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', margin: 0 }}>
              Registrar Service / Trámite Realizado
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              {service.name}
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
          
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
              FECHA DE REALIZACIÓN
            </label>
            <input
              type="date"
              required
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'white' }}
            />
          </div>

          {!isTimeOnly && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                KILOMETRAJE EN QUE SE HIZO
              </label>
              <input
                type="number"
                inputMode="numeric"
                required
                value={serviceKm}
                onChange={(e) => setServiceKm(e.target.value)}
                placeholder="Ej. 145000"
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: '#38bdf8', fontWeight: 700 }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
              MONTO REAL PAGADO ($)
            </label>
            <input
              type="number"
              step="any"
              inputMode="decimal"
              required
              value={costPaid}
              onChange={(e) => setCostPaid(e.target.value)}
              placeholder="Ej. 95000"
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: '#34d399', fontSize: '1.1rem', fontWeight: 800 }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
              TALLER / NOTAS / FACTURA
            </label>
            <input
              type="text"
              value={workshopNotes}
              onChange={(e) => setWorkshopNotes(e.target.value)}
              placeholder="Ej. Lubricentro Norte, aceite sintético 5W30"
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'white' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: '6px' }}
          >
            <CheckCircle2 size={16} />
            <span>{loading ? 'Guardando...' : 'Confirmar y Reiniciar Contador'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
