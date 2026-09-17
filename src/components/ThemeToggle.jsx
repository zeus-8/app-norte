'use client';

import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const saved = localStorage.getItem('theme_preference') || 'dark';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme_preference', next);
    document.documentElement.setAttribute('data-theme', next);

    // Actualizar preferencia en el servidor (asíncrono)
    fetch('/api/user/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themePreference: next }),
    }).catch(() => {});
  };

  return (
    <button
      onClick={toggleTheme}
      className="btn btn-secondary"
      style={{ padding: '6px 10px', borderRadius: 'var(--radius-md)' }}
      title={`Cambiar a modo ${theme === 'dark' ? 'Claro' : 'Oscuro'}`}
    >
      {theme === 'dark' ? <Sun size={16} className="text-amber" /> : <Moon size={16} />}
    </button>
  );
}
