'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import NewServiceModal from '@/components/NewServiceModal';
import ServiceDoneModal from '@/components/ServiceDoneModal';
import OdometerModal from '@/components/OdometerModal';
import ExpenseModal from '@/components/ExpenseModal';
import { 
  Wrench, 
  Gauge, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  Edit3, 
  Trash2, 
  History, 
  DollarSign, 
  ShieldCheck, 
  FileText,
  CreditCard,
  Key
} from 'lucide-react';

export default function VehiclePage() {
  const [user, setUser] = useState(null);
  const [vehicleData, setVehicleData] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'mechanics', 'documents', 'urgent'
  const [newServiceModalOpen, setNewServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceDoneModalOpen, setServiceDoneModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [odometerModalOpen, setOdometerModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [initialExpense, setInitialExpense] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => { 
        if (data.authenticated) {
          if (data.user.role !== 'admin' && !data.user.moduleVehicle) {
            window.location.href = '/dashboard?restricted=vehicle';
            return;
          }
          setUser(data.user);
        }
      });
  }, []);

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      const [vehRes, histRes] = await Promise.all([
        fetch('/api/vehicle-maintenance').then(r => r.json()),
        fetch('/api/vehicle-maintenance/history').then(r => r.json()),
      ]);
      setVehicleData(vehRes);
      if (Array.isArray(histRes)) setHistoryList(histRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleSaveService = async (data) => {
    const url = data.id ? `/api/vehicle-maintenance/${data.id}` : '/api/vehicle-maintenance';
    const method = data.id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al guardar servicio');
    }
    await refreshData();
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este servicio?')) return;
    const res = await fetch(`/api/vehicle-maintenance/${id}`, { method: 'DELETE' });
    if (res.ok) await refreshData();
  };

  const handleSaveServiceDone = async (data) => {
    const res = await fetch(`/api/vehicle-maintenance/${data.maintenanceId}/service-done`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al registrar service');
    }
    await refreshData();
  };

  const currentOdometer = vehicleData?.current_odometer || 145000;
  const items = vehicleData?.items || [];
  const summary = vehicleData?.summary || {};
  const isRenter = user?.driverType === 'renter';

  const filteredItems = items.filter(item => {
    if (activeFilter === 'mechanics') return !item.is_document;
    if (activeFilter === 'documents') return Boolean(item.is_document);
    if (activeFilter === 'urgent') return item.status !== 'ok';
    return true;
  });

  return (
    <div className="app-container">
      <Navbar
        user={user}
        currentOdometer={currentOdometer}
        onOpenOdometerModal={() => setOdometerModalOpen(true)}
      />

      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Wrench className="text-cyan" size={24} />
            <span>Mantenimiento Vehicular, VTV & GNC</span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {isRenter 
              ? 'Modalidad Auto Alquilado: El mantenimiento mecánico corre por cuenta del propietario'
              : 'Control dual por tiempo (VTV, Oblea GNC, Patente, 5 años) y kilometraje con fondo de provisión para repuestos'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setOdometerModalOpen(true)}>
            <Gauge size={16} className="text-cyan" />
            <span className="font-mono">Odómetro: {currentOdometer.toLocaleString()} km</span>
          </button>
          {!isRenter && (
            <button className="btn btn-primary" onClick={() => { setEditingService(null); setNewServiceModalOpen(true); }}>
              <Plus size={16} />
              <span>+ Nuevo Mantenimiento / Trámite</span>
            </button>
          )}
        </div>
      </div>

      {/* Banner Chofer Alquiler si aplica */}
      {isRenter && (
        <div style={{ background: 'rgba(139, 92, 246, 0.12)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ padding: '10px', background: 'rgba(139, 92, 246, 0.2)', borderRadius: 'var(--radius-md)', color: '#c084fc' }}>
            <Key size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'white', margin: 0 }}>
              Modalidad de Auto Alquilado Activa
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#cbd5e1', margin: '2px 0 0' }}>
              Estás configurado como chofer con vehículo en alquiler. Tu objetivo principal es cubrir el canon semanal/mensual del alquiler y combustible.
            </p>
          </div>
        </div>
      )}

      {/* KPIs de Mantenimiento (solo si es auto propio) */}
      {!isRenter && (
        <div className="grid-kpis">
          <div className="kpi-card cyan">
            <div className="kpi-header">
              <span className="kpi-label">Fondo de Provisión Sugerido</span>
              <div style={{ color: '#22d3ee' }}><DollarSign size={20} /></div>
            </div>
            <div className="kpi-value font-mono text-cyan">
              ${(summary.totalReserveAccumulated || 0).toLocaleString()}
            </div>
            <div className="kpi-subtext">
              <span>Ahorro por desgaste de tiempo y km</span>
            </div>
          </div>

          <div className="kpi-card emerald">
            <div className="kpi-header">
              <span className="kpi-label">Servicios al Día</span>
              <div style={{ color: '#34d399' }}><ShieldCheck size={20} /></div>
            </div>
            <div className="kpi-value font-mono text-emerald">
              {items.filter(i => i.status === 'ok').length}
            </div>
            <div className="kpi-subtext">
              <span>Con margen seguro de tiempo y km</span>
            </div>
          </div>

          <div className="kpi-card amber">
            <div className="kpi-header">
              <span className="kpi-label">Atención Próxima</span>
              <div style={{ color: '#fbbf24' }}><AlertTriangle size={20} /></div>
            </div>
            <div className="kpi-value font-mono text-amber">
              {summary.warningCount || 0}
            </div>
            <div className="kpi-subtext">
              <span>Menos de 45 días o 2.000 km</span>
            </div>
          </div>

          <div className="kpi-card rose">
            <div className="kpi-header">
              <span className="kpi-label">Urgentes o Vencidos</span>
              <div style={{ color: '#fb7185' }}><AlertOctagon size={20} /></div>
            </div>
            <div className="kpi-value font-mono text-rose">
              {summary.urgentCount || 0}
            </div>
            <div className="kpi-subtext">
              <span>Vencidos o con menos de 15 días / 500 km</span>
            </div>
          </div>
        </div>
      )}

      {/* Banner de Regularización de Patente Automotor (Argentina) */}
      {!isRenter && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(139, 92, 246, 0.12) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div style={{ maxWidth: '680px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className="badge badge-red" style={{ fontSize: '0.7rem' }}>REGULARIZACIÓN IMPOSITIVA</span>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                Impuesto de Patente Automotor & Planes de Pago
              </h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.4' }}>
              La patente es bimestral. Si estás atrasado con las cuotas, los organismos fiscales (ARBA / AGIP / Municipio) permiten consolidar toda la deuda en un <strong>Plan de Facilidades en Cuotas Fijas</strong>.
            </p>
          </div>

          <button 
            className="btn btn-primary btn-sm"
            style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' }}
            onClick={() => {
              setInitialExpense({
                name: 'Plan Deuda Patente (Refinanciación)',
                category: 'Auto',
                type: 'installment',
                installment_count: 12,
                total_amount: '',
                payment_method: 'Transferencia',
                notes: 'Plan de pago en cuotas fijas para regularizar patente automotor'
              });
              setExpenseModalOpen(true);
            }}
          >
            <CreditCard size={15} />
            <span>Cargar Plan de Cuotas Patente</span>
          </button>
        </div>
      )}

      {/* Filtros y Selector de Vista */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button 
            className={`btn btn-sm ${activeFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveFilter('all')}
          >
            Todos ({items.length})
          </button>
          <button 
            className={`btn btn-sm ${activeFilter === 'documents' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveFilter('documents')}
          >
            <FileText size={14} />
            <span>📋 Documentos, GNC & Patente ({items.filter(i => i.is_document).length})</span>
          </button>
          <button 
            className={`btn btn-sm ${activeFilter === 'mechanics' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveFilter('mechanics')}
          >
            <Wrench size={14} />
            <span>🚗 Mecánica ({items.filter(i => !i.is_document).length})</span>
          </button>
          <button 
            className={`btn btn-sm ${activeFilter === 'urgent' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveFilter('urgent')}
          >
            <AlertTriangle size={14} />
            <span>⚠️ Urgentes ({items.filter(i => i.status !== 'ok').length})</span>
          </button>
        </div>

        <button 
          className="btn btn-secondary btn-sm" 
          onClick={() => setShowHistory(!showHistory)}
        >
          <History size={15} />
          <span>{showHistory ? 'Ocultar Historial' : `Historial de Services (${historyList.length})`}</span>
        </button>
      </div>

      {/* Sección desplegable de Historial */}
      {showHistory && (
        <div className="card" style={{ marginBottom: 24, border: '1px solid rgba(6, 182, 212, 0.3)' }}>
          <h4 style={{ fontSize: '1rem', color: '#67e8f9', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <History size={18} />
            <span>Historial de Services Realizados ({historyList.length})</span>
          </h4>

          {historyList.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Aún no has registrado ningún service o trámite realizado.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Servicio / Trámite</th>
                    <th>Kilometraje</th>
                    <th>Costo Pagado</th>
                    <th>Taller / Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {historyList.map(h => (
                    <tr key={h.id}>
                      <td className="font-mono">{h.service_date}</td>
                      <td style={{ fontWeight: 700, color: 'white' }}>{h.maintenance_name}</td>
                      <td className="font-mono text-cyan">{h.service_km > 0 ? `${h.service_km.toLocaleString()} km` : 'Por tiempo'}</td>
                      <td className="font-mono">${Number(h.cost_paid).toLocaleString()}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{h.workshop_notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Grid de Servicios y Trámites */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {filteredItems.map(item => {
          const isTimeOnly = item.tracking_type === 'time' || item.is_document;
          const hasDays = typeof item.days_remaining === 'number' && !isNaN(item.days_remaining);
          const hasKm = typeof item.km_remaining === 'number' && !isNaN(item.km_remaining);

          return (
            <div key={item.id} className="card" style={{ borderLeft: `4px solid ${item.status === 'danger' ? '#f43f5e' : (item.status === 'warning' ? '#f59e0b' : '#10b981')}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'white', margin: 0 }}>{item.name}</h4>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 2 }}>
                    {isTimeOnly 
                      ? (item.intervalMonths === 12 ? 'Anual' : (item.intervalMonths === 2 ? 'Bimestral' : (item.intervalMonths === 60 ? 'Cada 5 años' : `Cada ${item.intervalMonths} meses`)))
                      : `Cada ${item.intervalKm?.toLocaleString()} km`} • Est: ${Number(item.estimatedCost).toLocaleString()}
                  </div>
                </div>

                <span className={`badge ${item.status === 'danger' ? 'badge-red' : (item.status === 'warning' ? 'badge-yellow' : 'badge-green')}`}>
                  {isTimeOnly 
                    ? (hasDays && item.days_remaining <= 0 ? '¡VENCIDO!' : (hasDays ? `${item.days_remaining}d` : '¡Vencido!'))
                    : (hasKm && item.km_remaining <= 0 ? '¡VENCIDO!' : (hasDays ? `${item.days_remaining}d` : (hasKm ? `${item.km_remaining?.toLocaleString()} km` : 'Al día')))}
                </span>
              </div>

              {/* Barra de Desgaste */}
              <div style={{ height: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '9999px', overflow: 'hidden', margin: '12px 0 8px' }}>
                <div 
                  style={{ 
                    height: '100%', 
                    width: `${item.pct_used}%`, 
                    background: item.status === 'danger' ? '#f43f5e' : (item.status === 'warning' ? '#f59e0b' : '#10b981'),
                    borderRadius: '9999px' 
                  }} 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                <span>{item.next_due_date ? `Vence: ${item.next_due_date}` : `Provisión: $${item.reserve_accumulated?.toLocaleString()}`}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button 
                    onClick={() => { setSelectedService(item); setServiceDoneModalOpen(true); }}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  >
                    <CheckCircle2 size={12} className="text-emerald" />
                    <span>{isTimeOnly ? 'Renovar' : 'Hecho'}</span>
                  </button>
                  <button 
                    onClick={() => { setEditingService(item); setNewServiceModalOpen(true); }}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 6px' }}
                    title="Editar"
                  >
                    <Edit3 size={12} />
                  </button>
                  <button 
                    onClick={() => handleDeleteService(item.id)}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 6px', color: '#f87171' }}
                    title="Eliminar"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <NewServiceModal
        isOpen={newServiceModalOpen}
        onClose={() => setNewServiceModalOpen(false)}
        onSave={handleSaveService}
        initialData={editingService}
        currentOdometer={currentOdometer}
      />

      <ServiceDoneModal
        isOpen={serviceDoneModalOpen}
        onClose={() => setServiceDoneModalOpen(false)}
        onSave={handleSaveServiceDone}
        service={selectedService}
        currentOdometer={currentOdometer}
      />

      <OdometerModal
        isOpen={odometerModalOpen}
        onClose={() => setOdometerModalOpen(false)}
        onSave={async (km) => {
          await fetch('/api/vehicle-maintenance/odometer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ odometerKm: km }),
          });
          await refreshData();
        }}
        currentOdometer={currentOdometer}
      />

      <ExpenseModal
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        onSave={async (data) => {
          await fetch('/api/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          await refreshData();
        }}
        initialData={initialExpense}
      />
    </div>
  );
}
