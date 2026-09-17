'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import DailyLogModal from '@/components/DailyLogModal';
import OdometerModal from '@/components/OdometerModal';
import { 
  Calendar, 
  DollarSign, 
  Fuel, 
  Clock, 
  Plus, 
  Edit3, 
  Trash2, 
  Gauge, 
  TrendingUp,
  Smartphone
} from 'lucide-react';

export default function DriverPage() {
  const [user, setUser] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });

  const [dailyLogsData, setDailyLogsData] = useState(null);
  const [vehicleData, setVehicleData] = useState(null);
  const [dailyModalOpen, setDailyModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [odometerModalOpen, setOdometerModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => { if (data.authenticated) setUser(data.user); });
  }, []);

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      const [logsRes, vehRes] = await Promise.all([
        fetch(`/api/daily-logs?month=${currentMonth}`).then(r => r.json()),
        fetch('/api/vehicle-maintenance').then(r => r.json()),
      ]);
      setDailyLogsData(logsRes);
      setVehicleData(vehRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

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

  const handleDeleteDailyLog = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este registro de jornada?')) return;
    const res = await fetch(`/api/daily-logs/${id}`, { method: 'DELETE' });
    if (res.ok) await refreshData();
  };

  const rawLogs = dailyLogsData?.logs || [];
  const summary = dailyLogsData?.summary || {};

  // Calcular diferencia de km entre días
  const sortedAsc = [...rawLogs].sort((a, b) => a.date.localeCompare(b.date));
  const kmMap = {};
  for (let i = 0; i < sortedAsc.length; i++) {
    const current = sortedAsc[i];
    const prev = sortedAsc[i - 1];
    if (prev && current.odometerKm && prev.odometerKm) {
      kmMap[current.id] = Math.max(0, current.odometerKm - prev.odometerKm);
    } else {
      kmMap[current.id] = null;
    }
  }

  const logs = [...rawLogs].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="app-container">
      <Navbar
        user={user}
        currentMonth={currentMonth}
        setCurrentMonth={setCurrentMonth}
        currentOdometer={vehicleData?.current_odometer}
        onOpenDailyModal={() => { setEditingLog(null); setDailyModalOpen(true); }}
        onOpenOdometerModal={() => setOdometerModalOpen(true)}
      />

      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Smartphone className="text-emerald" size={24} />
            <span>Jornadas y Rendimiento Multiapp</span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Registro diario de Uber, Cabify, DiDi y Rappi con control exacto de horas, minutos y combustible
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => { setEditingLog(null); setDailyModalOpen(true); }}>
          <Plus size={16} />
          <span>+ Cargar Jornada del Día</span>
        </button>
      </div>

      {/* KPIs del Mes */}
      <div className="grid-kpis">
        <div className="kpi-card emerald">
          <div className="kpi-header">
            <span className="kpi-label">Ganancia Neta Mes</span>
            <div style={{ color: '#34d399' }}><DollarSign size={20} /></div>
          </div>
          <div className="kpi-value font-mono text-emerald">
            ${(summary.totalNet || 0).toLocaleString()}
          </div>
          <div className="kpi-subtext">
            <span>En {summary.daysWorked || 0} días trabajados ({summary.totalHours || 0} horas)</span>
          </div>
        </div>

        <div className="kpi-card cyan">
          <div className="kpi-header">
            <span className="kpi-label">Facturado Bruto Total</span>
            <div style={{ color: '#22d3ee' }}><TrendingUp size={20} /></div>
          </div>
          <div className="kpi-value font-mono text-cyan">
            ${(summary.totalGross || 0).toLocaleString()}
          </div>
          <div className="kpi-subtext">
            <span>Promedio: ${(summary.avgGrossPerDay || 0).toLocaleString()} / día</span>
          </div>
        </div>

        <div className="kpi-card rose">
          <div className="kpi-header">
            <span className="kpi-label">Gasto en Combustible</span>
            <div style={{ color: '#fb7185' }}><Fuel size={20} /></div>
          </div>
          <div className="kpi-value font-mono text-rose">
            ${(summary.totalFuel || 0).toLocaleString()}
          </div>
          <div className="kpi-subtext">
            <span>Representa el {summary.fuelRatioPct || 0}% de lo facturado</span>
          </div>
        </div>

        <div className="kpi-card amber">
          <div className="kpi-header">
            <span className="kpi-label">Promedio Neto por Día</span>
            <div style={{ color: '#fbbf24' }}><Clock size={20} /></div>
          </div>
          <div className="kpi-value font-mono text-amber">
            ${(summary.avgNetPerDay || 0).toLocaleString()}
          </div>
          <div className="kpi-subtext">
            <span>Total viajes realizados: {summary.totalTrips || 0}</span>
          </div>
        </div>
      </div>

      {/* Tabla de Jornadas */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 className="card-title" style={{ margin: 0 }}>
            <span>Historial de Jornadas Trabajadas ({logs.length})</span>
          </h3>
        </div>

        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <Calendar size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p style={{ fontSize: '1rem', fontWeight: 600 }}>No hay jornadas registradas para este mes.</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: 4 }}>
              Haz clic en "+ Cargar Jornada del Día" para empezar a registrar tus ingresos multiapp.
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Facturación Bruta</th>
                  <th>Combustible (GNC/Nafta)</th>
                  <th>Otros Gastos</th>
                  <th>Ganancia Limpia</th>
                  <th>Tiempo Dedicado</th>
                  <th>Odómetro / Km del Día</th>
                  <th>Viajes</th>
                  <th>Notas</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const dayKm = kmMap[log.id];
                  const hoursStr = log.hours_formatted || `${Math.floor(log.minutesWorked / 60)}h ${log.minutesWorked % 60}m`;
                  const hourlyRate = log.hourly_rate || (log.minutesWorked > 0 ? Math.round(log.net_profit / (log.minutesWorked / 60)) : 0);

                  return (
                    <tr key={log.id}>
                      <td className="font-mono" style={{ fontWeight: 700, color: 'white' }}>
                        {log.date}
                      </td>
                      <td className="font-mono" style={{ fontWeight: 600 }}>
                        ${Number(log.grossIncome).toLocaleString()}
                      </td>
                      <td className="font-mono text-rose">
                        -${Number(log.fuelExpense).toLocaleString()}
                      </td>
                      <td className="font-mono" style={{ color: Number(log.otherExpense) > 0 ? '#fbbf24' : 'var(--text-dim)' }}>
                        {Number(log.otherExpense) > 0 ? `-$${Number(log.otherExpense).toLocaleString()}` : '$0'}
                      </td>
                      <td className="font-mono text-emerald" style={{ fontWeight: 800, fontSize: '1rem' }}>
                        ${log.net_profit?.toLocaleString()}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'white' }}>{hoursStr}</div>
                        {hourlyRate > 0 && (
                          <div style={{ fontSize: '0.72rem', color: '#34d399' }}>${hourlyRate.toLocaleString()}/h</div>
                        )}
                      </td>
                      <td>
                        <div className="font-mono text-cyan" style={{ fontWeight: 600 }}>
                          {log.odometerKm?.toLocaleString()} km
                        </div>
                        {dayKm !== null && (
                          <span className="badge badge-blue font-mono" style={{ fontSize: '0.7rem', marginTop: 2 }}>
                            +{dayKm.toLocaleString()} km
                          </span>
                        )}
                      </td>
                      <td>{log.tripsCount || 0} viajes</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', maxWidth: '160px' }}>
                        {log.notes || '-'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                          <button 
                            className="btn btn-secondary btn-sm" 
                            onClick={() => { setEditingLog(log); setDailyModalOpen(true); }}
                            title="Editar jornada"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button 
                            className="btn btn-secondary btn-sm" 
                            style={{ color: '#f87171' }}
                            onClick={() => handleDeleteDailyLog(log.id)}
                            title="Eliminar jornada"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DailyLogModal
        isOpen={dailyModalOpen}
        onClose={() => setDailyModalOpen(false)}
        onSave={handleSaveDailyLog}
        initialData={editingLog}
        currentOdometer={vehicleData?.current_odometer}
        activeApps={user?.activeApps || ['uber', 'cabify', 'didi']}
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
        currentOdometer={vehicleData?.current_odometer}
      />
    </div>
  );
}
