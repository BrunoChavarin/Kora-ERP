import React, { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { Charts } from '../components/Charts';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/db';
import { Product, Sale, Purchase, Transaction, Customer, Supplier } from '../types';
import { DollarSign, ArrowUpRight, ArrowDownRight, Package, AlertTriangle, Users } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { company } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customersCount, setCustomersCount] = useState(0);
  const [suppliersCount, setSuppliersCount] = useState(0);

  useEffect(() => {
    setSales(db.get('sales'));
    setPurchases(db.get('purchases'));
    setProducts(db.get('products'));
    setTransactions(db.get('transactions'));
    setCustomersCount(db.get('customers').length);
    setSuppliersCount(db.get('suppliers').length);
  }, []);

  // Compute stats
  const totalSales = sales.reduce((acc, s) => acc + s.total, 0);
  const totalPurchases = purchases.reduce((acc, p) => acc + p.total, 0);
  
  const incomeTx = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const expenseTx = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  
  const utility = incomeTx - expenseTx;
  const lowStockProducts = products.filter(p => p.stock <= p.minStock);

  // Accounts Receivables and Payables mock metrics
  const receivables = sales.filter(s => s.status === 'pending').reduce((acc, s) => acc + s.total, 0);
  const payables = purchases.filter(p => p.status === 'pending').reduce((acc, p) => acc + p.total, 0);

  // Chart data formatting (Sales by month mockup)
  const chartData = [
    { name: 'Ene', Ventas: 24000 },
    { name: 'Feb', Ventas: 32000 },
    { name: 'Mar', Ventas: 18000 },
    { name: 'Abr', Ventas: 45000 },
    { name: 'May', Ventas: 38000 },
    { name: 'Jun', Ventas: totalSales > 0 ? totalSales : 52000 }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Overview Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px'
        }}
      >
        <Card title="Ventas del Mes" subtitle="Total facturado o vendido">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700 }}>
              ${totalSales.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
            <div style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', fontSize: '12px' }}>
              <ArrowUpRight size={16} /> +12.5%
            </div>
          </div>
        </Card>

        <Card title="Compras / Costos" subtitle="Inversión en mercancía">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700 }}>
              ${totalPurchases.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
            <div style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', fontSize: '12px' }}>
              Mensual
            </div>
          </div>
        </Card>

        <Card title="Flujo de Caja (Utilidad)" subtitle="Ingresos menos egresos">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: utility >= 0 ? 'var(--text-primary)' : 'var(--danger)' }}>
              ${utility.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: utility >= 0 ? 'var(--success-light)' : 'var(--danger-light)',
                color: utility >= 0 ? 'var(--success)' : 'var(--danger)'
              }}
            >
              {utility >= 0 ? 'Positivo' : 'Déficit'}
            </span>
          </div>
        </Card>

        <Card title="Productos en Catálogo" subtitle="Alertas de stock bajo">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700 }}>{products.length}</span>
            {lowStockProducts.length > 0 && (
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--warning)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 500
                }}
              >
                <AlertTriangle size={14} /> {lowStockProducts.length} críticos
              </span>
            )}
          </div>
        </Card>
      </div>

      {/* Credit & Contacts Secondary Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px'
        }}
      >
        <Card title="Cuentas por Cobrar" subtitle="Saldos pendientes de clientes">
          <span style={{ fontSize: '20px', fontWeight: 600, color: 'var(--brand-primary)' }}>
            ${receivables.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
        </Card>
        <Card title="Cuentas por Pagar" subtitle="Saldos pendientes a proveedores">
          <span style={{ fontSize: '20px', fontWeight: 600, color: 'var(--warning)' }}>
            ${payables.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
        </Card>
        <Card title="Directorio" subtitle="Clientes y Proveedores registrados">
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '4px' }}>
            <div>
              <span style={{ fontSize: '18px', fontWeight: 600 }}>{customersCount}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginLeft: '4px' }}>Clientes</span>
            </div>
            <div style={{ borderLeft: '1px solid var(--border-primary)', height: '20px' }} />
            <div>
              <span style={{ fontSize: '18px', fontWeight: 600 }}>{suppliersCount}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginLeft: '4px' }}>Proveedores</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Charts & Activity Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '24px',
          alignItems: 'start'
        }}
        className="dashboard-columns-grid"
      >
        {/* Sales Chart Card */}
        <Card title="Desempeño Mensual de Ventas" subtitle="Gráfico de área acumulada del año fiscal">
          <div style={{ marginTop: '16px' }}>
            <Charts type="area" data={chartData} xKey="name" yKey="Ventas" color="var(--brand-primary)" />
          </div>
        </Card>

        {/* Recent Activity Card */}
        <Card title="Actividad Reciente" subtitle="Últimas transacciones financieras">
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              marginTop: '16px',
              maxHeight: '300px',
              overflowY: 'auto'
            }}
          >
            {transactions.slice(0, 5).map((tx) => (
              <div
                key={tx.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: '1px solid var(--border-primary)'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {tx.description}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    {tx.category} • {tx.date}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: tx.type === 'income' ? 'var(--success)' : 'var(--danger)'
                  }}
                >
                  {tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString('es-MX')}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <style>{`
        @media (max-width: 992px) {
          .dashboard-columns-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
