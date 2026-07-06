import React, { useState } from 'react';
import { Card } from '../components/Card';
import { Charts } from '../components/Charts';
import { Button } from '../components/Button';
import { DatePicker } from '../components/DatePicker';
import { useToast } from '../contexts/ToastContext';
import { db } from '../services/db';
import { ArrowUpRight, BarChart3, TrendingUp, DollarSign } from 'lucide-react';

export const Reportes: React.FC = () => {
  const { showToast } = useToast();
  const [startDate, setStartDate] = useState('2026-06-01');
  const [endDate, setEndDate] = useState('2026-06-30');

  // Load mock aggregates
  const products = db.get('products') || [];
  const sales = db.get('sales') || [];
  const transactions = db.get('transactions') || [];

  const totalSalesVal = sales.reduce((a: number, s: any) => a + s.total, 0);
  const totalMargin = sales.reduce((a: number, s: any) => a + (s.total - s.subtotal), 0); // tax/profit margin mockup

  // Top products mockup dataset
  const topProducts = [
    { name: 'MacBook Pro M3', Ventas: 34999 },
    { name: 'Monitor Dell 27"', Ventas: 9800 },
    { name: 'Teclado Keychron K2', Ventas: 4398 }
  ];

  const handleFilter = () => {
    showToast('success', 'Filtro aplicado', `Reporte generado del ${startDate} al ${endDate}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title & Filter bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Reportes & Analíticas</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Visualiza la salud de tu negocio, flujo operativo e inventarios</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <DatePicker label="Desde" value={startDate} onChange={setStartDate} />
          <DatePicker label="Hasta" value={endDate} onChange={setEndDate} />
          <Button onClick={handleFilter}>Generar Reporte</Button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <Card title="Ingresos Generados" subtitle="Total facturado en periodo">
          <span style={{ fontSize: '24px', fontWeight: 700 }}>
            ${totalSalesVal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
        </Card>
        <Card title="Margen Bruto promedio" subtitle="Rendimiento neto de ventas">
          <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--success)' }}>
            ${totalMargin.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
        </Card>
        <Card title="Rotación de Inventarios" subtitle="Existencias valorizadas">
          <span style={{ fontSize: '24px', fontWeight: 700 }}>
            ${products.reduce((a: number, p: any) => a + (p.stock * p.cost), 0).toLocaleString('es-MX')}
          </span>
        </Card>
      </div>

      {/* Chart Rows */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }} className="reports-charts-grid">
        <Card title="Productos Más Vendidos" subtitle="Valor facturado en ventas por producto">
          <div style={{ marginTop: '16px' }}>
            <Charts type="bar" data={topProducts} xKey="name" yKey="Ventas" color="var(--brand-primary)" />
          </div>
        </Card>
        <Card title="Resumen Margen de Utilidad" subtitle="Historial mensual de utilidad bruta">
          <div style={{ marginTop: '16px' }}>
            <Charts type="area" data={[{ name: 'Ene', Utilidad: 12000 }, { name: 'Feb', Utilidad: 15000 }, { name: 'Mar', Utilidad: 9000 }, { name: 'Abr', Utilidad: 22000 }]} xKey="name" yKey="Utilidad" color="var(--success)" />
          </div>
        </Card>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .reports-charts-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
