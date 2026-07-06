import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  Building,
  PiggyBank,
  BarChart3,
  Settings,
  LogOut,
  Menu
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeTab,
  setActiveTab
}) => {
  const { user, company, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventarios', name: 'Inventarios', icon: Package },
    { id: 'compras', name: 'Compras', icon: ShoppingCart },
    { id: 'ventas', name: 'Ventas', icon: TrendingUp },
    { id: 'clientes', name: 'Clientes', icon: Users },
    { id: 'proveedores', name: 'Proveedores', icon: Building },
    { id: 'finanzas', name: 'Finanzas', icon: PiggyBank },
    { id: 'reportes', name: 'Reportes', icon: BarChart3 },
    { id: 'configuracion', name: 'Configuración', icon: Settings }
  ];

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        fontFamily: 'var(--font-sans)'
      }}
    >
      {/* Sidebar - Desktop */}
      <aside
        style={{
          width: '260px',
          borderRight: '1px solid var(--border-primary)',
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 100
        }}
        className="desktop-sidebar"
      >
        {/* Logo/Brand */}
        <div
          style={{
            padding: '24px',
            borderBottom: '1px solid var(--border-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--brand-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '18px'
            }}
          >
            K
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '-0.02em' }}>Kora ERP</span>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>SaaS Multi-tenant</span>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: isActive ? 'var(--bg-secondary)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: isActive ? 500 : 400,
                  fontSize: '14px',
                  textAlign: 'left',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <Icon size={18} style={{ color: isActive ? 'var(--brand-primary)' : 'var(--text-tertiary)' }} />
                {item.name}
              </button>
            );
          })}
        </nav>

        {/* User profile footer */}
        <div
          style={{
            padding: '16px',
            borderTop: '1px solid var(--border-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '12px',
                flexShrink: 0
              }}
            >
              {user?.firstName[0]}
              {user?.lastName[0]}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {user?.firstName} {user?.lastName}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {company?.name}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-tertiary)',
              padding: '4px',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Panel Content Container */}
      <div style={{ flex: 1, marginLeft: '260px', display: 'flex', flexDirection: 'column' }} className="main-content-area">
        {/* Top Navbar */}
        <header
          style={{
            height: '64px',
            borderBottom: '1px solid var(--border-primary)',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            position: 'sticky',
            top: 0,
            zIndex: 90
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'none'
              }}
              className="mobile-menu-trigger"
            >
              <Menu size={20} />
            </button>
            <h2 style={{ fontSize: '16px', fontWeight: 600, textTransform: 'capitalize' }}>
              {activeTab}
            </h2>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Moneda activa: <strong>{company?.currency}</strong> | IVA: <strong>{company?.taxRate}%</strong>
          </div>
        </header>

        {/* Dynamic Page Component Render */}
        <main style={{ padding: '32px', flex: 1 }} className="page-container-view animate-fade-in">
          {children}
        </main>
      </div>

      {/* Mobile Drawer Navigation overlay */}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
            zIndex: 999
          }}
          onClick={() => setMobileOpen(false)}
        >
          <div
            style={{
              width: '260px',
              height: '100%',
              backgroundColor: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-lg)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Logo */}
            <div
              style={{
                padding: '24px',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--brand-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '18px'
                }}
              >
                K
              </div>
              <span style={{ fontWeight: 700, fontSize: '16px' }}>Kora ERP</span>
            </div>
            <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: isActive ? 'var(--bg-secondary)' : 'transparent',
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      textAlign: 'left'
                    }}
                  >
                    <Icon size={18} />
                    {item.name}
                  </button>
                );
              })}
            </nav>
            <div style={{ padding: '16px', borderTop: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px' }}>{user?.firstName}</span>
              <button onClick={logout} style={{ background: 'transparent', border: 'none' }}><LogOut size={16} /></button>
            </div>
          </div>
        </div>
      )}

      {/* Media query styling overrides injected dynamically */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar {
            display: none !important;
          }
          .main-content-area {
            margin-left: 0 !important;
          }
          .mobile-menu-trigger {
            display: block !important;
          }
          .page-container-view {
            padding: 16px !important;
          }
        }
      `}</style>
    </div>
  );
};
