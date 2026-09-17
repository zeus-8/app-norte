'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Car, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      router.push(from);
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '32px 28px' }}>
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{ display: 'inline-flex', padding: '12px', background: 'rgba(59, 130, 246, 0.12)', borderRadius: '16px', color: '#60a5fa', marginBottom: '12px' }}>
          <Car size={32} />
        </div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '6px' }}>Bienvenido de nuevo</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Ingresa a tu cuenta de AutoGastos SaaS
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
            CORREO ELECTRÓNICO
          </label>
          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@correo.com"
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
            CONTRASEÑA
          </label>
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="password"
              required
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

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: '8px', fontSize: '0.95rem' }}
        >
          <span>{loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}</span>
          {!loading && <ArrowRight size={16} />}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '22px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        ¿No tienes una cuenta?{' '}
        <Link href="/register" style={{ color: '#60a5fa', fontWeight: 700, textDecoration: 'none' }}>
          Regístrate aquí
        </Link>
      </div>

      <div style={{ marginTop: '24px', padding: '12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
        <div><strong>Demo Chofer:</strong> juan@chofer.com / juan123</div>
        <div><strong>Demo Admin:</strong> admin@autogastos.com / admin123</div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <Suspense fallback={<div className="card" style={{ padding: '24px', textAlign: 'center' }}>Cargando...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
