import './globals.css';

export const metadata = {
  title: 'AutoGastos SaaS — Gestión Integral de Choferes, Mantenimiento & Cuotas',
  description: 'Plataforma inteligente para control de jornadas multiapp (Uber, Cabify, DiDi), mantenimiento vehicular dual y compras en cuotas.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
