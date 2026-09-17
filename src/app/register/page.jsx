'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Car, Lock, Mail, User, ArrowRight, AlertCircle, Shield, Key } from 'lucide-react';

const AVAILABLE_APPS = [
  { id: 'uber', name: 'Uber' },
  { id: 'cabify', name: 'Cabify' },
  { id: 'didi', name: 'DiDi' },
  { id: 'rappi', name: 'Rappi' },
  { id: 'pedidosya', name: 'PedidosYa' },
  { id: 'indrive', name: 'InDrive' },
];

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [driverType, setDriverType] = useState('owner'); // 'owner' | 'renter'
  const [selectedApps, setSelectedApps] = useState(['uber', 'cabify', 'didi']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleApp = (appId) => {
    setSelectedApps(prev => 
      prev.includes(appId) ? prev.filter(id => id !== appId) : [...prev, appId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (selectedApps.length === 0) {
      setError('Debes seleccionar al menos una aplicación de trabajo');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          driverType,
          activeApps: selectedApps,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al registrar la cuenta');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '30px 20px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '32px 28px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', padding: '12px', background: 'rgba(16, 185, 129, 0.12)', borderRadius: '16px', color: '#34d399', marginBottom: '12px' }}>
            <Car size={32} />
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '6px' }}>Crea tu cuenta</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Empieza a gestionar tus ingresos, cuotas y vehículo de forma profesional
          </p>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: '#fb7185', fontSize: '0.85rem', marginBottom: '18px' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
              NOMBRE COMPLETO
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Juan Pérez"
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
              CORREO ELECTRÓNICO
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="juan@correo.com"
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
              CONTRASEÑA (MÍNIMO 6 CARACTERES)
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Modalidad de Trabajo en Argentina */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
              MODALIDAD DEL VEHÍCULO
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setDriverType('owner')}
                style={{
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  border: driverType === 'owner' ? '2px solid #3b82f6' : '1px solid var(--border-color)',
                  background: driverType === 'owner' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(0,0,0,0.2)',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                <div>🚗 Auto Propio</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>Mantenimiento, VTV y GNC a mi cargo</div>
              </button>

              <button
                type="button"
                onClick={() => setDriverType('renter')}
                style={{
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  border: driverType === 'renter' ? '2px solid #8b5cf6' : '1px solid var(--border-color)',
                  background: driverType === 'renter' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(0,0,0,0.2)',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                <div>🔑 Auto Alquilado</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>Pago canon fijo semanal/mensual</div>
              </button>
            </div>
          </div>

          {/* Aplicaciones que utiliza */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
              APLICACIONES CON LAS QUE TRABAJAS
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {AVAILABLE_APPS.map(app => {
                const isSelected = selectedApps.includes(app.id);
                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => toggleApp(app.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '9999px',
                      border: isSelected ? '1px solid #34d399' : '1px solid var(--border-color)',
                      background: isSelected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(0,0,0,0.2)',
                      color: isSelected ? '#34d399' : 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                    }}
                  >
                    {isSelected ? '✓ ' : '+ '}{app.name}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: '10px', fontSize: '0.95rem' }}
          >
            <span>{loading ? 'Creando cuenta...' : 'Registrarse y Comenzar'}</span>
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" style={{ color: '#60a5fa', fontWeight: 700, textDecoration: 'none' }}>
            Inicia sesión aquí
          </Link>
        </div>
      </div>
    </div>
  );
}
