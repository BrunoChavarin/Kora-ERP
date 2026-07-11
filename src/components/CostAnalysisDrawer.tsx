import React, { useState, useEffect } from 'react';
import { Portal } from './Portal';
import { Sale, PurchaseCostHistory } from '../types';
import { X, Printer, FileText, Share2, Mail, DollarSign, Percent, TrendingUp, User, Calendar } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { purchasesService } from '../services/purchases.service';
import { productsService } from '../services/products.service';

interface CostAnalysisDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
}

interface ProductCostInfo {
  unitCost: number;
  supplierName: string;
  date: string;
  hasHistory: boolean;
}

export const CostAnalysisDrawer: React.FC<CostAnalysisDrawerProps> = ({
  isOpen,
  onClose,
  sale
}) => {
  const { showToast } = useToast();
  const { company } = useAuth();
  const [commissionType, setCommissionType] = useState<'percentage' | 'fixed'>('percentage');
  const [commissionValue, setCommissionValue] = useState<number>(5);

  // Cost calculation strategies prepared for the future
  // currently we use 'latest_purchase_cost'
  const [costStrategy, setCostStrategy] = useState<'latest_purchase_cost' | 'weighted_average' | 'fifo' | 'specific'>('latest_purchase_cost');

  const [productCosts, setProductCosts] = useState<{ [productId: string]: ProductCostInfo }>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen || !sale) return;

    const loadInventoryCosts = async () => {
      setLoading(true);
      const costsMap: { [productId: string]: ProductCostInfo } = {};
      
      try {
        const allProducts = await productsService.getAll();

        await Promise.all(
          sale.items.map(async (item) => {
            const productKey = item.productId || item.productName;
            
            // Logic to fetch cost history from Inventories module (purchase_costs_history table)
            let history: PurchaseCostHistory[] = [];
            if (item.productId) {
              try {
                history = await purchasesService.getCostHistory(item.productId);
              } catch (e) {
                console.error('Error fetching cost history for product:', item.productId, e);
              }
            }
            
            if (history && history.length > 0) {
              // Latest registered cost (strategy: latest_purchase_cost)
              // Ready for future strategies like weighted_average or fifo:
              let costToUse = 0;
              
              if (costStrategy === 'latest_purchase_cost') {
                costToUse = history[0].cost;
              } else if (costStrategy === 'weighted_average') {
                // FUTURE HOOK: Weighted average calculation
                const totalQty = history.reduce((sum, h) => sum + h.quantity, 0);
                const totalVal = history.reduce((sum, h) => sum + (h.cost * h.quantity), 0);
                costToUse = totalQty > 0 ? totalVal / totalQty : history[0].cost;
              } else {
                costToUse = history[0].cost;
              }

              costsMap[productKey] = {
                unitCost: costToUse,
                supplierName: history[0].supplierName,
                date: history[0].createdAt,
                hasHistory: true
              };
            } else {
              // Fallback to current cost in the products table of Inventories (matching by ID or Name)
              const matchingProd = allProducts.find(p => 
                (item.productId && p.id === item.productId) || 
                p.name.trim().toLowerCase() === item.productName.trim().toLowerCase()
              );
              
              if (matchingProd) {
                costsMap[productKey] = {
                  unitCost: matchingProd.cost || 0,
                  supplierName: 'Inventario (Costo Base)',
                  date: matchingProd.createdAt || new Date().toISOString(),
                  hasHistory: true
                };
              } else {
                costsMap[productKey] = {
                  unitCost: 0,
                  supplierName: '',
                  date: '',
                  hasHistory: false
                };
              }
            }
          })
        );
        setProductCosts(costsMap);
      } catch (err) {
        console.error('Error loading inventory costs:', err);
      } finally {
        setLoading(false);
      }
    };

    loadInventoryCosts();
  }, [isOpen, sale, costStrategy]);

  if (!isOpen || !sale) return null;

  // Formatting date helper
  const formatDateToSpanish = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = date.getDate();
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    return `${day} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
  };

  // Calculations for products
  let hasMissingCosts = false;
  
  const itemsAnalysis = sale.items.map(item => {
    const productKey = item.productId || item.productName;
    const costInfo = productCosts[productKey];
    const hasHistory = costInfo?.hasHistory || false;
    
    if (!hasHistory) {
      hasMissingCosts = true;
    }

    const unitCost = hasHistory ? (costInfo?.unitCost || 0) : 0;
    const totalCost = unitCost * item.quantity;
    const unitPrice = item.price;
    const totalPrice = item.subtotal;
    const profit = totalPrice - totalCost;
    const marginPercent = totalPrice > 0 ? (profit / totalPrice) * 100 : 0;

    return {
      ...item,
      hasHistory,
      unitCost,
      totalCost,
      unitPrice,
      totalPrice,
      profit,
      marginPercent
    };
  });

  const totalSaleAmount = sale.subtotal;
  
  // Total cost amount is calculated only if all products have a registered cost
  const totalCostAmount = hasMissingCosts ? null : itemsAnalysis.reduce((sum, item) => sum + item.totalCost, 0);
  const grossUtility = totalCostAmount !== null ? (totalSaleAmount - totalCostAmount) : null;
  const grossMarginPercent = (totalSaleAmount > 0 && grossUtility !== null) ? (grossUtility / totalSaleAmount) * 100 : null;

  // Commission Calculations
  let generatedCommission = 0;
  if (commissionType === 'percentage') {
    generatedCommission = totalSaleAmount * (commissionValue / 100);
  } else {
    generatedCommission = commissionValue;
  }
  
  const finalUtility = grossUtility !== null ? (grossUtility - generatedCommission) : null;

  // Analysis by Group
  const groupsSummary: { [key: string]: { sales: number; cost: number | null; utility: number | null; hasMissing: boolean } } = {};
  itemsAnalysis.forEach(item => {
    const group = item.groupName || 'Sin Grupo';
    if (!groupsSummary[group]) {
      groupsSummary[group] = { sales: 0, cost: 0, utility: 0, hasMissing: false };
    }
    
    groupsSummary[group].sales += item.totalPrice;
    
    if (!item.hasHistory) {
      groupsSummary[group].hasMissing = true;
      groupsSummary[group].cost = null;
      groupsSummary[group].utility = null;
    } else {
      if (groupsSummary[group].cost !== null) {
        groupsSummary[group].cost! += item.totalCost;
      }
      if (groupsSummary[group].utility !== null) {
        groupsSummary[group].utility! += item.profit;
      }
    }
  });

  const handleExportPlaceholder = (format: string) => {
    showToast('info', 'Próximamente', `La exportación a ${format} estará disponible muy pronto.`);
  };

  return (
    <Portal>
      {/* Global CSS Inject to support print styling cleanly */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '24px 16px',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(8px)',
          overflowY: 'auto'
        }}
      >
        {/* Modal Wrapper */}
        <div
          style={{
            width: '100%',
            maxWidth: '900px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            marginBottom: '40px'
          }}
        >
          {/* Top Actions Bar (Hidden on Print) */}
          <div
            className="no-print"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              padding: '12px 20px',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8' }}>Análisis interno:</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => window.print()}
                  style={{
                    background: '#334155',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                    transition: 'background 0.2s'
                  }}
                >
                  <Printer size={15} />
                  <span>Imprimir</span>
                </button>
                <button
                  onClick={() => handleExportPlaceholder('PDF')}
                  style={{
                    background: '#334155',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                    transition: 'background 0.2s'
                  }}
                >
                  <FileText size={15} />
                  <span>PDF</span>
                </button>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#f8fafc'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
            >
              <X size={20} />
            </button>
          </div>

          {/* Clean Analysis Sheet (White Background) */}
          <div
            className="print-container"
            style={{
              backgroundColor: '#ffffff',
              color: '#1e293b',
              padding: '48px',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              lineHeight: 1.5,
              position: 'relative',
              boxSizing: 'border-box'
            }}
          >
            {/* Top Info section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>{company?.name || 'Kora ERP'}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Análisis de Rentabilidad Corporativa</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{sale.customerName}</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{formatDateToSpanish(sale.createdAt)}</div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#0284c7',
                    backgroundColor: '#f0f9ff',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    marginTop: '8px',
                    border: '1px solid #bae6fd',
                    display: 'inline-block'
                  }}
                >
                  {sale.folio || sale.id.substring(0, 8)}
                </div>
              </div>
            </div>

            {/* Document Title */}
            <div style={{ textAlign: 'center', marginBottom: '36px' }}>
              <h1
                style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                  color: '#0f172a',
                  margin: 0,
                  borderBottom: '2px solid #e2e8f0',
                  paddingBottom: '8px',
                  display: 'inline-block',
                  minWidth: '280px'
                }}
              >
                REVISIÓN DE COSTOS Y MARGEN
              </h1>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
                <span>Cargando historial de costos desde Inventarios...</span>
              </div>
            ) : (
              <>
                {/* General Info Metadata */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '32px' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Vendedor Responsable</span>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginTop: '4px' }}>{sale.userName || 'No Registrado'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Cliente de Facturación</span>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginTop: '4px' }}>{sale.customerName}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Fecha de Emisión</span>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginTop: '4px' }}>{formatDateToSpanish(sale.createdAt)}</div>
                  </div>
                </div>

                {/* Warning Alert if there are missing costs */}
                {hasMissingCosts && (
                  <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', color: '#b45309', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '24px', fontWeight: 500 }}>
                    ⚠️ Algunos productos vendidos no tienen historial de compra registrado en Inventarios. Para calcular la utilidad y el margen bruto global, todos los artículos deben tener un costo.
                  </div>
                )}

                {/* Products Table with margin breakdown */}
                <div style={{ marginBottom: '32px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', borderBottom: '2px solid #0f172a', paddingBottom: '4px' }}>
                    Desglose de Rentabilidad por Producto
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '750px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #94a3b8' }}>
                          <th style={{ padding: '8px', fontSize: '10px', fontWeight: 700, color: '#64748b' }}>GRUPO</th>
                          <th style={{ padding: '8px', fontSize: '10px', fontWeight: 700, color: '#64748b' }}>PRODUCTO</th>
                          <th style={{ padding: '8px', fontSize: '10px', fontWeight: 700, color: '#64748b', textAlign: 'center' }}>CANT</th>
                          <th style={{ padding: '8px', fontSize: '10px', fontWeight: 700, color: '#64748b', textAlign: 'right' }}>COSTO U.</th>
                          <th style={{ padding: '8px', fontSize: '10px', fontWeight: 700, color: '#64748b', textAlign: 'right' }}>COSTO TOT.</th>
                          <th style={{ padding: '8px', fontSize: '10px', fontWeight: 700, color: '#64748b', textAlign: 'right' }}>PRECIO V.</th>
                          <th style={{ padding: '8px', fontSize: '10px', fontWeight: 700, color: '#64748b', textAlign: 'right' }}>VENTA TOT.</th>
                          <th style={{ padding: '8px', fontSize: '10px', fontWeight: 700, color: '#64748b', textAlign: 'right' }}>GANANCIA</th>
                          <th style={{ padding: '8px', fontSize: '10px', fontWeight: 700, color: '#64748b', textAlign: 'right' }}>MARGEN</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itemsAnalysis.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 8px', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>{item.groupName || 'Sin Grupo'}</td>
                            <td style={{ padding: '10px 8px', fontSize: '12px', fontWeight: 500 }}>{item.productName}</td>
                            <td style={{ padding: '10px 8px', fontSize: '12px', textAlign: 'center' }}>{item.quantity}</td>
                            <td style={{ padding: '10px 8px', fontSize: '12px', textAlign: 'right', color: item.hasHistory ? '#475569' : '#dc2626', fontWeight: item.hasHistory ? 500 : 700 }}>
                              {item.hasHistory ? `$${item.unitCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : 'Sin costo registrado'}
                            </td>
                            <td style={{ padding: '10px 8px', fontSize: '12px', textAlign: 'right', color: '#475569' }}>
                              {item.hasHistory ? `$${item.totalCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : 'N/A'}
                            </td>
                            <td style={{ padding: '10px 8px', fontSize: '12px', textAlign: 'right', color: '#475569' }}>${item.unitPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                            <td style={{ padding: '10px 8px', fontSize: '12px', textAlign: 'right', fontWeight: 600 }}>${item.totalPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                            <td style={{ padding: '10px 8px', fontSize: '12px', textAlign: 'right', fontWeight: 600, color: !item.hasHistory ? '#94a3b8' : item.profit >= 0 ? '#16a34a' : '#dc2626' }}>
                              {item.hasHistory ? `$${item.profit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : 'N/A'}
                            </td>
                            <td style={{ padding: '10px 8px', fontSize: '12px', textAlign: 'right', fontWeight: 700, color: !item.hasHistory ? '#94a3b8' : item.profit >= 0 ? '#16a34a' : '#dc2626' }}>
                              {item.hasHistory ? `${item.marginPercent.toFixed(2)}%` : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Analysis by Category */}
                <div style={{ marginBottom: '32px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', borderBottom: '2px solid #0f172a', paddingBottom: '4px' }}>
                    Resumen por Categoría de Inventario
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                    {Object.keys(groupsSummary).map(groupName => {
                      const data = groupsSummary[groupName];
                      const margin = (data.sales > 0 && data.utility !== null) ? (data.utility / data.sales) * 100 : null;
                      return (
                        <div key={groupName} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                          <div style={{ fontSize: '11px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.025em' }}>{groupName}</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px', fontSize: '12px', color: '#475569' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Venta:</span> <strong>${data.sales.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Costo:</span> <strong>{data.cost !== null ? `$${data.cost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : 'N/A'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '4px', fontWeight: 600, color: data.utility === null ? '#94a3b8' : data.utility >= 0 ? '#16a34a' : '#dc2626' }}>
                              <span>Utilidad:</span>
                              <span>{data.utility !== null && margin !== null ? `$${data.utility.toLocaleString('es-MX', { minimumFractionDigits: 2 })} (${margin.toFixed(1)}%)` : 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Financial Summary & Commission Calculator Grid */}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '40px', flexWrap: 'wrap' }}>
                  
                  {/* Commission Panel */}
                  <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #0f172a', paddingBottom: '4px' }}>
                      Cálculo de Comisión de Venta
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }} className="no-print">
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Tipo de Comisión</label>
                        <select
                          value={commissionType}
                          onChange={(e) => setCommissionType(e.target.value as any)}
                          style={{
                            width: '100%',
                            padding: '8px 28px 8px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-primary)',
                            backgroundColor: '#ffffff',
                            backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23475569\' stroke-width=\'2.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 8px center',
                            backgroundSize: '12px',
                            outline: 'none',
                            fontSize: '13px',
                            cursor: 'pointer',
                            appearance: 'none',
                            WebkitAppearance: 'none',
                            MozAppearance: 'none'
                          }}
                        >
                          <option value="percentage">Porcentaje (%)</option>
                          <option value="fixed">Monto Fijo ($)</option>
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Valor</label>
                        <input
                          type="number"
                          value={commissionValue}
                          disabled={hasMissingCosts}
                          onChange={(e) => setCommissionValue(Number(e.target.value))}
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-primary)', outline: 'none', fontSize: '13px', backgroundColor: hasMissingCosts ? '#f1f5f9' : '#ffffff' }}
                        />
                      </div>
                    </div>

                    <div style={{ backgroundColor: hasMissingCosts ? '#f1f5f9' : '#f0fdf4', padding: '16px', borderRadius: '12px', border: hasMissingCosts ? '1px solid #cbd5e1' : '1px solid #bbf7d0', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: hasMissingCosts ? '#64748b' : '#166534' }}>
                        <span>Comisión ({commissionType === 'percentage' ? `${commissionValue}%` : 'Fija'}):</span>
                        <span style={{ fontWeight: 700 }}>{hasMissingCosts ? 'N/A' : `$${generatedCommission.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: hasMissingCosts ? '1px solid #cbd5e1' : '1px solid #bbf7d0', paddingTop: '8px', fontSize: '14px', fontWeight: 700, color: hasMissingCosts ? '#64748b' : finalUtility! >= 0 ? '#166534' : '#991b1b' }}>
                        <span>Utilidad Después de Comisión:</span>
                        <span>{hasMissingCosts ? 'N/A' : `$${finalUtility!.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Totals */}
                  <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #0f172a', paddingBottom: '4px', marginBottom: '6px' }}>
                      Resumen de Rentabilidad
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569' }}>
                      <span>VENTA TOTAL (Sin IVA)</span>
                      <span style={{ fontWeight: 600 }}>${totalSaleAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569' }}>
                      <span>COSTO TOTAL DE PRODUCTOS</span>
                      <span style={{ fontWeight: 600 }}>
                        {totalCostAmount !== null ? `$${totalCostAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : 'N/A'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #0f172a', paddingTop: '8px', marginTop: '4px', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                      <span>UTILIDAD BRUTA</span>
                      <span style={{ color: grossUtility === null ? '#94a3b8' : grossUtility >= 0 ? '#16a34a' : '#dc2626' }}>
                        {grossUtility !== null ? `$${grossUtility.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : 'N/A'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569' }}>
                      <span>MARGEN BRUTO</span>
                      <span style={{ fontWeight: 700, color: grossUtility === null ? '#94a3b8' : grossUtility >= 0 ? '#16a34a' : '#dc2626' }}>
                        {grossMarginPercent !== null ? `${grossMarginPercent.toFixed(2)}%` : 'N/A'}
                      </span>
                    </div>
                  </div>

                </div>
              </>
            )}

            {/* Footer aesthetics */}
            <div style={{ marginTop: '48px', borderTop: '1px solid #e2e8f0', paddingTop: '16px', textAlign: 'center', fontSize: '11px', color: '#94a3b8' }}>
              Representación de revisión interna de costos basada en datos históricos inmutables de Inventarios.
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};
