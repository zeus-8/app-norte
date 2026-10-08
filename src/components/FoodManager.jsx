'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShoppingBag, 
  Plus, 
  Trash2, 
  Edit3, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles,
  CreditCard,
  DollarSign,
  Layers,
  ChevronDown,
  ChevronUp,
  Settings,
  X
} from 'lucide-react';

const COMMON_STORES = [
  'Jumbo',
  'Día%',
  'Pigmento',
  'Coto',
  'Carrefour',
  'Carnicería',
  'Verdulería',
  'Chino / Barrio',
  'Farmacity'
];

const PAYMENT_METHODS = [
  'Efectivo',
  'Débito',
  'VISA',
  'MASTER',
  'Transferencia'
];

export default function FoodManager({ currentMonth, onFoodChanged }) {
  const [budgetData, setBudgetData] = useState(null);
  const [ticketsData, setTicketsData] = useState(null);
  const [household, setHousehold] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false); // Inicia colapsado por defecto para evitar sobrecarga visual

  // Modales
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);

  // Formulario de Ticket
  const [storeName, setStoreName] = useState('');
  const [ticketAmount, setTicketAmount] = useState('');
  const [ticketDate, setTicketDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [ticketPaymentMethod, setTicketPaymentMethod] = useState('Efectivo');
  const [ticketIsShared, setTicketIsShared] = useState(true);
  const [ticketUserSharePct, setTicketUserSharePct] = useState('60');
  const [ticketNotes, setTicketNotes] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  // Formulario de Presupuesto
  const [budgetType, setBudgetType] = useState('hybrid');
  const [monthlyBudget, setMonthlyBudget] = useState('600000');
  const [budgetIsShared, setBudgetIsShared] = useState(true);
  const [budgetUserSharePct, setBudgetUserSharePct] = useState('60');
  const [isSubmittingBudget, setIsSubmittingBudget] = useState(false);

  const fetchFoodData = useCallback(async () => {
    try {
      setLoading(true);
      const [bRes, tRes, hRes] = await Promise.all([
        fetch(`/api/food-budget?month=${currentMonth}`).then(r => r.json()),
        fetch(`/api/food-expenses?month=${currentMonth}`).then(r => r.json()),
        fetch('/api/household').then(r => r.json()).catch(() => ({ household: null })),
      ]);
      setBudgetData(bRes);
      setTicketsData(tRes);
      if (hRes?.household) {
        setHousehold(hRes.household);
        setTicketUserSharePct(String(Number(hRes.household.userSharePct) || 60));
        setBudgetUserSharePct(String(Number(hRes.household.userSharePct) || 60));
      }
      if (bRes?.budget) {
        setBudgetType(bRes.budget.budgetType || 'hybrid');
        setMonthlyBudget(String(bRes.budget.monthlyBudget || '0'));
        setBudgetIsShared(bRes.budget.isShared !== undefined ? bRes.budget.isShared : true);
        if (bRes.budget.userSharePct) {
          setBudgetUserSharePct(String(bRes.budget.userSharePct));
        }
      }
    } catch (err) {
      console.error('Error cargando datos de comida:', err);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    fetchFoodData();
  }, [fetchFoodData]);

  // Manejador: Abrir modal de ticket
  const handleOpenTicketModal = (ticket = null) => {
    if (ticket) {
      setEditingTicket(ticket);
      setStoreName(ticket.storeName || '');
      setTicketAmount(String(ticket.amount || ''));
      setTicketDate(ticket.date || new Date().toISOString().slice(0, 10));
      setTicketPaymentMethod(ticket.paymentMethod || 'Efectivo');
      setTicketIsShared(ticket.isShared !== undefined ? ticket.isShared : true);
      setTicketUserSharePct(String(ticket.userSharePct || (household ? Number(household.userSharePct) || 60 : 60)));
      setTicketNotes(ticket.notes || '');
    } else {
      setEditingTicket(null);
      setStoreName('');
      setTicketAmount('');
      setTicketDate(new Date().toISOString().slice(0, 10));
      setTicketPaymentMethod('Efectivo');
      setTicketIsShared(true);
      setTicketUserSharePct(String(household ? Number(household.userSharePct) || 60 : 60));
      setTicketNotes('');
    }
    setTicketModalOpen(true);
  };

  // Manejador: Guardar ticket
  const handleSaveTicket = async (e) => {
    e.preventDefault();
    if (!storeName.trim() || !ticketAmount || !ticketDate) {
      alert('Por favor ingresa el comercio, monto y fecha.');
      return;
    }

    setIsSubmittingTicket(true);
    try {
      const url = editingTicket ? `/api/food-expenses/${editingTicket.id}` : '/api/food-expenses';
      const method = editingTicket ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName: storeName.trim(),
          amount: parseFloat(ticketAmount),
          date: ticketDate,
          month: currentMonth,
          paymentMethod: ticketPaymentMethod,
          isShared: ticketIsShared,
          householdId: (ticketIsShared && household) ? household.id : null,
          userSharePct: parseFloat(ticketUserSharePct) || 60,
          notes: ticketNotes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al guardar el ticket');
      }

      setTicketModalOpen(false);
      await fetchFoodData();
      if (onFoodChanged) onFoodChanged();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  // Manejador: Eliminar ticket
  const handleDeleteTicket = async (id) => {
    if (!window.confirm('¿Eliminar este ticket de compra?')) return;
    try {
      const res = await fetch(`/api/food-expenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchFoodData();
        if (onFoodChanged) onFoodChanged();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Manejador: Guardar Presupuesto
  const handleSaveBudget = async (e) => {
    if (e) e.preventDefault();
    setIsSubmittingBudget(true);
    try {
      const res = await fetch('/api/food-budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: currentMonth,
          budgetType,
          monthlyBudget: parseFloat(monthlyBudget) || 0,
          isShared: budgetIsShared,
          userSharePct: parseFloat(budgetUserSharePct) || 60,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al guardar presupuesto');
      }

      setBudgetModalOpen(false);
      await fetchFoodData();
      if (onFoodChanged) onFoodChanged();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmittingBudget(false);
    }
  };

  // Calibración Rápida: Ajustar presupuesto al gasto real
  const handleSyncBudgetToReal = async () => {
    const totalSpent = ticketsData?.summary?.totalRaw || 0;
    if (totalSpent <= 0) return;
    if (!window.confirm(`¿Ajustar el presupuesto mensual de comida a $${totalSpent.toLocaleString()} (gasto real acumulado)?`)) return;

    try {
      await fetch('/api/food-budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: currentMonth,
          budgetType: budgetType || 'hybrid',
          monthlyBudget: totalSpent,
          isShared: budgetIsShared,
          userSharePct: parseFloat(budgetUserSharePct) || 60,
        }),
      });
      await fetchFoodData();
      if (onFoodChanged) onFoodChanged();
    } catch (err) {
      console.error(err);
    }
  };

  const budget = budgetData?.budget || {};
  const tracking = budgetData?.tracking || {};
  const tickets = ticketsData?.tickets || [];
  const ticketsSummary = ticketsData?.summary || {};
  const paymentBreakdown = ticketsSummary.paymentBreakdown || {};

  const budgetAmt = budget.monthlyBudget || 0;
  const totalSpent = tracking.totalTicketsRaw || 0;
  const userShareSpent = tracking.totalTicketsUserShare || 0;
  const pctSpent = tracking.pctSpent || (budgetAmt > 0 ? Math.round((totalSpent / budgetAmt) * 100) : 0);
  const isExceeded = budgetAmt > 0 && totalSpent > budgetAmt;
  const remaining = Math.max(0, budgetAmt - totalSpent);
  const surplus = Math.max(0, totalSpent - budgetAmt);

  return (
    <div className="card" style={{ marginBottom: 24, border: '1px solid rgba(245, 158, 11, 0.3)', background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.04) 0%, rgba(15, 23, 42, 0.6) 100%)' }}>
      {/* 1. Header del Módulo de Comida */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
            <ShoppingBag size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'white', margin: 0 }}>
                Rubro Comida & Supermercado
              </h3>
              <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>
                {budget.budgetType === 'tickets_only' ? 'Solo Tickets' : (budget.budgetType === 'budget_only' ? 'Solo Presupuesto' : 'Híbrido')}
              </span>
              <span className="badge badge-green" style={{ fontSize: '0.65rem' }} title="Presupuesto vinculado con el gasto de comida en la tabla de gastos">
                🔗 Sincronizado
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Control flexible: presupuesto tope mensual, tickets individuales (Jumbo, Día, Pigmento...) y medios de pago
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button 
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setBudgetModalOpen(true)}
            title="Configurar Presupuesto de Comida"
          >
            <Settings size={15} />
            <span>Configurar Meta</span>
          </button>

          <button 
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => handleOpenTicketModal()}
            style={{ background: '#f59e0b', borderColor: '#d97706' }}
          >
            <Plus size={15} />
            <span>+ Cargar Ticket</span>
          </button>

          <button 
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setIsExpanded(!isExpanded)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', background: isExpanded ? 'rgba(255,255,255,0.06)' : 'rgba(245, 158, 11, 0.12)', color: isExpanded ? 'var(--text-main)' : '#fbbf24', borderColor: isExpanded ? 'var(--border-color)' : 'rgba(245, 158, 11, 0.4)' }}
            title={isExpanded ? 'Contraer Detalle' : 'Expandir Detalle'}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            <span>{isExpanded ? 'Ocultar Detalle' : `Ver Compras (${tickets.length})`}</span>
          </button>
        </div>
      </div>

      {/* 2. Termómetro de Consumo de Comida */}
      <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 14 }}>
          {/* Card Presupuesto Asignado */}
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Presupuesto Mensual
            </div>
            <div className="font-mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f59e0b', marginTop: 2 }}>
              ${budgetAmt.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              Tu parte ({budget.userSharePct || 60}%): ${(budget.userMonthlyBudget || 0).toLocaleString()}
            </div>
          </div>

          {/* Card Gastado Real Acumulado */}
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Gastado Real ({tickets.length} tickets)
            </div>
            <div className="font-mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: isExceeded ? '#f43f5e' : '#34d399', marginTop: 2 }}>
              ${totalSpent.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              Tu aporte real: ${userShareSpent.toLocaleString()}
            </div>
          </div>

          {/* Card Estado / Restante */}
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {isExceeded ? 'Excedido del Presupuesto' : 'Disponible Restante'}
            </div>
            <div className="font-mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: isExceeded ? '#fb7185' : '#38bdf8', marginTop: 2 }}>
              {isExceeded ? `+$${surplus.toLocaleString()}` : `$${remaining.toLocaleString()}`}
            </div>
            <div style={{ fontSize: '0.72rem', color: isExceeded ? '#fb7185' : '#94a3b8' }}>
              {budgetAmt > 0 ? `${pctSpent}% del presupuesto consumido` : 'Sin presupuesto tope fijado'}
            </div>
          </div>
        </div>

        {/* Barra de Progreso Semafórica */}
        {budgetAmt > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4 }}>
              <span style={{ color: 'var(--text-muted)' }}>Progreso de Consumo:</span>
              <span className="font-mono" style={{ fontWeight: 700, color: isExceeded ? '#f43f5e' : (pctSpent >= 80 ? '#fbbf24' : '#10b981') }}>
                {pctSpent}% {isExceeded && '⚠️ (SUPERADO)'}
              </span>
            </div>
            <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', overflow: 'hidden' }}>
              <div 
                style={{ 
                  width: `${Math.min(100, pctSpent)}%`, 
                  height: '100%', 
                  background: isExceeded 
                    ? '#f43f5e' 
                    : (pctSpent >= 80 ? 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)' : 'linear-gradient(90deg, #10b981 0%, #34d399 100%)'), 
                  transition: 'width 0.4s ease',
                  borderRadius: '6px'
                }} 
              />
            </div>
          </div>
        )}

        {/* Alerta de exceso y botón de calibración rápida */}
        {isExceeded && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fca5a5', fontSize: '0.82rem' }}>
              <AlertTriangle size={18} />
              <span>Has superado el presupuesto inicial en <strong>${surplus.toLocaleString()}</strong>. Puedes ajustar el presupuesto mensual para reflejar el gasto real.</span>
            </div>
            <button 
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleSyncBudgetToReal}
              style={{ fontSize: '0.78rem', borderColor: '#f43f5e', color: 'white' }}
            >
              <Sparkles size={14} style={{ color: '#fbbf24' }} />
              <span>Ajustar Presupuesto a ${totalSpent.toLocaleString()}</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Desglose de Medios de Pago */}
      {isExpanded && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
            Desglose por Medio de Pago en Comida
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div className="badge badge-green font-mono" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
              💵 Efectivo: ${(paymentBreakdown.cash || 0).toLocaleString()}
            </div>
            <div className="badge badge-blue font-mono" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
              💳 Débito: ${(paymentBreakdown.debit || 0).toLocaleString()}
            </div>
            <div className="badge badge-purple font-mono" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
              💳 VISA: ${(paymentBreakdown.visa || 0).toLocaleString()}
            </div>
            <div className="badge badge-purple font-mono" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
              💳 MASTER: ${(paymentBreakdown.master || 0).toLocaleString()}
            </div>
            {paymentBreakdown.transfer > 0 && (
              <div className="badge badge-cyan font-mono" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                🏦 Transferencia: ${(paymentBreakdown.transfer || 0).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Lista Detallada de Tickets */}
      {isExpanded && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'white' }}>
              Tickets Registrados en el Mes ({tickets.length})
            </div>
          </div>

          {tickets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)' }}>
              <ShoppingBag size={28} style={{ opacity: 0.3, marginBottom: 6 }} />
              <p style={{ margin: 0, fontSize: '0.85rem' }}>No hay tickets de comida registrados este mes.</p>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                onClick={() => handleOpenTicketModal()}
                style={{ marginTop: 10 }}
              >
                + Cargar Primer Ticket
              </button>
            </div>
          ) : (
            <div className="table-container" style={{ maxHeight: '340px', overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Comercio / Lugar</th>
                    <th>Medio Pago</th>
                    <th>Monto Ticket</th>
                    <th>División</th>
                    <th>Tu Parte</th>
                    <th>Notas</th>
                    <th style={{ textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(t => (
                    <tr key={t.id}>
                      <td className="font-mono" style={{ fontSize: '0.82rem' }}>
                        {t.date}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: 'white' }}>
                          {t.storeName}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          t.paymentMethod === 'VISA' ? 'badge-blue' :
                          t.paymentMethod === 'MASTER' ? 'badge-purple' :
                          t.paymentMethod === 'Débito' ? 'badge-cyan' : 'badge-green'
                        }`} style={{ fontSize: '0.68rem' }}>
                          {t.paymentMethod}
                        </span>
                      </td>
                      <td className="font-mono" style={{ fontWeight: 700 }}>
                        ${Math.round(t.amount).toLocaleString()}
                      </td>
                      <td>
                        {t.isShared ? (
                          <span className="badge badge-blue font-mono" style={{ fontSize: '0.68rem' }}>
                            {t.userSharePct}%
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>100% Personal</span>
                        )}
                      </td>
                      <td className="font-mono text-emerald" style={{ fontWeight: 800 }}>
                        ${Math.round(t.userAmount).toLocaleString()}
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-dim)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.notes || '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                          <button 
                            type="button" 
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenTicketModal(t)}
                            title="Editar ticket"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button 
                            type="button" 
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteTicket(t.id)}
                            title="Eliminar ticket"
                          >
                            <Trash2 size={13} />
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
      )}

      {/* 5. MODAL: Cargar / Editar Ticket */}
      {ticketModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShoppingBag className="text-amber" size={20} />
                <h3 className="modal-title">
                  {editingTicket ? 'Editar Ticket de Comida' : 'Nuevo Ticket de Comida / Súper'}
                </h3>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setTicketModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTicket} className="modal-body">
              {/* Chips de comercios frecuentes */}
              <div className="form-group">
                <label className="form-label">Comercios Frecuentes (1 Toque):</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  {COMMON_STORES.map(store => (
                    <button
                      key={store}
                      type="button"
                      className={`btn btn-sm ${storeName === store ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                      onClick={() => setStoreName(store)}
                    >
                      {store}
                    </button>
                  ))}
                </div>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="O escribe el comercio (ej. Jumbo, Coto, Carnicería Pepe...)"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  required
                />
              </div>

              {/* Monto y Fecha */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Monto del Ticket ($):</label>
                  <input 
                    type="number"
                    step="any"
                    className="form-input font-mono"
                    placeholder="99999"
                    value={ticketAmount}
                    onChange={(e) => setTicketAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha de Compra:</label>
                  <input 
                    type="date"
                    className="form-input"
                    value={ticketDate}
                    onChange={(e) => setTicketDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Medio de Pago */}
              <div className="form-group">
                <label className="form-label">Medio de Pago:</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 6 }}>
                  {PAYMENT_METHODS.map(method => (
                    <button
                      key={method}
                      type="button"
                      className={`btn btn-sm ${ticketPaymentMethod === method ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.78rem' }}
                      onClick={() => setTicketPaymentMethod(method)}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gasto Compartido del Hogar */}
              <div className="form-group" style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: ticketIsShared ? 8 : 0 }}>
                  <input 
                    type="checkbox"
                    checked={ticketIsShared}
                    onChange={(e) => setTicketIsShared(e.target.checked)}
                  />
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'white' }}>
                    Gasto Compartido del Hogar
                  </span>
                </label>

                {ticketIsShared && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tu Porcentaje (%):</span>
                    <input 
                      type="number"
                      min="1"
                      max="100"
                      className="form-input font-mono"
                      style={{ width: '80px', padding: '4px 8px' }}
                      value={ticketUserSharePct}
                      onChange={(e) => setTicketUserSharePct(e.target.value)}
                    />
                    <span style={{ fontSize: '0.78rem', color: '#38bdf8' }}>
                      (Tu parte: ${Math.round((parseFloat(ticketAmount || 0) * (parseFloat(ticketUserSharePct || 60) / 100))).toLocaleString()})
                    </span>
                  </div>
                )}
              </div>

              {/* Notas */}
              <div className="form-group">
                <label className="form-label">Notas u Observaciones (Opcional):</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="Ej: Asado del domingo, compras del mes, limpieza..."
                  value={ticketNotes}
                  onChange={(e) => setTicketNotes(e.target.value)}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setTicketModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmittingTicket} style={{ background: '#f59e0b', borderColor: '#d97706' }}>
                  {isSubmittingTicket ? 'Guardando...' : (editingTicket ? 'Guardar Cambios' : 'Registrar Ticket')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: Configurar Presupuesto */}
      {budgetModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Settings className="text-amber" size={20} />
                <h3 className="modal-title">Configuración de Presupuesto de Comida</h3>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setBudgetModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="modal-body">
              <div className="form-group">
                <label className="form-label">Modo de Operación:</label>
                <select 
                  className="form-select"
                  value={budgetType}
                  onChange={(e) => setBudgetType(e.target.value)}
                >
                  <option value="hybrid">Híbrido (Presupuesto Tope + Registro Detallado de Tickets)</option>
                  <option value="tickets_only">Solo Tickets (El gasto es la suma real de tickets)</option>
                  <option value="budget_only">Solo Presupuesto Global (Monto mensual estimado)</option>
                </select>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  El modo <strong>Híbrido</strong> te permite comparar tus tickets reales contra tu meta y te avisa si te estás acercando o pasando del límite.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Monto Mensual Presupuestado ($):</label>
                <input 
                  type="number"
                  step="any"
                  className="form-input font-mono"
                  placeholder="600000"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}>
                  <input 
                    type="checkbox"
                    checked={budgetIsShared}
                    onChange={(e) => setBudgetIsShared(e.target.checked)}
                  />
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'white' }}>
                    Presupuesto Compartido del Hogar
                  </span>
                </label>

                {budgetIsShared && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tu Porcentaje (%):</span>
                    <input 
                      type="number"
                      min="1"
                      max="100"
                      className="form-input font-mono"
                      style={{ width: '80px', padding: '4px 8px' }}
                      value={budgetUserSharePct}
                      onChange={(e) => setBudgetUserSharePct(e.target.value)}
                    />
                    <span style={{ fontSize: '0.78rem', color: '#38bdf8' }}>
                      (Tu meta: ${Math.round((parseFloat(monthlyBudget || 0) * (parseFloat(budgetUserSharePct || 60) / 100))).toLocaleString()})
                    </span>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setBudgetModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmittingBudget} style={{ background: '#f59e0b', borderColor: '#d97706' }}>
                  {isSubmittingBudget ? 'Guardando...' : 'Guardar Presupuesto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
