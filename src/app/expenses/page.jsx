'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import ExpenseModal from '@/components/ExpenseModal';
import { 
  Receipt, 
  CreditCard, 
  Plus, 
  Edit3, 
  Trash2, 
  Users, 
  Calendar, 
  Layers, 
  ChevronDown, 
  ChevronUp,
  Sparkles
} from 'lucide-react';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function ExpensesPage() {
  const [user, setUser] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });

  const [expensesData, setExpensesData] = useState(null);
  const [projections, setProjections] = useState([]);
  const [showProjections, setShowProjections] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'fixed', 'installment', 'shared', 'one_time'
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => { if (data.authenticated) setUser(data.user); });
  }, []);

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      const [expRes, projRes] = await Promise.all([
        fetch(`/api/expenses?month=${currentMonth}`).then(r => r.json()),
        fetch(`/api/expenses/projections?start_month=${currentMonth}&months=12`).then(r => r.json()),
      ]);
      setExpensesData(expRes);
      if (Array.isArray(projRes)) setProjections(projRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleSaveExpense = async (data) => {
    const url = data.id ? `/api/expenses/${data.id}` : '/api/expenses';
    const method = data.id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al guardar gasto');
    }
    await refreshData();
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este gasto?')) return;
    const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    if (res.ok) await refreshData();
  };

  const expenses = expensesData?.expenses || [];
  const summary = expensesData?.summary || {};

  const filteredExpenses = expenses.filter(exp => {
    if (activeFilter === 'fixed') return exp.type === 'fixed';
    if (activeFilter === 'installment') return exp.type === 'installment';
    if (activeFilter === 'shared') return Boolean(exp.isShared);
    if (activeFilter === 'one_time') return exp.type === 'one_time';
    return true;
  });

  return (
    <div className="app-container">
      <Navbar
        user={user}
        currentMonth={currentMonth}
        setCurrentMonth={setCurrentMonth}
        onOpenExpenseModal={() => { setEditingExpense(null); setExpenseModalOpen(true); }}
      />

      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Receipt className="text-amber" size={24} />
            <span>Control de Gastos, Hogar y Cuotas Sin Interés</span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Administra tus gastos fijos recurrentes, divisiones compartidas del hogar y proyección de cuotas a 12 meses
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => { setEditingExpense(null); setExpenseModalOpen(true); }}>
          <Plus size={16} />
          <span>+ Nuevo Gasto o Cuota</span>
        </button>
      </div>

      {/* KPIs de Gastos */}
      <div className="grid-kpis">
        <div className="kpi-card rose">
          <div className="kpi-header">
            <span className="kpi-label">Tus Obligaciones Mes</span>
            <div style={{ color: '#fb7185' }}><Receipt size={20} /></div>
          </div>
          <div className="kpi-value font-mono text-rose">
            ${(summary.totalUserMonthlyTarget || 0).toLocaleString()}
          </div>
          <div className="kpi-subtext">
            <span>Tu total a cubrir en el mes seleccionado</span>
          </div>
        </div>

        <div className="kpi-card purple">
          <div className="kpi-header">
            <span className="kpi-label">Compras en Cuotas</span>
            <div style={{ color: '#c084fc' }}><CreditCard size={20} /></div>
          </div>
          <div className="kpi-value font-mono text-purple">
            ${(summary.totalUserInstallments || 0).toLocaleString()}
          </div>
          <div className="kpi-subtext">
            <span>{expenses.filter(e => e.type === 'installment').length} cuotas activas</span>
          </div>
        </div>

        <div className="kpi-card amber">
          <div className="kpi-header">
            <span className="kpi-label">Tus Gastos Fijos</span>
            <div style={{ color: '#fbbf24' }}><Layers size={20} /></div>
          </div>
          <div className="kpi-value font-mono text-amber">
            ${(summary.totalUserFixed || 0).toLocaleString()}
          </div>
          <div className="kpi-subtext">
            <span>Alquiler, servicios, seguro y personales</span>
          </div>
        </div>

        <div className="kpi-card cyan">
          <div className="kpi-header">
            <span className="kpi-label">Total Gastos del Hogar</span>
            <div style={{ color: '#38bdf8' }}><Users size={20} /></div>
          </div>
          <div className="kpi-value font-mono text-cyan">
            ${(summary.totalHouseholdAll || 0).toLocaleString()}
          </div>
          <div className="kpi-subtext">
            <span>100% de costos compartidos de la casa</span>
          </div>
        </div>
      </div>

      {/* Sección de Proyección Mensual Futura */}
      <div className="card" style={{ marginBottom: 24, border: '1px solid rgba(139, 92, 246, 0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#c4b5fd', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CreditCard size={18} />
              <span>Proyección de Cuotas y Obligaciones Futuras (12 Meses)</span>
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Mira cómo va disminuyendo tu carga mensual a medida que finalizas cuotas de tarjetas
            </p>
          </div>

          <button 
            className="btn btn-secondary btn-sm" 
            onClick={() => setShowProjections(!showProjections)}
          >
            {showProjections ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            <span>{showProjections ? 'Minimizar' : 'Ver Proyección 12 Meses'}</span>
          </button>
        </div>

        {showProjections && projections.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', overflowX: 'auto', paddingBottom: '6px' }}>
            {projections.slice(0, 8).map(proj => {
              const [yStr, mStr] = proj.month.split('-');
              const mIdx = parseInt(mStr, 10) - 1;
              const isSelected = proj.month === currentMonth;

              return (
                <div 
                  key={proj.month}
                  onClick={() => setCurrentMonth(proj.month)}
                  style={{
                    background: isSelected ? 'rgba(139, 92, 246, 0.2)' : 'rgba(0, 0, 0, 0.25)',
                    border: isSelected ? '2px solid #8b5cf6' : '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  title={`Clic para ver ${MONTH_NAMES[mIdx]} ${yStr}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: isSelected ? '#ffffff' : 'var(--text-main)' }}>
                      {MONTH_NAMES[mIdx]} {yStr}
                    </span>
                    {isSelected && <span className="badge badge-purple" style={{ fontSize: '0.62rem' }}>ACTUAL</span>}
                  </div>

                  <div className="font-mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f3f4f6', marginBottom: 4 }}>
                    ${proj.totalUser.toLocaleString()}
                  </div>

                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div>Fijos: <strong className="font-mono text-main">${proj.userFixed.toLocaleString()}</strong></div>
                    <div>Cuotas: <strong className="font-mono text-purple" style={{ color: '#c084fc' }}>${proj.userInstallments.toLocaleString()}</strong></div>
                    <div style={{ color: 'var(--text-dim)', marginTop: 2 }}>
                      {proj.activeInstallmentsCount} {proj.activeInstallmentsCount === 1 ? 'cuota activa' : 'cuotas activas'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        <button 
          className={`btn btn-sm ${activeFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveFilter('all')}
        >
          Todos ({expenses.length})
        </button>
        <button 
          className={`btn btn-sm ${activeFilter === 'fixed' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveFilter('fixed')}
        >
          📌 Fijos ({expenses.filter(e => e.type === 'fixed').length})
        </button>
        <button 
          className={`btn btn-sm ${activeFilter === 'installment' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveFilter('installment')}
        >
          💳 En Cuotas ({expenses.filter(e => e.type === 'installment').length})
        </button>
        <button 
          className={`btn btn-sm ${activeFilter === 'shared' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveFilter('shared')}
        >
          🏠 Compartidos ({expenses.filter(e => e.isShared).length})
        </button>
        <button 
          className={`btn btn-sm ${activeFilter === 'one_time' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveFilter('one_time')}
        >
          ⚡ 1 Solo Pago ({expenses.filter(e => e.type === 'one_time').length})
        </button>
      </div>

      {/* Tabla de Gastos */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 className="card-title" style={{ margin: 0 }}>
            <span>Gastos Activos del Mes ({filteredExpenses.length})</span>
          </h3>
        </div>

        {filteredExpenses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
            <Receipt size={36} style={{ opacity: 0.3, marginBottom: 10 }} />
            <p>No hay gastos que coincidan con este filtro en el mes seleccionado.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Categoría</th>
                  <th>Tipo / Cuotas</th>
                  <th>Monto Total/Cuota</th>
                  <th>División</th>
                  <th>Tu Monto</th>
                  <th>Medio Pago</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map(exp => (
                  <tr key={exp.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>{exp.name}</div>
                      {exp.notes && <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{exp.notes}</div>}
                    </td>

                    <td>
                      <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>
                        {exp.category}
                      </span>
                    </td>

                    <td>
                      {exp.type === 'installment' && (
                        <span className="badge badge-purple font-mono" style={{ fontSize: '0.75rem' }}>
                          Cuota {exp.current_installment_num} de {exp.total_installments}
                        </span>
                      )}
                      {exp.type === 'fixed' && (
                        <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>Fijo Recurrente</span>
                      )}
                      {exp.type === 'one_time' && (
                        <span className="badge badge-yellow" style={{ fontSize: '0.7rem' }}>1 Solo Pago</span>
                      )}
                    </td>

                    <td className="font-mono">
                      ${Math.round(exp.monthly_amount).toLocaleString()}
                      {exp.type === 'installment' && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                          Total: ${Number(exp.totalAmount).toLocaleString()}
                        </div>
                      )}
                    </td>

                    <td>
                      {exp.isShared ? (
                        <span className="badge badge-blue font-mono" style={{ fontSize: '0.72rem' }}>
                          <Users size={12} style={{ marginRight: 3 }} />
                          {exp.userSharePct}% propio
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>100% tuyo</span>
                      )}
                    </td>

                    <td className="font-mono text-emerald" style={{ fontWeight: 800, fontSize: '1rem' }}>
                      ${Math.round(exp.user_amount).toLocaleString()}
                    </td>

                    <td>
                      <span className={`badge ${
                        exp.paymentMethod === 'VISA' ? 'badge-blue' : 
                        exp.paymentMethod === 'MASTER' ? 'badge-purple' : 'badge-green'
                      }`} style={{ fontSize: '0.7rem' }}>
                        {exp.paymentMethod}
                      </span>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => { setEditingExpense(exp); setExpenseModalOpen(true); }}
                          title="Editar gasto"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          style={{ color: '#f87171' }}
                          onClick={() => handleDeleteExpense(exp.id)}
                          title="Eliminar gasto"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ExpenseModal
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        onSave={handleSaveExpense}
        initialData={editingExpense}
        currentMonth={currentMonth}
      />
    </div>
  );
}
