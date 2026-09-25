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
import CashReconciliationModal from '@/components/CashReconciliationModal';
import AppAdvanceModal from '@/components/AppAdvanceModal';
import { 
  DollarSign, 
  Receipt, 
  Wrench, 
  TrendingUp, 
  Gauge, 
  CreditCard, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle,
  Clock,
  Sparkles,
  Home,
  Users,
  Check,
  X,
  Scale,
  Smartphone,
  Wallet
} from 'lucide-react';

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [restrictedNotice, setRestrictedNotice] = useState(null);
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
  const [householdData, setHouseholdData] = useState(null);
  const [invitationMessage, setInvitationMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Modales
  const [dailyModalOpen, setDailyModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [serviceDoneModalOpen, setServiceDoneModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [odometerModalOpen, setOdometerModalOpen] = useState(false);
  const [reconciliationModalOpen, setReconciliationModalOpen] = useState(false);
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);

  // Detectar redirección por módulo restringido
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const restricted = params.get('restricted');
      if (restricted) {
        const moduleNames = {
          driver: 'Módulo Conductor & Jornadas',
          expenses: 'Módulo de Gastos & Tarjetas',
          vehicle: 'Módulo de Mantenimiento Vehicular',
        };
        setRestrictedNotice(moduleNames[restricted] || `Módulo (${restricted})`);
      }
    }
  }, []);

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
      const [sumRes, vehRes, expRes, logsRes, houseRes] = await Promise.all([
        fetch(`/api/summary?month=${currentMonth}`).then(r => r.json()),
        fetch('/api/vehicle-maintenance').then(r => r.json()),
        fetch(`/api/expenses?month=${currentMonth}`).then(r => r.json()),
        fetch(`/api/daily-logs?month=${currentMonth}`).then(r => r.json()),
        fetch('/api/household').then(r => r.json()).catch(() => null),
      ]);

      setSummaryData(sumRes);
      setVehicleData(vehRes);
      setExpensesData(expRes);
      setDailyLogsData(logsRes);
      if (houseRes) setHouseholdData(houseRes);
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleRespondInvitation = async (householdId, action) => {
    try {
      const res = await fetch('/api/household/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ householdId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        setInvitationMessage(data.message);
        await refreshData();
        setTimeout(() => setInvitationMessage(''), 4000);
      }
    } catch (err) {
      console.error('Error al responder invitación:', err);
    }
  };

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

      {/* Banner de Módulo Restringido */}
      {restrictedNotice && (
        <div className="card" style={{ padding: '14px 18px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid var(--accent-red)', color: '#f87171', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={20} color="#f87171" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Acceso restringido: {restrictedNotice}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Este módulo no está habilitado en tu plan o suscripción. Contacta al administrador para habilitarlo.</div>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => setRestrictedNotice(null)}
            className="btn btn-secondary btn-sm"
            style={{ padding: '4px 8px', fontSize: '0.8rem' }}
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Notificación de acción de invitación */}
      {invitationMessage && (
        <div className="card" style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--accent-emerald)', color: '#34d399', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle2 size={18} />
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{invitationMessage}</span>
        </div>
      )}

      {/* Banner de Invitación Pendiente de Hogar */}
      {householdData?.pendingInvitations?.length > 0 && (
        <div className="card" style={{ marginBottom: 20, background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '16px 20px' }}>
          {householdData.pendingInvitations.map(inv => (
            <div key={inv.membershipId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
                  <Home size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fbbf24' }}>
                    ¡Invitación para compartir gastos de hogar en &quot;{inv.householdName}&quot;!
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
                    Tu porcentaje de cobertura será del <strong>{Number(inv.defaultSharePct)}%</strong>. Al aceptar, verás los gastos compartidos en tu panel.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => handleRespondInvitation(inv.householdId, 'accept')}
                  className="btn btn-primary btn-sm"
                  style={{ background: '#10b981', borderColor: '#10b981' }}
                >
                  <Check size={14} />
                  <span>Aceptar y Vincular</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRespondInvitation(inv.householdId, 'decline')}
                  className="btn btn-secondary btn-sm"
                  style={{ color: '#f87171' }}
                >
                  <X size={14} />
                  <span>Rechazar</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
            ${(obligations.totalUserObligations || obligations.totalObligations || expensesData?.summary?.totalUserMonthlyTarget || 0).toLocaleString()}
          </div>
          <div className="kpi-subtext">
            <span style={{ color: '#34d399' }}>
              ✅ Pagado: ${(expensesData?.summary?.totalPaidAmount || obligations.totalPaidObligations || 0).toLocaleString()}
            </span>
            <span>•</span>
            <span style={{ color: '#fb7185' }}>
              ⏳ Pendiente: ${(expensesData?.summary?.totalPendingAmount !== undefined ? expensesData.summary.totalPendingAmount : (obligations.totalPendingObligations || 0)).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="kpi-card amber">
          <div className="kpi-header">
            <span className="kpi-label">Balance Neto vs Gastos</span>
            <div style={{ color: '#fbbf24' }}><TrendingUp size={20} /></div>
          </div>
          <div className="kpi-value font-mono" style={{ color: ((earnings.netIncome || 0) - (obligations.totalUserObligations || obligations.totalObligations || expensesData?.summary?.totalUserMonthlyTarget || 0)) >= 0 ? '#34d399' : '#f87171' }}>
            ${((earnings.netIncome || 0) - (obligations.totalUserObligations || obligations.totalObligations || expensesData?.summary?.totalUserMonthlyTarget || 0)).toLocaleString()}
          </div>
          <div className="kpi-subtext">
            {(earnings.netIncome || 0) >= (obligations.totalUserObligations || obligations.totalObligations || expensesData?.summary?.totalUserMonthlyTarget || 0)
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

      {/* Widget de Arqueo y Caja Líquida */}
      <div className="card" style={{ marginBottom: 24, padding: '18px 22px', background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.7) 100%)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
              <Scale size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span>Disponibilidad Líquida & Arqueo de Caja</span>
                {summaryData?.cashFlow?.latestReconciliation ? (
                  summaryData.cashFlow.cashDifference === 0 ? (
                    <span className="badge badge-green" style={{ fontSize: '0.72rem' }}>Caja Cuadrada ✓</span>
                  ) : summaryData.cashFlow.cashDifference < 0 ? (
                    <span className="badge badge-red" style={{ fontSize: '0.72rem' }}>Faltante: -${Math.abs(summaryData.cashFlow.cashDifference).toLocaleString()}</span>
                  ) : (
                    <span className="badge badge-yellow" style={{ fontSize: '0.72rem' }}>Sobrante: +${summaryData.cashFlow.cashDifference.toLocaleString()}</span>
                  )
                ) : (
                  <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>Sin Arqueo Reciente</span>
                )}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Saldo teórico calculado: <strong style={{ color: '#60a5fa' }}>${(summaryData?.cashFlow?.theoreticalCashBalance || 0).toLocaleString()}</strong>
                {summaryData?.cashFlow?.latestReconciliation && (
                  <span> • Dinero real en mano: <strong style={{ color: 'var(--text-main)' }}>${(summaryData.cashFlow.actualCashOnHand || 0).toLocaleString()}</strong></span>
                )}
                {summaryData?.cashFlow?.totalAdvances > 0 && (
                  <span> • Retiros de apps: <strong style={{ color: '#fbbf24' }}>${(summaryData.cashFlow.totalAdvances || 0).toLocaleString()}</strong></span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {user?.moduleDriver && (
              <button
                type="button"
                onClick={() => setAdvanceModalOpen(true)}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Smartphone size={15} className="text-cyan" />
                <span>+ Adelanto App</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setReconciliationModalOpen(true)}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Scale size={15} />
              <span>Arqueo de Caja</span>
            </button>
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

      <CashReconciliationModal
        isOpen={reconciliationModalOpen}
        onClose={() => setReconciliationModalOpen(false)}
        onSaved={refreshData}
        currentMonth={currentMonth}
      />

      <AppAdvanceModal
        isOpen={advanceModalOpen}
        onClose={() => setAdvanceModalOpen(false)}
        onSaved={refreshData}
        currentMonth={currentMonth}
        activeApps={user?.activeApps || ['uber', 'cabify', 'didi']}
        appBreakdownTotals={summaryData?.appBreakdownTotals || {}}
        advancesByApp={summaryData?.cashFlow?.advancesByApp || {}}
      />
    </div>
  );
}
