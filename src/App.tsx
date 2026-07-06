import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { DashboardLayout } from './layouts/DashboardLayout';

// Auth Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { RecoverPassword } from './pages/RecoverPassword';

// ERP Dashboard Pages
import { Dashboard } from './pages/Dashboard';
import { Inventarios } from './pages/Inventarios';
import { Ventas } from './pages/Ventas';
import { Compras } from './pages/Compras';
import { Clientes } from './pages/Clientes';
import { Proveedores } from './pages/Proveedores';
import { Finanzas } from './pages/Finanzas';
import { Reportes } from './pages/Reportes';
import { Configuracion } from './pages/Configuracion';

export const App: React.FC = () => {
  const { user, loading } = useAuth();
  
  // Custom router state
  const [currentView, setCurrentView] = useState<'login' | 'register' | 'recover'>('login');
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-sans)',
          backgroundColor: 'var(--bg-primary)'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              border: '3px solid var(--border-primary)',
              borderTopColor: 'var(--brand-primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}
          />
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Cargando Kora ERP...</span>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Router Guard - if NOT logged in, show auth screens
  if (!user) {
    switch (currentView) {
      case 'register':
        return <Register onNavigate={setCurrentView} />;
      case 'recover':
        return <RecoverPassword onNavigate={setCurrentView} />;
      default:
        return <Login onNavigate={setCurrentView} />;
    }
  }

  // Router Guard - if logged in, render the main shell
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'inventarios':
        return <Inventarios />;
      case 'ventas':
        return <Ventas />;
      case 'compras':
        return <Compras />;
      case 'clientes':
        return <Clientes />;
      case 'proveedores':
        return <Proveedores />;
      case 'finanzas':
        return <Finanzas />;
      case 'reportes':
        return <Reportes />;
      case 'configuracion':
        return <Configuracion />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <DashboardLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderTabContent()}
    </DashboardLayout>
  );
};
