import React from 'react';
import Link from 'next/link';
import { 
  Car, 
  Receipt, 
  Wrench, 
  TrendingUp, 
  ShieldCheck, 
  Smartphone, 
  Send,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="app-container" style={{ paddingTop: '40px', maxWidth: '1080px' }}>
      {/* Header / Hero */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '9999px', color: '#60a5fa', fontSize: '0.85rem', fontWeight: 700, marginBottom: '16px' }}>
          <span>🚀 Plataforma SaaS 2.0 en Next.js + PostgreSQL</span>
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: '14px', background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          AutoGastos & Control de Movilidad
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', maxWidth: '680px', margin: '0 auto 28px', lineHeight: '1.6' }}>
          La herramienta financiera definitiva para choferes multiapp (Uber, Cabify, DiDi, Rappi), dueños de autos y vehículos alquilados con alertas automáticas por Telegram.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <Link href="/login" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '1rem' }}>
            <span>Ingresar a la Plataforma</span>
            <ArrowRight size={18} />
          </Link>
          <a href="#features" className="btn btn-secondary" style={{ padding: '12px 24px', fontSize: '1rem' }}>
            <span>Ver Módulos</span>
          </a>
        </div>
      </div>

      {/* Grid de Features Clave */}
      <div id="features" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '48px' }}>
        {/* Card 1 */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.12)', borderRadius: 'var(--radius-md)', color: '#34d399' }}>
              <Smartphone size={24} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Jornadas Multiapp</h3>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
            Mide Uber, Cabify, DiDi y Rappi en una sola jornada. Control exacto de <strong>horas y minutos (ej. 5h 47m)</strong>, combustible y odómetro.
          </p>
        </div>

        {/* Card 2 */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div style={{ padding: '10px', background: 'rgba(6, 182, 212, 0.12)', borderRadius: 'var(--radius-md)', color: '#22d3ee' }}>
              <Wrench size={24} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Mantenimiento Dual & GNC</h3>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
            VTV, Oblea GNC, Patente, Prueba Hidráulica 5 años y services por kilometraje con fondo de provisión según desgaste.
          </p>
        </div>

        {/* Card 3 */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div style={{ padding: '10px', background: 'rgba(139, 92, 246, 0.12)', borderRadius: 'var(--radius-md)', color: '#c084fc' }}>
              <Receipt size={24} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Gastos y Proyección de Cuotas</h3>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
            Proyección a 12 meses de tarjetas de crédito y división de gastos compartidos del hogar.
          </p>
        </div>

        {/* Card 4 */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div style={{ padding: '10px', background: 'rgba(59, 130, 246, 0.12)', borderRadius: 'var(--radius-md)', color: '#60a5fa' }}>
              <Send size={24} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Bot de Telegram Inteligente</h3>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
            Alertas personalizadas por usuario antes del cierre del mes con el resumen de vencimientos y metas a cubrir.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
        <span>AutoGastos SaaS • Desplegado en Cloudflare & PostgreSQL Serverless</span>
      </div>
    </div>
  );
}
