'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import GoalThermometer from '@/components/GoalThermometer';
import DailyLogModal from '@/components/DailyLogModal';
import ExpenseModal from '@/components/ExpenseModal';
import ServiceDoneModal from '@/components/ServiceDoneModal';
import NewServiceModal from '@/components/NewServiceModal';
import OdometerModal from '@/components/OdometerModal';
import { 
  DollarSign, 
  Receipt, 
  Wrench, 
  TrendingUp, 
  Gauge, 
  CreditCard, 
  ArrowRight, 
  CheckCircle2, 
  Clock,
  Sparkles
} from 'lucide-react';

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });

  const [summaryData, setSummaryData] = useState(null);
  const [vehicleData, setVehicleData] = useState(null);
  const [expensesData, setExpensesData] = useState(null);
  const [dailyLogsData, setDailyLogsData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modales
  const [dailyModalOpen, setDailyModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [serviceDoneModalOpen, setServiceDoneModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [odometerModalOpen, setOdometerModalOpen] = useState(false);

  // Cargar usuario
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  // Recargar datos del mes
  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      const [sumRes, vehRes, expRes, logsRes] = await Promise.all([
        fetch(`/api/summary?month=${currentMonth}`).then(r => r.json()),
        fetch('/api/vehicle-maintenance').then(r => r.json()),
        fetch(`/api/expenses?month=${currentMonth}`).then(r => r.json()),
        fetch(`/api/daily-logs?month=${currentMonth}`).then(r => r.json()),
      ]);

      setSummaryData(sumRes);
      setVehicleData(vehRes);
      setExpensesData(expRes);
      setDailyLogsData(logsRes);
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Handlers
  const handleSaveDailyLog = async (data) => {
    const res = await fetch('/api/daily-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al guardar jornada');
    }
    await refreshData();
  };

  const handleSaveExpense = async (data) => {
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al guardar gasto');
    }
    await refreshData();
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

  const handleUpdateOdometer = async (km) => {
    const res = await fetch('/api/vehicle-maintenance/odometer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ odometerKm: km }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al actualizar odómetro');
    }
    await refreshData();
  };

  const earnings = summaryData?.earnings || {};
  const obligations = summaryData?.obligations || {};
  const vehicleItems = vehicleData?.items || [];
  const activeExpenses = expensesData?.expenses || [];
  const cardInstallments = activeExpenses.filter(e => e.type === 'installment');

  // Mantenimientos urgentes
  const sortedServices = [...vehicleItems].sort((a, b) => {
    const statusOrder = { danger: 0, warning: 1, ok: 2 };
    const orderA = statusOrder[a.status] !== undefined ? statusOrder[a.status] : 3;
    const orderB = statusOrder[b.status] !== undefined ? statusOrder[b.status] : 3;
    if (orderA !== orderB) return orderA - orderB;
    return (a.days_remaining || 9999) - (b.days_remaining || 9999);
  }).slice(0, 4);

  return (
    <div className="app-container">
      <Navbar
        user={user}
        currentMonth={currentMonth}
        setCurrentMonth={setCurrentMonth}
        currentOdometer={vehicleData?.current_odometer}
        onOpenDailyModal={() => setDailyModalOpen(true)}
        onOpenExpenseModal={() => setExpenseModalOpen(true)}
        onOpenOdometerModal={() => setOdometerModalOpen(true)}
      />

      {/* Grid de KPIs Principales */}
      <div className="grid-kpis">
        <div className="kpi-card emerald">
          <div className="kpi-header">
            <span className="kpi-label">Ganancia Neta Apps</span>
            <div style={{ color: '#34d399' }}><DollarSign size={20} /></div>
          </div>
          <div className="kpi-value font-mono text-emerald">
            ${(earnings.netIncome || 0).toLocaleString()}
          </div>
          <div className="kpi-subtext">
            <span>Bruto: ${(earnings.grossIncome || 0).toLocaleString()}</span>
            <span>•</span>
            <span>Combustible: ${(earnings.fuelExpense || 0).toLocaleString()}</span>
          </div>
        </div>

        <div className="kpi-card rose">
          <div className="kpi-header">
            <span className="kpi-label">Tus Obligaciones Mes</span>
            <div style={{ color: '#fb7185' }}><Receipt size={20} /></div>
          </div>
          <div className="kpi-value font-mono text-rose">
            ${(obligations.totalUserObligations || obligations.totalJuanObligations || 0).toLocaleString()}
          </div>
          <div className="kpi-subtext">
            <span>Fijos: ${(obligations.userFixedObligations || obligations.juanFixedObligations || 0).toLocaleString()}</span>
            <span>•</span>
            <span>Cuotas: ${(obligations.userInstallmentObligations || obligations.juanInstallmentObligations || 0).toLocaleString()}</span>
          </div>
        </div>

        <div className="kpi-card amber">
          <div className="kpi-header">
            <span className="kpi-label">Balance Neto vs Gastos</span>
            <div style={{ color: '#fbbf24' }}><TrendingUp size={20} /></div>
          </div>
          <div className="kpi-value font-mono" style={{ color: ((earnings.netIncome || 0) - (obligations.totalUserObligations || obligations.totalJuanObligations || 0)) >= 0 ? '#34d399' : '#f87171' }}>
            ${((earnings.netIncome || 0) - (obligations.totalUserObligations || obligations.totalJuanObligations || 0)).toLocaleString()}
          </div>
          <div className="kpi-subtext">
            {(earnings.netIncome || 0) >= (obligations.totalUserObligations || obligations.totalJuanObligations || 0)
              ? '✅ Cubriendo todas tus obligaciones'
              : '⚠️ Aún faltan ingresos para cubrir gastos'}
          </div>
        </div>

        <div className="kpi-card cyan">
          <div className="kpi-header">
            <span className="kpi-label">{user?.driverType === 'renter' ? 'Modalidad Chofer' : 'Fondo Mantenimiento Auto'}</span>
            <div style={{ color: '#22d3ee' }}><Wrench size={20} /></div>
          </div>
          <div className="kpi-value font-mono text-cyan">
            {user?.driverType === 'renter' ? 'Auto Alquilado' : `$${(vehicleData?.summary?.totalReserveAccumulated || 0).toLocaleString()}`}
          </div>
          <div className="kpi-subtext">
            <span>Odómetro: {(vehicleData?.current_odometer || 145000).toLocaleString()} km</span>
            {vehicleData?.summary?.urgentCount > 0 && user?.driverType !== 'renter' && (
              <span className="badge badge-red" style={{ fontSize: '0.7rem' }}>
                {vehicleData.summary.urgentCount} urgente
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Termómetro de Metas Visual */}
      <GoalThermometer summaryData={summaryData} />

      <div style={{ height: 24 }} />

      {/* Grilla de 2 Columnas: Vehículo & Cuotas de Tarjetas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* Próximos Services */}
        {user?.moduleVehicle && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Gauge className="text-cyan" size={20} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'white', margin: 0 }}>
                  Próximos Services y Vencimientos
                </h3>
              </div>
              <Link href="/vehicle" className="btn btn-secondary btn-sm">
                <span>Ver Todos ({vehicleItems.length})</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            {sortedServices.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No hay servicios cargados.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {sortedServices.map(service => (
                  <div key={service.id} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'white' }}>{service.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        {service.is_document ? 'Documento / Trámite' : `Cada ${service.intervalKm?.toLocaleString()} km`} • Est: ${Number(service.estimatedCost).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`badge ${service.status === 'danger' ? 'badge-red' : (service.status === 'warning' ? 'badge-yellow' : 'badge-green')}`}>
                        {service.status === 'danger' ? '¡Urgente!' : (service.status === 'warning' ? 'Próximo' : 'Al día')}
                      </span>
                      <button 
                        onClick={() => { setSelectedService(service); setServiceDoneModalOpen(true); }}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      >
                        <CheckCircle2 size={12} className="text-emerald" />
                        <span>Hecho</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Compras en Cuotas Activas */}
        {user?.moduleExpenses && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CreditCard className="text-purple" size={20} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'white', margin: 0 }}>
                  Compras en Cuotas Activas
                </h3>
              </div>
              <Link href="/expenses" className="btn btn-secondary btn-sm">
                <span>Ver Gastos</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            {cardInstallments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                <CreditCard size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                <p style={{ fontSize: '0.85rem' }}>No tienes compras en cuotas para este mes.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {cardInstallments.map(item => (
                  <div key={item.id} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'white' }}>{item.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <span className={`badge ${item.paymentMethod === 'VISA' ? 'badge-blue' : 'badge-purple'}`} style={{ fontSize: '0.65rem' }}>
                          {item.paymentMethod}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Cuota {item.current_installment_num} de {item.total_installments}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="font-mono text-purple" style={{ fontWeight: 800, fontSize: '1rem' }}>
                        ${Math.round(item.monthly_amount).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                        Total: ${Number(item.totalAmount).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modales */}
      <DailyLogModal
        isOpen={dailyModalOpen}
        onClose={() => setDailyModalOpen(false)}
        onSave={handleSaveDailyLog}
        currentOdometer={vehicleData?.current_odometer}
        activeApps={user?.activeApps || ['uber', 'cabify', 'didi']}
      />

      <ExpenseModal
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        onSave={handleSaveExpense}
        currentMonth={currentMonth}
      />

      <ServiceDoneModal
        isOpen={serviceDoneModalOpen}
        onClose={() => setServiceDoneModalOpen(false)}
        onSave={handleSaveServiceDone}
        service={selectedService}
        currentOdometer={vehicleData?.current_odometer}
      />

      <OdometerModal
        isOpen={odometerModalOpen}
        onClose={() => setOdometerModalOpen(false)}
        onSave={handleUpdateOdometer}
        currentOdometer={vehicleData?.current_odometer}
      />
    </div>
  );
}
