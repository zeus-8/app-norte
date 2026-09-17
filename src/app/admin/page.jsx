'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Shield, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertOctagon, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  ArrowLeft, 
  Smartphone, 
  Receipt, 
  Wrench, 
  Key,
  Car,
  ToggleLeft,
  ToggleRight,
  Check,
  X
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'trial', 'suspended'
  const [loading, setLoading] = useState(true);

  // Modales
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('user');
  const [formDriverType, setFormDriverType] = useState('owner');
  const [formStatus, setFormStatus] = useState('active');
  const [formModuleDriver, setFormModuleDriver] = useState(true);
  const [formModuleExpenses, setFormModuleExpenses] = useState(true);
  const [formModuleVehicle, setFormModuleVehicle] = useState(true);
  const [formError, setFormError] = useState('');

  // Verificar sesión y cargar datos
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const meRes = await fetch('/api/auth/me').then(r => r.json());
      if (!meRes.authenticated || meRes.user?.role !== 'admin') {
        router.push('/dashboard');
        return;
      }
      setCurrentUser(meRes.user);

      const [statsRes, usersRes] = await Promise.all([
        fetch('/api/admin/stats').then(r => r.json()),
        fetch('/api/admin/users').then(r => r.json()),
      ]);

      setStats(statsRes);
      if (Array.isArray(usersRes)) setUsersList(usersRes);
    } catch (err) {
      console.error('Error cargando admin data:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toggle rápido de módulos
  const handleToggleModule = async (userId, field, currentVal) => {
    const newVal = !currentVal;
    
    // Actualización optimista
    setUsersList(prev => prev.map(u => u.id === userId ? { ...u, [field]: newVal } : u));

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: newVal }),
      });
      if (!res.ok) throw new Error('Error al actualizar módulo');
      const statsRes = await fetch('/api/admin/stats').then(r => r.json());
      setStats(statsRes);
    } catch (err) {
      console.error(err);
      await loadData();
    }
  };

  // Cambio de estado de suscripción
  const handleChangeStatus = async (userId, newStatus) => {
    setUsersList(prev => prev.map(u => u.id === userId ? { ...u, subscriptionStatus: newStatus } : u));
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionStatus: newStatus }),
      });
      const statsRes = await fetch('/api/admin/stats').then(r => r.json());
      setStats(statsRes);
    } catch (err) {
      console.error(err);
      await loadData();
    }
  };

  // Eliminar usuario
  const handleDeleteUser = async (userToDelete) => {
    if (!window.confirm(`¿Estás seguro de eliminar al usuario ${userToDelete.name} (${userToDelete.email})? Se borrarán todas sus jornadas y gastos.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar usuario');
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Abrir modal de edición
  const handleOpenEdit = (u) => {
    setSelectedUser(u);
    setFormName(u.name);
    setFormEmail(u.email);
    setFormRole(u.role);
    setFormDriverType(u.driverType);
    setFormStatus(u.subscriptionStatus);
    setFormModuleDriver(u.moduleDriver);
    setFormModuleExpenses(u.moduleExpenses);
    setFormModuleVehicle(u.moduleVehicle);
    setFormPassword('');
    setFormError('');
    setEditModalOpen(true);
  };

  // Guardar edición
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setFormError('');

    try {
      const payload = {
        name: formName,
        role: formRole,
        driverType: formDriverType,
        subscriptionStatus: formStatus,
        moduleDriver: formModuleDriver,
        moduleExpenses: formModuleExpenses,
        moduleVehicle: formModuleVehicle,
      };
      if (formPassword.trim()) {
        payload.newPassword = formPassword.trim();
      }

      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al actualizar usuario');
      }

      setEditModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(err.message);
    }
  };

  // Guardar nuevo usuario
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormError('');

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          password: formPassword,
          role: formRole,
          driverType: formDriverType,
          subscriptionStatus: formStatus,
          moduleDriver: formModuleDriver,
          moduleExpenses: formModuleExpenses,
          moduleVehicle: formModuleVehicle,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear usuario');

      setCreateModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const filteredUsers = usersList.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || u.subscriptionStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="app-container">
      {/* Header Admin */}
      <header className="card" style={{ padding: '14px 20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/dashboard" className="btn btn-secondary btn-sm" style={{ padding: '6px 10px' }}>
              <ArrowLeft size={16} />
              <span>Volver a la App</span>
            </Link>
            <div style={{ width: 1, height: 24, background: 'var(--border-color)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield className="text-amber" size={22} />
              <h1 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'white' }}>
                Panel de Administración SaaS
              </h1>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => {
                setFormName('');
                setFormEmail('');
                setFormPassword('');
                setFormRole('user');
                setFormDriverType('owner');
                setFormStatus('active');
                setFormModuleDriver(true);
                setFormModuleExpenses(true);
                setFormModuleVehicle(true);
                setFormError('');
                setCreateModalOpen(true);
              }}
            >
              <Plus size={16} />
              <span>+ Nuevo Suscriptor</span>
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* KPIs del SaaS */}
      <div className="grid-kpis">
        <div className="kpi-card cyan">
          <div className="kpi-header">
            <span className="kpi-label">Total Suscriptores</span>
            <div style={{ color: '#22d3ee' }}><Users size={20} /></div>
          </div>
          <div className="kpi-value font-mono text-cyan">
            {stats?.totalUsers || 0}
          </div>
          <div className="kpi-subtext">
            <span>{stats?.ownersCount || 0} auto propio • {stats?.rentersCount || 0} auto alquilado</span>
          </div>
        </div>

        <div className="kpi-card emerald">
          <div className="kpi-header">
            <span className="kpi-label">Suscripciones Activas</span>
            <div style={{ color: '#34d399' }}><CheckCircle2 size={20} /></div>
          </div>
          <div className="kpi-value font-mono text-emerald">
            {stats?.activeSubscribers || 0}
          </div>
          <div className="kpi-subtext">
            <span>Cuentas con acceso completo habilitado</span>
          </div>
        </div>

        <div className="kpi-card amber">
          <div className="kpi-header">
            <span className="kpi-label">Período de Prueba</span>
            <div style={{ color: '#fbbf24' }}><Clock size={20} /></div>
          </div>
          <div className="kpi-value font-mono text-amber">
            {stats?.trialSubscribers || 0}
          </div>
          <div className="kpi-subtext">
            <span>Usuarios en período de prueba gratuito</span>
          </div>
        </div>

        <div className="kpi-card rose">
          <div className="kpi-header">
            <span className="kpi-label">Cuentas Suspendidas</span>
            <div style={{ color: '#fb7185' }}><AlertOctagon size={20} /></div>
          </div>
          <div className="kpi-value font-mono text-rose">
            {stats?.suspendedSubscribers || 0}
          </div>
          <div className="kpi-subtext">
            <span>Acceso revocado por falta de pago o baja</span>
          </div>
        </div>
      </div>

      {/* Tabla de Suscriptores y Feature Flags */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 18 }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'white', margin: 0 }}>
              Control de Suscriptores y Feature Flags
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Activa o desactiva módulos en tiempo real por cada cliente según su plan contratado
            </p>
          </div>

          {/* Filtros y Buscador */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', minWidth: '220px' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="text"
                placeholder="Buscar por nombre o correo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', padding: '8px 12px 8px 34px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'white', fontSize: '0.85rem' }}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'white', fontSize: '0.85rem' }}
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="trial">Prueba (Trial)</option>
              <option value="suspended">Suspendidos</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Usuario / Suscriptor</th>
                <th>Modalidad</th>
                <th>Estado Suscripción</th>
                <th style={{ textAlign: 'center' }}>Módulo Apps</th>
                <th style={{ textAlign: 'center' }}>Módulo Gastos</th>
                <th style={{ textAlign: 'center' }}>Módulo Auto</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>
                      {u.name} {u.role === 'admin' && <span className="badge badge-yellow" style={{ fontSize: '0.65rem' }}>ADMIN</span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                  </td>

                  <td>
                    <span className={`badge ${u.driverType === 'owner' ? 'badge-blue' : 'badge-purple'}`} style={{ fontSize: '0.75rem' }}>
                      {u.driverType === 'owner' ? '🚗 Auto Propio' : '🔑 Alquilado'}
                    </span>
                  </td>

                  <td>
                    <select
                      value={u.subscriptionStatus}
                      onChange={(e) => handleChangeStatus(u.id, e.target.value)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        background: u.subscriptionStatus === 'active' ? 'rgba(16, 185, 129, 0.2)' : (u.subscriptionStatus === 'trial' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(244, 63, 94, 0.2)'),
                        color: u.subscriptionStatus === 'active' ? '#34d399' : (u.subscriptionStatus === 'trial' ? '#fbbf24' : '#fb7185'),
                      }}
                    >
                      <option value="active">Activo</option>
                      <option value="trial">Prueba</option>
                      <option value="suspended">Suspendido</option>
                      <option value="expired">Vencido</option>
                    </select>
                  </td>

                  {/* Switch Módulo Apps */}
                  <td style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => handleToggleModule(u.id, 'moduleDriver', u.moduleDriver)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        background: u.moduleDriver ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)',
                        color: u.moduleDriver ? '#34d399' : 'var(--text-dim)',
                      }}
                    >
                      {u.moduleDriver ? <Check size={12} /> : <X size={12} />}
                      <span>{u.moduleDriver ? 'Habilitado' : 'Desactivado'}</span>
                    </button>
                  </td>

                  {/* Switch Módulo Gastos */}
                  <td style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => handleToggleModule(u.id, 'moduleExpenses', u.moduleExpenses)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        background: u.moduleExpenses ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.05)',
                        color: u.moduleExpenses ? '#c084fc' : 'var(--text-dim)',
                      }}
                    >
                      {u.moduleExpenses ? <Check size={12} /> : <X size={12} />}
                      <span>{u.moduleExpenses ? 'Habilitado' : 'Desactivado'}</span>
                    </button>
                  </td>

                  {/* Switch Módulo Vehículo */}
                  <td style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => handleToggleModule(u.id, 'moduleVehicle', u.moduleVehicle)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        background: u.moduleVehicle ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255,255,255,0.05)',
                        color: u.moduleVehicle ? '#22d3ee' : 'var(--text-dim)',
                      }}
                    >
                      {u.moduleVehicle ? <Check size={12} /> : <X size={12} />}
                      <span>{u.moduleVehicle ? 'Habilitado' : 'Desactivado'}</span>
                    </button>
                  </td>

                  {/* Acciones */}
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenEdit(u)}
                        title="Editar suscriptor"
                      >
                        <Edit3 size={14} />
                      </button>
                      {u.id !== currentUser?.id && (
                        <button 
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#f87171' }}
                          onClick={() => handleDeleteUser(u)}
                          title="Eliminar suscriptor"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Editar Suscriptor */}
      {editModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', padding: '16px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white', margin: 0 }}>Editar Suscriptor</h3>
              <button onClick={() => setEditModalOpen(false)} className="btn btn-secondary btn-sm" style={{ padding: '6px' }}><X size={16} /></button>
            </div>

            {formError && <div style={{ color: '#fb7185', fontSize: '0.85rem', marginBottom: '12px' }}>{formError}</div>}

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>NOMBRE</label>
                <input type="text" required value={formName} onChange={e => setFormName(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'white' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>ROL</label>
                  <select value={formRole} onChange={e => setFormRole(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'white' }}>
                    <option value="user">Usuario (Chofer)</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>MODALIDAD AUTO</label>
                  <select value={formDriverType} onChange={e => setFormDriverType(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'white' }}>
                    <option value="owner">Auto Propio</option>
                    <option value="renter">Auto Alquilado</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>RESETEAR CONTRASEÑA (OPCIONAL)</label>
                <input type="password" placeholder="Dejar en blanco para no cambiarla" value={formPassword} onChange={e => setFormPassword(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'white' }} />
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '10px', justifyContent: 'center' }}>
                Guardar Cambios
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear Suscriptor */}
      {createModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', padding: '16px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white', margin: 0 }}>Crear Nuevo Suscriptor</h3>
              <button onClick={() => setCreateModalOpen(false)} className="btn btn-secondary btn-sm" style={{ padding: '6px' }}><X size={16} /></button>
            </div>

            {formError && <div style={{ color: '#fb7185', fontSize: '0.85rem', marginBottom: '12px' }}>{formError}</div>}

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>NOMBRE COMPLETO</label>
                <input type="text" required value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ej. Carlos Rodríguez" style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'white' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>CORREO ELECTRÓNICO</label>
                <input type="email" required value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="carlos@correo.com" style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'white' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>CONTRASEÑA TEMPORAL</label>
                <input type="password" required minLength={6} value={formPassword} onChange={e => setFormPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'white' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>ROL</label>
                  <select value={formRole} onChange={e => setFormRole(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'white' }}>
                    <option value="user">Usuario (Chofer)</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>MODALIDAD AUTO</label>
                  <select value={formDriverType} onChange={e => setFormDriverType(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'white' }}>
                    <option value="owner">Auto Propio</option>
                    <option value="renter">Auto Alquilado</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '10px', justifyContent: 'center' }}>
                Crear y Activar Suscripción
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
