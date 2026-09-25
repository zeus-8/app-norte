'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Car, 
  Receipt, 
  Wrench, 
  LayoutDashboard, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Gauge, 
  LogOut,
  Shield,
  Smartphone,
  Settings
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function Navbar({
  user,
  currentMonth,
  setCurrentMonth,
  currentOdometer,
  onOpenDailyModal,
  onOpenExpenseModal,
  onOpenOdometerModal
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [yearStr, monthStr] = (currentMonth || new Date().toISOString().slice(0, 7)).split('-');
  const monthIdx = parseInt(monthStr, 10) - 1;
  const year = parseInt(yearStr, 10);

  const handlePrevMonth = () => {
    let prevM = monthIdx - 1;
    let prevY = year;
    if (prevM < 0) {
      prevM = 11;
      prevY--;
    }
    const m = String(prevM + 1).padStart(2, '0');
    setCurrentMonth(`${prevY}-${m}`);
  };

  const handleNextMonth = () => {
    let nextM = monthIdx + 1;
    let nextY = year;
    if (nextM > 11) {
      nextM = 0;
      nextY++;
    }
    const m = String(nextM + 1).padStart(2, '0');
    setCurrentMonth(`${nextY}-${m}`);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="card" style={{ padding: '12px 18px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        
        {/* Logo & Marca */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <Car size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>AutoGastos</span>
              <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>SaaS 2.0</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              {user?.name || 'Chofer'} • {user?.driverType === 'owner' ? 'Auto Propio' : 'Auto Alquilado'}
            </div>
          </div>
        </div>

        {/* Selector Global de Mes / Año */}
        {setCurrentMonth && (
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '3px' }}>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={handlePrevMonth}
              style={{ padding: '4px 8px', border: 'none' }}
              title="Mes anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <div style={{ padding: '0 12px', fontSize: '0.85rem', fontWeight: 800, minWidth: 140, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Calendar size={14} className="text-blue" />
              <span>{MONTH_NAMES[monthIdx]} {year}</span>
            </div>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={handleNextMonth}
              style={{ padding: '4px 8px', border: 'none' }}
              title="Mes siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Acciones Rápidas & Usuario */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {onOpenOdometerModal && (user?.moduleVehicle || user?.moduleDriver || user?.role === 'admin') && (
            <button className="btn btn-secondary btn-sm font-mono" onClick={onOpenOdometerModal} title="Actualizar kilometraje">
              <Gauge size={14} className="text-cyan" />
              <span>{currentOdometer ? `${currentOdometer.toLocaleString()} km` : 'Odómetro'}</span>
            </button>
          )}

          {(user?.moduleDriver || user?.role === 'admin') && onOpenDailyModal && (
            <button className="btn btn-primary btn-sm" onClick={onOpenDailyModal}>
              <Plus size={14} />
              <span>+ Jornada</span>
            </button>
          )}

          {(user?.moduleExpenses || user?.role === 'admin') && onOpenExpenseModal && (
            <button className="btn btn-secondary btn-sm" onClick={onOpenExpenseModal}>
              <Plus size={14} />
              <span>+ Gasto</span>
            </button>
          )}

          <ThemeToggle />

          <button 
            onClick={handleLogout}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px 10px', color: '#f87171' }}
            title="Cerrar sesión"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Pestañas de Navegación según permisos del usuario */}
      <div style={{ display: 'flex', gap: 6, borderTop: '1px solid var(--border-color)', marginTop: 12, paddingTop: 10, overflowX: 'auto' }}>
        <Link 
          href="/dashboard" 
          className={`btn btn-sm ${pathname === '/dashboard' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <LayoutDashboard size={15} />
          <span>Dashboard</span>
        </Link>

        {(user?.moduleDriver || user?.role === 'admin') && (
          <Link 
            href="/driver" 
            className={`btn btn-sm ${pathname === '/driver' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Smartphone size={15} />
            <span>Jornadas Apps</span>
          </Link>
        )}

        {(user?.moduleExpenses || user?.role === 'admin') && (
          <Link 
            href="/expenses" 
            className={`btn btn-sm ${pathname === '/expenses' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Receipt size={15} />
            <span>Gastos y Cuotas</span>
          </Link>
        )}

        {(user?.moduleVehicle || user?.role === 'admin') && (
          <Link 
            href="/vehicle" 
            className={`btn btn-sm ${pathname === '/vehicle' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Wrench size={15} />
            <span>Mantenimiento & GNC</span>
          </Link>
        )}

        <Link 
          href="/settings" 
          className={`btn btn-sm ${pathname === '/settings' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ marginLeft: user?.role === 'admin' ? '0' : 'auto' }}
        >
          <Settings size={15} />
          <span>Configuración</span>
        </Link>

        {user?.role === 'admin' && (
          <Link 
            href="/admin" 
            className={`btn btn-sm ${pathname === '/admin' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ marginLeft: 'auto', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.3)' }}
          >
            <Shield size={15} />
            <span>Panel Admin</span>
          </Link>
        )}
      </div>
    </header>
  );
}
