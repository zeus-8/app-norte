'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { 
  User, 
  Car, 
  Send, 
  Key, 
  CheckCircle2, 
  AlertTriangle, 
  Save, 
  ExternalLink,
  ShieldCheck,
  Bell,
  Smartphone,
  Check,
  RefreshCw,
  Zap,
  HelpCircle
} from 'lucide-react';

const AVAILABLE_APPS = [
  { id: 'uber', name: 'Uber', color: '#000000', badgeClass: 'badge-blue' },
  { id: 'cabify', name: 'Cabify', color: '#7145d6', badgeClass: 'badge-purple' },
  { id: 'didi', name: 'DiDi', color: '#ff7d00', badgeClass: 'badge-yellow' },
  { id: 'indrive', name: 'InDrive', color: '#88cf00', badgeClass: 'badge-green' },
  { id: 'rappi', name: 'Rappi', color: '#ff441f', badgeClass: 'badge-red' },
  { id: 'pedidosya', name: 'PedidosYa', color: '#ea044e', badgeClass: 'badge-red' },
];

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  
  // Mensajes de feedback
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [testResult, setTestResult] = useState(null);

  // Estados del perfil
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [driverType, setDriverType] = useState('owner');
  const [activeApps, setActiveApps] = useState(['uber', 'cabify', 'didi']);
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramAlertDays, setTelegramAlertDays] = useState(5);
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [botUsername, setBotUsername] = useState('AutoGastosBot');

  // Estados de cambio de contraseña
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/user/profile');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        setName(data.user.name || '');
        setDriverType(data.user.driverType || 'owner');
        setActiveApps(Array.isArray(data.user.activeApps) ? data.user.activeApps : ['uber', 'cabify', 'didi']);
        setTelegramChatId(data.user.telegramChatId || '');
        setTelegramAlertDays(data.user.telegramAlertDays || 5);
        setTelegramEnabled(Boolean(data.user.telegramEnabled));
        if (data.botUsername) setBotUsername(data.botUsername);
      }
    } catch (err) {
      console.error('Error al cargar perfil:', err);
      setErrorMsg('Error al cargar datos de configuración');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleToggleApp = (appId) => {
    setActiveApps(prev => {
      if (prev.includes(appId)) {
        if (prev.length === 1) return prev; // Mantener al menos una
        return prev.filter(id => id !== appId);
      } else {
        return [...prev, appId];
      }
    });
  };

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          driverType,
          activeApps,
          telegramChatId,
          telegramAlertDays,
          telegramEnabled,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar cambios');
      }

      setUser(data.user);
      setSuccessMsg('¡Configuración guardada exitosamente!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestTelegram = async () => {
    setTestingTelegram(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramChatId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo enviar la prueba');
      }
      setTestResult({
        success: true,
        message: data.message || '¡Mensaje de prueba enviado!',
        simulated: data.simulated,
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err.message,
      });
    } finally {
      setTestingTelegram(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Las nuevas contraseñas no coinciden');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al cambiar contraseña');
      }

      setPasswordSuccess('Contraseña cambiada con éxito');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 4000);
    } catch (err) {
      setPasswordError(err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-dim)' }}>
          <RefreshCw className="spin" size={24} />
          <span>Cargando configuración...</span>
        </div>
      </div>
    );
  }

  const directTelegramLink = `https://t.me/${botUsername}?start=${user?.id || ''}`;

  return (
    <div className="app-container">
      {/* Navbar Global con todas las pestañas */}
      <Navbar user={user} />

      {/* Header de Configuración */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Configuración y Preferencias</span>
          </h1>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
            Ajustá tus aplicaciones de trabajo, modalidad operativa y bot de Telegram.
          </div>
        </div>

        <button 
          type="button" 
          onClick={handleSaveProfile} 
          disabled={saving} 
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Save size={16} />
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      {/* Global Alerts */}
      {successMsg && (
        <div className="card" style={{ padding: '14px 18px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--accent-emerald)', color: 'var(--accent-emerald)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle2 size={18} />
          <span style={{ fontWeight: 600 }}>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="card" style={{ padding: '14px 18px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-rose)', color: 'var(--accent-rose)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={18} />
          <span style={{ fontWeight: 600 }}>{errorMsg}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Columna Izquierda: Perfil y Apps de Trabajo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Card: Modalidad Operativa */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div className="kpi-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                <Car size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>Modalidad de Vehículo</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>¿Cómo trabajás tu jornada diaria?</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div 
                onClick={() => setDriverType('owner')}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  border: driverType === 'owner' ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)',
                  background: driverType === 'owner' ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-input)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
              >
                {driverType === 'owner' && (
                  <div style={{ position: 'absolute', top: 8, right: 8, color: 'var(--accent-blue)' }}>
                    <CheckCircle2 size={16} />
                  </div>
                )}
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: 4 }}>
                  Auto Propio
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.3 }}>
                  Cubrís el mantenimiento, VTV, GNC, cubiertas y provisión para repuestos.
                </div>
              </div>

              <div 
                onClick={() => setDriverType('renter')}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  border: driverType === 'renter' ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)',
                  background: driverType === 'renter' ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-input)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
              >
                {driverType === 'renter' && (
                  <div style={{ position: 'absolute', top: 8, right: 8, color: 'var(--accent-blue)' }}>
                    <CheckCircle2 size={16} />
                  </div>
                )}
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: 4 }}>
                  Auto Alquilado
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.3 }}>
                  El dueño se encarga de los arreglos mecánicos. Tus costos son alquiler y combustible.
                </div>
              </div>
            </div>
          </div>

          {/* Card: Apps de Trabajo */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div className="kpi-icon-wrap" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
                <Smartphone size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>Plataformas & Apps de Trabajo</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Seleccioná las aplicaciones que utilizás</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {AVAILABLE_APPS.map(app => {
                const isSelected = activeApps.includes(app.id);
                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => handleToggleApp(app.id)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)',
                      background: isSelected ? 'var(--accent-blue)' : 'var(--bg-input)',
                      color: isSelected ? '#ffffff' : 'var(--text-main)',
                      fontWeight: 600,
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isSelected && <Check size={14} />}
                    <span>{app.name}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 12 }}>
              Estas plataformas aparecerán en el modal de carga de jornada diaria.
            </div>
          </div>

          {/* Card: Datos Personales */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div className="kpi-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                <User size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>Datos de Cuenta</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Información básica del suscriptor</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label">Nombre Completo</label>
                <input 
                  type="text" 
                  className="input" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Tu nombre"
                />
              </div>
              <div>
                <label className="label">Correo Electrónico (No editable)</label>
                <input 
                  type="email" 
                  className="input" 
                  value={user?.email || ''} 
                  disabled 
                  style={{ opacity: 0.6, cursor: 'not-allowed' }}
                />
              </div>
            </div>
          </div>

        </div>

        {/* Columna Derecha: Bot de Telegram & Seguridad */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Card: Integración de Telegram */}
          <div className="card" style={{ border: telegramEnabled ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, #229ED9 0%, #0088cc 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                  <Send size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>Bot de Telegram</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Alertas de fin de mes y vencimientos</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: telegramEnabled ? 'var(--accent-emerald)' : 'var(--text-dim)' }}>
                  <input 
                    type="checkbox" 
                    checked={telegramEnabled} 
                    onChange={(e) => setTelegramEnabled(e.target.checked)}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <span>{telegramEnabled ? 'Activado' : 'Desactivado'}</span>
                </label>
              </div>
            </div>

            {/* Banner de Vinculación 1-Click */}
            <div style={{ padding: '14px', background: 'rgba(0, 136, 204, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0, 136, 204, 0.2)', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#229ED9', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={14} />
                <span>Vinculación Automática</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', marginBottom: 10, lineHeight: 1.4 }}>
                Abrí el bot en tu Telegram y pulsa <b>Iniciar</b> para conectar tu cuenta:
              </div>
              <a 
                href={directTelegramLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-sm"
                style={{
                  background: '#0088cc',
                  color: '#ffffff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 600,
                  fontSize: '0.78rem',
                  textDecoration: 'none',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                <Send size={14} /> Abrir @{botUsername}
                <ExternalLink size={12} />
              </a>
            </div>

            {/* Configuración Manual de Chat ID */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Tu Chat ID de Telegram</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    (Obtenelo con @userinfobot)
                  </span>
                </label>
                <input 
                  type="text" 
                  className="input" 
                  value={telegramChatId} 
                  onChange={(e) => setTelegramChatId(e.target.value)} 
                  placeholder="Ej: 123456789"
                />
              </div>

              <div>
                <label className="label">Frecuencia de Alerta de Cierre</label>
                <select 
                  className="input" 
                  value={telegramAlertDays} 
                  onChange={(e) => setTelegramAlertDays(parseInt(e.target.value, 10))}
                >
                  <option value="1">1 día antes del cierre</option>
                  <option value="3">3 días antes del cierre</option>
                  <option value="5">5 días antes del cierre (Recomendado)</option>
                  <option value="7">7 días antes del cierre</option>
                  <option value="10">Diario durante los últimos 10 días</option>
                </select>
              </div>

              {/* Botón de Prueba */}
              <div style={{ paddingTop: 8 }}>
                <button
                  type="button"
                  onClick={handleTestTelegram}
                  disabled={testingTelegram || !telegramChatId}
                  className="btn btn-secondary"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.85rem' }}
                >
                  <Send size={15} />
                  {testingTelegram ? 'Enviando mensaje de prueba...' : 'Enviar Notificación de Prueba a Telegram'}
                </button>

                {testResult && (
                  <div style={{
                    marginTop: 10,
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    background: testResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${testResult.success ? 'var(--accent-emerald)' : 'var(--accent-rose)'}`,
                    color: testResult.success ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    {testResult.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card: Seguridad y Cambio de Contraseña */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div className="kpi-icon-wrap" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                <Key size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>Seguridad de la Cuenta</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Modificar contraseña de acceso</div>
              </div>
            </div>

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {passwordSuccess && (
                <div style={{ padding: '8px 12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-emerald)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>
                  {passwordSuccess}
                </div>
              )}
              {passwordError && (
                <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-rose)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>
                  {passwordError}
                </div>
              )}

              <div>
                <label className="label">Contraseña Actual</label>
                <input 
                  type="password" 
                  className="input" 
                  value={currentPassword} 
                  onChange={(e) => setCurrentPassword(e.target.value)} 
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="label">Nueva Contraseña</label>
                <input 
                  type="password" 
                  className="input" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div>
                <label className="label">Confirmar Nueva Contraseña</label>
                <input 
                  type="password" 
                  className="input" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  placeholder="Repetir nueva contraseña"
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-secondary btn-sm"
                style={{ marginTop: 6, alignSelf: 'flex-start' }}
              >
                Actualizar Contraseña
              </button>
            </form>
          </div>

        </div>

      </div>

    </div>
  );
}
