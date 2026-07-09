import React, { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { useAuth } from '../contexts/AuthContext';
import { productsService } from '../services/products.service';
import { salesService } from '../services/sales.service';
import { purchasesService } from '../services/purchases.service';
import { Product, Sale, PurchaseCostHistory, CustomerPriceHistory } from '../types';
import { TrendingUp, DollarSign, Users, Package } from 'lucide-react';

export const AnalisisCostos: React.FC = () => {
  const { company } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [costHistories, setCostHistories] = useState<PurchaseCostHistory[]>([]);
  const [priceHistories, setPriceHistories] = useState<CustomerPriceHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const prList = await productsService.getAll();
      setProducts(prList);
      const sList = await salesService.getAll();
      setSales(sList);
      const chList = await purchasesService.getAllCostHistory();
      setCostHistories(chList);
      const phList = await salesService.getAllCustomerPriceHistory();
      setPriceHistories(phList);
    } catch (err) {
      console.error('Error al cargar datos de análisis de costos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Helpers for calculations
  const getProductStats = (prodId: string) => {
    const prod = products.find(p => p.id === prodId);
    const history = costHistories.filter(h => h.productId === prodId);
    
    const lastCost = history.length > 0 ? history[0].cost : (prod?.cost || 0);
    const minCost = history.length > 0 ? Math.min(...history.map(h => h.cost)) : (prod?.cost || 0);
    const maxCost = history.length > 0 ? Math.max(...history.map(h => h.cost)) : (prod?.cost || 0);
    
    // Average cost
    let avgCost = prod?.cost || 0;
    if (history.length > 0) {
      const totalQty = history.reduce((sum, h) => sum + h.quantity, 0);
      const totalCost = history.reduce((sum, h) => sum + (h.cost * h.quantity), 0);
      avgCost = totalQty > 0 ? totalCost / totalQty : avgCost;
    }

    // Cost variation between last 2 purchases
    let pctVariation = 0;
    if (history.length >= 2) {
      const latest = history[0].cost;
      const prev = history[1].cost;
      if (prev > 0) {
        pctVariation = ((latest - prev) / prev) * 100;
      }
    }

    return {
      name: prod?.name || 'Producto Desconocido',
      sku: prod?.sku || 'N/A',
      lastCost,
      minCost,
      maxCost,
      avgCost,
      pctVariation
    };
  };

  const getProductAverageCost = (prodId: string) => {
    const history = costHistories.filter(h => h.productId === prodId);
    if (history.length === 0) {
      const p = products.find(prod => prod.id === prodId);
      return p ? p.cost : 0;
    }
    const totalQty = history.reduce((sum, h) => sum + h.quantity, 0);
    const totalCost = history.reduce((sum, h) => sum + (h.cost * h.quantity), 0);
    return totalQty > 0 ? totalCost / totalQty : 0;
  };

  // Margins
  // 1. Sale Gross Margins
  const salesMargins = sales.map(s => {
    const estimatedCost = s.items.reduce((sum, item) => {
      const avgCost = getProductAverageCost(item.productId);
      return sum + (item.quantity * avgCost);
    }, 0);
    const grossMargin = s.subtotal - estimatedCost;
    const marginPct = s.subtotal > 0 ? (grossMargin / s.subtotal) * 100 : 0;
    return {
      id: s.id,
      customerName: s.customerName,
      date: s.createdAt.split('T')[0],
      total: s.total,
      subtotal: s.subtotal,
      estimatedCost,
      grossMargin,
      marginPct
    };
  });

  // 2. Margin by Product
  const productMargins = products.map(p => {
    const productSales = sales.flatMap(s => s.items.filter(item => item.productId === p.id).map(item => ({
      ...item,
      date: s.createdAt
    })));
    
    const qtySold = productSales.reduce((sum, item) => sum + item.quantity, 0);
    const amountSold = productSales.reduce((sum, item) => sum + item.subtotal, 0);
    
    const avgCost = getProductAverageCost(p.id);
    const totalCost = qtySold * avgCost;
    const grossMargin = amountSold - totalCost;
    const marginPct = amountSold > 0 ? (grossMargin / amountSold) * 100 : 0;
    const avgSellingPrice = qtySold > 0 ? amountSold / qtySold : 0;

    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      qtySold,
      amountSold,
      avgCost,
      totalCost,
      grossMargin,
      marginPct,
      avgSellingPrice
    };
  }).filter(p => p.qtySold > 0);

  // 3. Margin by Customer
  const customerMarginsMap: Record<string, { customerName: string; totalSales: number; estimatedCost: number }> = {};
  sales.forEach(s => {
    const customerKey = s.customerId || 'generic';
    if (!customerMarginsMap[customerKey]) {
      customerMarginsMap[customerKey] = {
        customerName: s.customerName,
        totalSales: 0,
        estimatedCost: 0
      };
    }
    
    const estimatedCost = s.items.reduce((sum, item) => {
      const avgCost = getProductAverageCost(item.productId);
      return sum + (item.quantity * avgCost);
    }, 0);

    customerMarginsMap[customerKey].totalSales += s.subtotal;
    customerMarginsMap[customerKey].estimatedCost += estimatedCost;
  });

  const customerMargins = Object.keys(customerMarginsMap).map(key => {
    const data = customerMarginsMap[key];
    const grossMargin = data.totalSales - data.estimatedCost;
    const marginPct = data.totalSales > 0 ? (grossMargin / data.totalSales) * 100 : 0;
    return {
      customerId: key,
      customerName: data.customerName,
      totalSales: data.totalSales,
      estimatedCost: data.estimatedCost,
      grossMargin,
      marginPct
    };
  }).filter(c => c.totalSales > 0);

  // Global Margins
  const globalTotalSalesSub = sales.reduce((acc, s) => acc + s.subtotal, 0);
  const globalTotalCost = salesMargins.reduce((acc, s) => acc + s.estimatedCost, 0);
  const globalMargin = globalTotalSalesSub - globalTotalCost;
  const globalMarginPct = globalTotalSalesSub > 0 ? (globalMargin / globalTotalSalesSub) * 100 : 0;

  // Product cost details for data table
  const productCostRows = products.map(p => getProductStats(p.id));

  // Table Columns
  const costColumns = [
    { header: 'Producto', accessor: (p: any) => p.name },
    { header: 'SKU', accessor: (p: any) => p.sku },
    { header: 'Costo Promedio', accessor: (p: any) => `$${p.avgCost.toFixed(2)}` },
    { header: 'Último Costo', accessor: (p: any) => `$${p.lastCost.toFixed(2)}` },
    { header: 'Costo Mínimo', accessor: (p: any) => `$${p.minCost.toFixed(2)}` },
    { header: 'Costo Máximo', accessor: (p: any) => `$${p.maxCost.toFixed(2)}` },
    { header: 'Variación', accessor: (p: any) => (
      <span style={{ color: p.pctVariation > 0 ? 'var(--danger)' : p.pctVariation < 0 ? 'var(--success)' : 'var(--text-secondary)' }}>
        {p.pctVariation > 0 ? `▲ +${p.pctVariation.toFixed(1)}%` : p.pctVariation < 0 ? `▼ ${p.pctVariation.toFixed(1)}%` : '0.0%'}
      </span>
    ) }
  ];

  const productMarginColumns = [
    { header: 'Producto', accessor: (p: any) => p.name },
    { header: 'SKU', accessor: (p: any) => p.sku },
    { header: 'Cant. Vendida', accessor: (p: any) => `${p.qtySold} pzas` },
    { header: 'P. Prom. Venta', accessor: (p: any) => `$${p.avgSellingPrice.toFixed(2)}` },
    { header: 'Costo Prom.', accessor: (p: any) => `$${p.avgCost.toFixed(2)}` },
    { header: 'Margen Bruto', accessor: (p: any) => `$${p.grossMargin.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
    { header: 'Margen %', accessor: (p: any) => (
      <span style={{ fontWeight: 600, color: p.marginPct > 15 ? 'var(--success)' : 'var(--danger)' }}>
        {p.marginPct.toFixed(1)}%
      </span>
    ) }
  ];

  const customerMarginColumns = [
    { header: 'Cliente', accessor: (c: any) => c.customerName },
    { header: 'Total Ventas (Sin IVA)', accessor: (c: any) => `$${c.totalSales.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
    { header: 'Costo Estimado', accessor: (c: any) => `$${c.estimatedCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
    { header: 'Margen Bruto', accessor: (c: any) => `$${c.grossMargin.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
    { header: 'Margen %', accessor: (c: any) => (
      <span style={{ fontWeight: 600, color: c.marginPct > 15 ? 'var(--success)' : 'var(--danger)' }}>
        {c.marginPct.toFixed(1)}%
      </span>
    ) }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <span>Cargando análisis de costos...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Análisis de Costos y Márgenes</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Trazabilidad de márgenes de utilidad, variaciones de costo en compras y precios de venta
        </p>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <Card title="Margen Bruto Global" subtitle="Ventas totales - Costos promedio">
          <div style={{ marginTop: '8px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, display: 'block' }}>
              ${globalMargin.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--success)', fontWeight: 600 }}>
              <TrendingUp size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              {globalMarginPct.toFixed(1)}% de rentabilidad global
            </span>
          </div>
        </Card>

        <Card title="Ventas Totales (Subtotal)" subtitle="Ingresos brutos declarados">
          <div style={{ marginTop: '8px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, display: 'block' }}>
              ${globalTotalSalesSub.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              <DollarSign size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              Moneda base: {company?.currency || 'MXN'}
            </span>
          </div>
        </Card>

        <Card title="Costo de Mercancía Vendida (COGS)" subtitle="Costo estimado según historial">
          <div style={{ marginTop: '8px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, display: 'block' }}>
              ${globalTotalCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              <Package size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              Basado en órdenes de compra recibidas
            </span>
          </div>
        </Card>
      </div>

      {/* Main Analysis Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ padding: '20px', backgroundColor: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <TrendingUp size={18} style={{ color: 'var(--brand-primary)' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Historial de Costos de Compra & Variaciones</h3>
          </div>
          <DataTable data={productCostRows} columns={costColumns} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }} className="margins-split-grid">
          <div style={{ padding: '20px', backgroundColor: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Package size={18} style={{ color: 'var(--brand-primary)' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Margen y Utilidad por Producto</h3>
            </div>
            <DataTable data={productMargins} columns={productMarginColumns} />
          </div>

          <div style={{ padding: '20px', backgroundColor: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Users size={18} style={{ color: 'var(--brand-primary)' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Margen y Utilidad por Cliente</h3>
            </div>
            <DataTable data={customerMargins} columns={customerMarginColumns} />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 992px) {
          .margins-split-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
export default AnalisisCostos;
