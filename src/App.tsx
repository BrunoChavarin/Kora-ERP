import React, { useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';

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
import { DashboardLayout } from './layouts/DashboardLayout';

// Route Guard to verify auth and active company slug matching
const PrivateRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, company, loading } = useAuth();
  const { companySlug } = useParams<{ companySlug: string }>();

  if (loading) {
    return <LoadingIndicator />;
  }

  // If not logged in, redirect to login page
  if (!user || !company) {
    return <Navigate to="/login" replace />;
  }

  // If user belongs to another company, redirect to their own correct slug
  if (companySlug && company.slug !== companySlug) {
    return <Navigate to={`/${company.slug}/dashboard`} replace />;
  }

  return <>{children}</>;
};

// Simple loading indicator
const LoadingIndicator: React.FC = () => (
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

// Redirect component for home route "/"
const HomeRedirect: React.FC = () => {
  const { user, company, loading } = useAuth();

  if (loading) return <LoadingIndicator />;

  if (user && company) {
    return <Navigate to={`/${company.slug}/dashboard`} replace />;
  }

  return <Navigate to="/login" replace />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/recover" element={<RecoverPassword />} />

        {/* Home route redirection */}
        <Route path="/" element={<HomeRedirect />} />

        {/* Private Multi-Tenant Routes */}
        <Route
          path="/:companySlug/dashboard"
          element={
            <PrivateRouteGuard>
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            </PrivateRouteGuard>
          }
        />
        <Route
          path="/:companySlug/inventarios"
          element={
            <PrivateRouteGuard>
              <DashboardLayout>
                <Inventarios />
              </DashboardLayout>
            </PrivateRouteGuard>
          }
        />
        <Route
          path="/:companySlug/ventas"
          element={
            <PrivateRouteGuard>
              <DashboardLayout>
                <Ventas />
              </DashboardLayout>
            </PrivateRouteGuard>
          }
        />
        <Route
          path="/:companySlug/compras"
          element={
            <PrivateRouteGuard>
              <DashboardLayout>
                <Compras />
              </DashboardLayout>
            </PrivateRouteGuard>
          }
        />
        <Route
          path="/:companySlug/clientes"
          element={
            <PrivateRouteGuard>
              <DashboardLayout>
                <Clientes />
              </DashboardLayout>
            </PrivateRouteGuard>
          }
        />
        <Route
          path="/:companySlug/proveedores"
          element={
            <PrivateRouteGuard>
              <DashboardLayout>
                <Proveedores />
              </DashboardLayout>
            </PrivateRouteGuard>
          }
        />
        <Route
          path="/:companySlug/finanzas"
          element={
            <PrivateRouteGuard>
              <DashboardLayout>
                <Finanzas />
              </DashboardLayout>
            </PrivateRouteGuard>
          }
        />
        <Route
          path="/:companySlug/reportes"
          element={
            <PrivateRouteGuard>
              <DashboardLayout>
                <Reportes />
              </DashboardLayout>
            </PrivateRouteGuard>
          }
        />
        <Route
          path="/:companySlug/configuracion"
          element={
            <PrivateRouteGuard>
              <DashboardLayout>
                <Configuracion />
              </DashboardLayout>
            </PrivateRouteGuard>
          }
        />

        {/* Fallback to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
