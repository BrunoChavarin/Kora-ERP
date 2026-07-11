import React, { useEffect, useState } from 'react';
import { DataTable } from '../components/DataTable';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Badge } from '../components/Badge';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { purchasesService } from '../services/purchases.service';
import { salesService } from '../services/sales.service';
import { contactsService } from '../services/contacts.service';
import { productsService } from '../services/products.service';
import { Purchase, Supplier, Product, PurchaseItem, ProductGroup, Sale } from '../types';
import { Plus, Calendar as CalendarIcon, List as ListIcon, Filter, ArrowUpDown, SlidersHorizontal } from 'lucide-react';

export const Compras: React.FC = () => {
  const { company } = useAuth();
  const { showToast } = useToast();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Reorganization & Temporal Selector State
  const defaultDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(defaultDate.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(defaultDate.getFullYear());
  const [currentView, setCurrentView] = useState<'list' | 'calendar'>('list');
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(null);

  // Sorting & Filtering States
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'total-desc' | 'total-asc'>('date-desc');
  const [showFilters, setShowFilters] = useState(false);
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterMinAmount, setFilterMinAmount] = useState('');
  const [filterMaxAmount, setFilterMaxAmount] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // New Purchase Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'pending' | 'received' | 'cancelled'>('pending');
  const [orderNumber, setOrderNumber] = useState('');
  const [applyTax, setApplyTax] = useState(true);

  // Hierarchical Product Selector states
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isProductOpen, setIsProductOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // Temp Item selector state
  const [tempProductId, setTempProductId] = useState('');
  const [tempQty, setTempQty] = useState(1);
  const [tempCost, setTempCost] = useState(0);

  const loadData = async () => {
    const pList = await purchasesService.getAll();
    setPurchases(pList);
    const sList = await salesService.getAll();
    setSales(sList);
    const supList = await contactsService.getSuppliers();
    setSuppliers(supList);
    const prList = await productsService.getAll();
    setProducts(prList);
    const gList = await productsService.getGroups();
    setGroups(gList);

    if (supList.length > 0) setSelectedSupplierId(supList[0].id);
    if (prList.length > 0) {
      setTempProductId(prList[0].id);
      setTempCost(prList[0].cost);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNewOrderModal = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    setOrderNumber(`OC-${dateStr}-${randomSuffix}`);
    setStatus('pending');
    setApplyTax(true);
    setItems([]);
    setNotes('');
    setIsCategoryOpen(false);
    setIsProductOpen(false);
    setProductSearch('');
    setIsOpen(true);
  };

  const handleProductChange = (id: string) => {
    setTempProductId(id);
    const prod = products.find(p => p.id === id);
    if (prod) {
      setTempCost(prod.cost);
    }
  };

  const addItem = () => {
    const prod = products.find(p => p.id === tempProductId);
    if (!prod) {
      showToast('warning', 'Sin producto', 'Debes seleccionar un producto primero.');
      return;
    }

    // Check if product is already added, if so increment quantity
    const existingIndex = items.findIndex(item => item.productId === tempProductId);
    if (existingIndex >= 0) {
      const updated = [...items];
      const current = updated[existingIndex];
      const newQty = current.quantity + tempQty;
      const sub = newQty * tempCost;
      const taxRate = applyTax ? (company?.taxRate || 16) : 0;
      const tot = sub * (1 + taxRate / 100);

      updated[existingIndex] = {
        ...current,
        quantity: newQty,
        cost: tempCost,
        subtotal: sub,
        total: tot
      };
      setItems(updated);
    } else {
      const sub = tempQty * tempCost;
      const taxRate = applyTax ? (company?.taxRate || 16) : 0;
      const tot = sub * (1 + taxRate / 100);

      const newItem: PurchaseItem = {
        productId: tempProductId,
        productName: prod.name,
        quantity: tempQty,
        cost: tempCost,
        taxRate,
        discount: 0,
        subtotal: sub,
        total: tot
      };
      setItems([...items, newItem]);
    }

    showToast('success', 'Ítem agregado', `Se añadió ${prod.name} a la orden.`);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const getSubtotal = () => items.reduce((acc, i) => acc + i.subtotal, 0);
  const getTax = () => {
    if (!applyTax) return 0;
    const rate = company?.taxRate || 16;
    return getSubtotal() * (rate / 100);
  };
  const getTotal = () => getSubtotal() + getTax();

  const handleTaxToggleChange = (checked: boolean) => {
    setApplyTax(checked);
    const rate = checked ? (company?.taxRate || 16) : 0;
    const updated = items.map(item => {
      const tot = item.subtotal * (1 + rate / 100);
      return {
        ...item,
        taxRate: rate,
        total: tot
      };
    });
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      showToast('warning', 'Sin productos', 'Debes agregar al menos un producto a la compra.');
      return;
    }

    const supplier = suppliers.find(s => s.id === selectedSupplierId);
    if (!supplier) return;

    const computedSubtotal = getSubtotal();
    const computedTax = getTax();
    const computedTotal = getTotal();

    const payload: Omit<Purchase, 'id' | 'createdAt'> = {
      companyId: company?.id || 'comp-1',
      supplierId: selectedSupplierId,
      supplierName: supplier.companyName,
      orderNumber,
      items,
      subtotal: computedSubtotal,
      tax: computedTax,
      discount: 0,
      total: computedTotal,
      status,
      notes
    };

    try {
      await purchasesService.create(payload);
      showToast('success', 'Orden Registrada', status === 'received' ? 'El stock del inventario ha sido incrementado.' : 'La orden de compra ha quedado registrada como pendiente.');
      setIsOpen(false);
      setItems([]);
      setNotes('');
      loadData();
    } catch (err: any) {
      showToast('danger', 'Error', err.message || 'No se pudo guardar la orden.');
    }
  };

  const columns = [
    { header: 'Folio Compra', accessor: (p: Purchase) => p.folio || p.orderNumber },
    { header: 'Proveedor', accessor: (p: Purchase) => p.supplierName },
    { header: 'Fecha', accessor: (p: Purchase) => p.createdAt.split('T')[0] },
    { header: 'Registró', accessor: (p: Purchase) => p.userName || 'Sistema' },
    { header: 'Estado', accessor: (p: Purchase) => (
      <Badge variant={p.status === 'received' ? 'success' : p.status === 'pending' ? 'warning' : 'danger'}>
        {p.status === 'received' ? 'Recibida' : p.status === 'pending' ? 'Pendiente' : 'Cancelada'}
      </Badge>
    ) },
    { header: 'Artículos', accessor: (p: Purchase) => `${p.items.reduce((sum, item) => sum + item.quantity, 0)} pzas` },
    { header: 'Total', accessor: (p: Purchase) => (
      <span style={{ fontWeight: 600 }}>
        ${p.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
      </span>
    ) },
    {
      header: 'Acciones',
      accessor: (p: Purchase) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          {p.status === 'pending' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (confirm('¿Marcar esta orden como Recibida? Se aumentará el inventario.')) {
                    try {
                      await purchasesService.updateStatus(p.id, 'received');
                      showToast('success', 'Orden Recibida', 'Inventario actualizado e historial registrado.');
                      loadData();
                    } catch (err: any) {
                      showToast('danger', 'Error', err.message || 'No se pudo actualizar.');
                    }
                  }
                }}
              >
                Recibir
              </Button>
              <Button
                variant="outline"
                size="sm"
                style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                onClick={async () => {
                  if (confirm('¿Seguro que deseas cancelar esta orden de compra?')) {
                    try {
                      await purchasesService.updateStatus(p.id, 'cancelled');
                      showToast('success', 'Orden Cancelada', 'La orden de compra fue cancelada.');
                      loadData();
                    } catch (err: any) {
                      showToast('danger', 'Error', err.message || 'No se pudo cancelar.');
                    }
                  }
                }}
              >
                Cancelar
              </Button>
            </>
          )}
          <Button
            variant="danger"
            size="sm"
            onClick={async () => {
              const confirmVal = prompt('Para eliminar esta orden de compra de forma permanente, escribe "Eliminar":');
              if (confirmVal === 'Eliminar') {
                try {
                  await purchasesService.delete(p.id);
                  showToast('success', 'Orden Eliminada', 'La orden de compra ha sido eliminada permanentemente.');
                  loadData();
                } catch (err: any) {
                  showToast('danger', 'Error', err.message || 'No se pudo eliminar la orden.');
                }
              }
            }}
          >
            Eliminar
          </Button>
        </div>
      )
    }
  ];

  const selectedGroupName = groups.find(g => g.id === selectedGroupId)?.name || 'Seleccionar Grupo...';
  const tempProduct = products.find(p => p.id === tempProductId);

  // Calculations for temporal organization
  const filteredPurchases = purchases.filter(p => {
    const pDate = new Date(p.createdAt);
    const pMonth = p.month || (pDate.getMonth() + 1);
    const pYear = p.year || pDate.getFullYear();
    
    if (pMonth !== selectedMonth || pYear !== selectedYear) return false;
    
    if (selectedCalendarDay !== null) {
      const pDay = p.day || pDate.getDate();
      if (pDay !== selectedCalendarDay) return false;
    }

    if (filterSupplier && p.supplierId !== filterSupplier) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterUser && p.userName && !p.userName.toLowerCase().includes(filterUser.toLowerCase())) return false;
    if (filterMinAmount && p.total < Number(filterMinAmount)) return false;
    if (filterMaxAmount && p.total > Number(filterMaxAmount)) return false;
    if (filterStartDate) {
      const start = new Date(filterStartDate);
      if (pDate < start) return false;
    }
    if (filterEndDate) {
      const end = new Date(filterEndDate);
      end.setHours(23, 59, 59, 999);
      if (pDate > end) return false;
    }
    return true;
  });

  const sortedPurchases = [...filteredPurchases].sort((a, b) => {
    if (sortBy === 'date-desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === 'date-asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sortBy === 'total-desc') return b.total - a.total;
    if (sortBy === 'total-asc') return a.total - b.total;
    return 0;
  });

  const purchasesGroupedByDay: { [dateStr: string]: Purchase[] } = {};
  const orderedDays: string[] = [];
  sortedPurchases.forEach(p => {
    const pDate = new Date(p.createdAt);
    const day = p.day || pDate.getDate();
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const monthStr = months[pDate.getMonth()];
    const year = p.year || pDate.getFullYear();
    const dateStr = `📅 ${day} de ${monthStr} de ${year}`;
    
    if (!orderedDays.includes(dateStr)) {
      orderedDays.push(dateStr);
    }
    if (!purchasesGroupedByDay[dateStr]) {
      purchasesGroupedByDay[dateStr] = [];
    }
    purchasesGroupedByDay[dateStr].push(p);
  });

  // Period Dashboard Calculations
  const periodSales = sales.filter(s => {
    const sDate = new Date(s.createdAt);
    const sMonth = s.month || (sDate.getMonth() + 1);
    const sYear = s.year || sDate.getFullYear();
    return sMonth === selectedMonth && sYear === selectedYear;
  });

  const periodPurchases = purchases.filter(p => {
    const pDate = new Date(p.createdAt);
    const pMonth = p.month || (pDate.getMonth() + 1);
    const pYear = p.year || pDate.getFullYear();
    return pMonth === selectedMonth && pYear === selectedYear;
  });

  const totalPeriodSalesAmount = periodSales.reduce((sum, s) => sum + s.total, 0);
  const totalPeriodPurchasesAmount = periodPurchases.reduce((sum, p) => sum + p.total, 0);
  const estimatedUtility = totalPeriodSalesAmount - totalPeriodPurchasesAmount;
  const totalPeriodOrdersCount = periodSales.length + periodPurchases.length;

  // Calendar parameters
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const firstDayIndex = new Date(selectedYear, selectedMonth - 1, 1).getDay(); // Sunday = 0
  const adjustedFirstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Mon=0, Tue=1, ..., Sun=6

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Title & Selector Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Órdenes de Compra</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Ingresa tus órdenes de compra para actualizar inventarios automáticamente al ser recibidas.</p>
        </div>
        
        {/* Temporal Selector */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(Number(e.target.value));
                setSelectedCalendarDay(null);
              }}
              style={{
                padding: '8px 32px 8px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border-primary)',
                backgroundColor: '#ffffff',
                backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23475569\' stroke-width=\'2.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
                backgroundSize: '14px',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                outline: 'none',
                appearance: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none'
              }}
            >
              {monthNames.map((name, idx) => (
                <option key={idx} value={idx + 1}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(Number(e.target.value));
                setSelectedCalendarDay(null);
              }}
              style={{
                padding: '8px 32px 8px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border-primary)',
                backgroundColor: '#ffffff',
                backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23475569\' stroke-width=\'2.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
                backgroundSize: '14px',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                outline: 'none',
                appearance: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none'
              }}
            >
              {[2025, 2026, 2027].map((yr) => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>
          <Button onClick={openNewOrderModal} icon={<Plus size={16} />}>Registrar Órden</Button>
        </div>
      </div>

      {/* Period Dashboard Indicators */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          width: '100%'
        }}
      >
        <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-primary)', backgroundColor: '#ffffff' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Ventas del Periodo</span>
          <span style={{ fontSize: '22px', fontWeight: 700, color: '#16a34a', display: 'block', marginTop: '6px' }}>
            ${totalPeriodSalesAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-primary)', backgroundColor: '#ffffff' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Compras del Periodo</span>
          <span style={{ fontSize: '22px', fontWeight: 700, color: '#dc2626', display: 'block', marginTop: '6px' }}>
            ${totalPeriodPurchasesAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-primary)', backgroundColor: '#ffffff' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Utilidad Estimada</span>
          <span style={{ fontSize: '22px', fontWeight: 700, color: estimatedUtility >= 0 ? '#0284c7' : '#d97706', display: 'block', marginTop: '6px' }}>
            ${estimatedUtility.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-primary)', backgroundColor: '#ffffff' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Número de Órdenes</span>
          <span style={{ fontSize: '22px', fontWeight: 700, color: '#4f46e5', display: 'block', marginTop: '6px' }}>
            {totalPeriodOrdersCount} <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>totales</span>
          </span>
        </div>
      </div>

      {/* View Switcher, Sorting and Filters Toggle */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-primary)',
          paddingBottom: '12px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setCurrentView('list')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid ' + (currentView === 'list' ? 'var(--border-primary)' : 'transparent'),
              backgroundColor: currentView === 'list' ? '#ffffff' : 'transparent',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              color: currentView === 'list' ? 'var(--text-primary)' : 'var(--text-secondary)'
            }}
          >
            <ListIcon size={16} />
            <span>Lista</span>
          </button>
          <button
            onClick={() => setCurrentView('calendar')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid ' + (currentView === 'calendar' ? 'var(--border-primary)' : 'transparent'),
              backgroundColor: currentView === 'calendar' ? '#ffffff' : 'transparent',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              color: currentView === 'calendar' ? 'var(--text-primary)' : 'var(--text-secondary)'
            }}
          >
            <CalendarIcon size={16} />
            <span>Calendario</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Sorting */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowUpDown size={14} style={{ color: 'var(--text-secondary)' }} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-primary)',
                backgroundColor: '#ffffff',
                fontSize: '13px',
                fontWeight: 500,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="date-desc">Más recientes</option>
              <option value="date-asc">Más antiguas</option>
              <option value="total-desc">Mayor monto</option>
              <option value="total-asc">Menor monto</option>
            </select>
          </div>

          {/* Filters Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-primary)',
              backgroundColor: showFilters ? 'var(--bg-secondary)' : '#ffffff',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              color: 'var(--text-primary)'
            }}
          >
            <SlidersHorizontal size={14} />
            <span>Filtros</span>
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div
          style={{
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid var(--border-primary)',
            backgroundColor: 'var(--bg-secondary)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px'
          }}
        >
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Proveedor</label>
            <select
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-primary)', outline: 'none', fontSize: '13px' }}
            >
              <option value="">Todos los proveedores</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.companyName}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Estado</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-primary)', outline: 'none', fontSize: '13px' }}
            >
              <option value="">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="received">Recibida</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Creador (Usuario)</label>
            <input
              type="text"
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              placeholder="Buscar por usuario..."
              style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-primary)', outline: 'none', fontSize: '13px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Rango de Montos</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="number"
                value={filterMinAmount}
                onChange={(e) => setFilterMinAmount(e.target.value)}
                placeholder="Mín"
                style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-primary)', outline: 'none', fontSize: '13px' }}
              />
              <input
                type="number"
                value={filterMaxAmount}
                onChange={(e) => setFilterMaxAmount(e.target.value)}
                placeholder="Máx"
                style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-primary)', outline: 'none', fontSize: '13px' }}
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Rango de Fecha</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-primary)', outline: 'none', fontSize: '12px' }}
              />
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-primary)', outline: 'none', fontSize: '12px' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                setFilterSupplier('');
                setFilterStatus('');
                setFilterUser('');
                setFilterMinAmount('');
                setFilterMaxAmount('');
                setFilterStartDate('');
                setFilterEndDate('');
                setSelectedCalendarDay(null);
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Limpiar Filtros
            </button>
          </div>
        </div>
      )}

      {/* Calendar View representation */}
      {currentView === 'calendar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Actividad de {monthNames[selectedMonth - 1]} {selectedYear}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '8px',
              backgroundColor: '#f8fafc',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid var(--border-primary)'
            }}
          >
            {/* Weekdays Headers */}
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, idx) => (
              <div key={idx} style={{ textAlign: 'center', fontSize: '12px', fontWeight: 700, color: '#64748b', paddingBottom: '8px' }}>{d}</div>
            ))}

            {/* Empty grid spaces before first day */}
            {Array.from({ length: adjustedFirstDayIndex }).map((_, idx) => (
              <div key={`empty-${idx}`} style={{ minHeight: '60px' }} />
            ))}

            {/* Month Day Cells */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const purchasesOnDay = purchases.filter(p => {
                const pDate = new Date(p.createdAt);
                const pDay = p.day || pDate.getDate();
                const pMonth = p.month || (pDate.getMonth() + 1);
                const pYear = p.year || pDate.getFullYear();
                return pDay === dayNum && pMonth === selectedMonth && pYear === selectedYear;
              });

              const isSelected = selectedCalendarDay === dayNum;

              return (
                <div
                  key={dayNum}
                  onClick={() => {
                    setSelectedCalendarDay(dayNum === selectedCalendarDay ? null : dayNum);
                    setCurrentView('list'); // Switch back to list to see result
                  }}
                  style={{
                    minHeight: '65px',
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid ' + (isSelected ? '#0284c7' : 'var(--border-primary)'),
                    backgroundColor: isSelected ? '#f0f9ff' : '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.borderColor = '#94a3b8';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.borderColor = 'var(--border-primary)';
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 600, color: isSelected ? '#0284c7' : 'var(--text-primary)' }}>{dayNum}</span>
                  {purchasesOnDay.length > 0 && (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        backgroundColor: '#fee2e2',
                        color: '#b91c1c',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        textAlign: 'center',
                        alignSelf: 'flex-start'
                      }}
                    >
                      {purchasesOnDay.length} {purchasesOnDay.length === 1 ? 'ord' : 'ords'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Date-Grouped Orders View */}
      {currentView === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {selectedCalendarDay !== null && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f0f9ff',
                border: '1px solid #bae6fd',
                padding: '10px 16px',
                borderRadius: '8px',
                fontSize: '13px'
              }}
            >
              <span style={{ color: '#0369a1', fontWeight: 600 }}>
                Mostrando órdenes del día {selectedCalendarDay} de {monthNames[selectedMonth - 1]} de {selectedYear}
              </span>
              <button
                onClick={() => setSelectedCalendarDay(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0284c7',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Mostrar todo el mes
              </button>
            </div>
          )}

          {orderedDays.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', border: '1px dashed var(--border-primary)', borderRadius: '12px', color: 'var(--text-tertiary)' }}>
              No se encontraron órdenes de compra registradas para este periodo o con los filtros seleccionados.
            </div>
          ) : (
            orderedDays.map((dayStr) => {
              const dayPurchases = purchasesGroupedByDay[dayStr];
              return (
                <div key={dayStr} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Day Header */}
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      borderBottom: '1px solid var(--border-primary)',
                      paddingBottom: '8px',
                      marginTop: '8px'
                    }}
                  >
                    {dayStr}
                  </div>

                  {/* Day Purchases Cards Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: '16px'
                    }}
                  >
                    {dayPurchases.map((purch) => {
                      const totalQty = purch.items.reduce((sum, item) => sum + item.quantity, 0);
                      const creatorName = purch.userName || 'No Registrado';

                      return (
                        <div
                          key={purch.id}
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid var(--border-primary)',
                            borderRadius: '12px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            boxShadow: 'var(--shadow-sm)',
                            position: 'relative'
                          }}
                        >
                          {/* Folio & Status Badge */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0284c7' }}>
                              {purch.folio || purch.orderNumber}
                            </span>
                            <Badge variant={purch.status === 'received' ? 'success' : purch.status === 'pending' ? 'warning' : 'danger'}>
                              {purch.status === 'received' ? 'Recibida' : purch.status === 'pending' ? 'Pendiente' : 'Cancelada'}
                            </Badge>
                          </div>

                          {/* Supplier Info */}
                          <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Proveedor</div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>{purch.supplierName}</div>
                          </div>

                          {/* Quantities & Total */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                            <div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Productos</div>
                              <div style={{ fontSize: '13px', fontWeight: 600 }}>{totalQty} {totalQty === 1 ? 'pza' : 'pzas'}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Total</div>
                              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                ${purch.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          </div>

                          {/* Creator User */}
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', borderTop: '1px solid #f1f5f9', paddingTop: '8px', display: 'flex', gap: '4px' }}>
                            <span>Registrado por:</span>
                            <span style={{ fontWeight: 600 }}>{creatorName}</span>
                          </div>

                          {/* Quick Actions Footer */}
                          <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginTop: '4px' }}>
                            {purch.status === 'pending' && (
                              <Button
                                variant="outline"
                                size="sm"
                                style={{ flex: 1, padding: '6px 8px', fontSize: '12px' }}
                                onClick={async () => {
                                  try {
                                    await purchasesService.updateStatus(purch.id, 'received');
                                    showToast('success', 'Mercancía Recibida', 'Inventarios actualizados y orden consolidada.');
                                    loadData();
                                  } catch (err: any) {
                                    showToast('danger', 'Error', err.message || 'No se pudo recibir la orden.');
                                  }
                                }}
                              >
                                Recibir pedido
                              </Button>
                            )}
                            {purch.status === 'pending' && (
                              <Button
                                variant="outline"
                                size="sm"
                                style={{ padding: '6px 8px', fontSize: '12px' }}
                                onClick={async () => {
                                  try {
                                    await purchasesService.updateStatus(purch.id, 'cancelled');
                                    showToast('success', 'Orden Cancelada', 'La orden de compra ha sido cancelada.');
                                    loadData();
                                  } catch (err: any) {
                                    showToast('danger', 'Error', err.message || 'No se pudo cancelar la orden.');
                                  }
                                }}
                              >
                                Cancelar
                              </Button>
                            )}
                            <Button
                              variant="danger"
                              size="sm"
                              style={{ padding: '6px 8px', fontSize: '12px' }}
                              onClick={async () => {
                                const confirmVal = prompt('Para eliminar esta orden de compra de forma permanente, escribe "Eliminar":');
                                if (confirmVal === 'Eliminar') {
                                  try {
                                    await purchasesService.delete(purch.id);
                                    showToast('success', 'Orden Eliminada', 'La orden ha sido eliminada permanentemente.');
                                    loadData();
                                  } catch (err: any) {
                                    showToast('danger', 'Error', err.message || 'No se pudo eliminar la orden.');
                                  }
                                }
                              }}
                            >
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Registrar Órden de Compra"
        footer={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button style={{ flex: 1 }} onClick={handleSubmit}>Guardar Órden</Button>
          </div>
        }
      >
        <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <Input label="Folio Orden" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} />
            </div>
            <div style={{ width: '200px' }}>
              <Select
                label="Estado Inicial"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                options={[
                  { value: 'pending', label: 'Pendiente' },
                  { value: 'received', label: 'Recibida' }
                ]}
              />
            </div>
          </div>

          <Select
            label="Seleccionar Proveedor"
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
            options={suppliers.map(s => ({ value: s.id, label: s.companyName }))}
          />

          {/* Hierarchical Selector Card */}
          <div
            style={{
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-sm)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              backgroundColor: 'var(--bg-secondary)',
              position: 'relative'
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Agregar Producto
            </span>

            <div style={{ display: 'flex', gap: '12px', zIndex: 10 }}>
              {/* Group Selector */}
              <div style={{ position: 'relative', flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Grupo de Productos
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCategoryOpen(!isCategoryOpen);
                    setIsProductOpen(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-primary)',
                    background: '#ffffff',
                    fontSize: '14px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {selectedGroupName}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>▼</span>
                </button>

                {isCategoryOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      background: '#ffffff',
                      border: '1px solid var(--border-primary)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-lg)',
                      zIndex: 200,
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}
                  >
                    {groups.map((group) => (
                      <div
                        key={group.id}
                        onClick={() => {
                          setSelectedGroupId(group.id);
                          setIsCategoryOpen(false);
                          setIsProductOpen(true);
                          setProductSearch('');
                        }}
                        style={{
                          padding: '10px 14px',
                          fontSize: '14px',
                          cursor: 'pointer',
                          backgroundColor: selectedGroupId === group.id ? 'var(--bg-secondary)' : 'transparent',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                        onMouseLeave={(e) => {
                          if (selectedGroupId !== group.id) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        {group.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Selector */}
              <div style={{ position: 'relative', flex: 1.5 }}>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Producto
                </label>
                <button
                  type="button"
                  disabled={!selectedGroupId}
                  onClick={() => {
                    setIsProductOpen(!isProductOpen);
                    setIsCategoryOpen(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-primary)',
                    background: selectedGroupId ? '#ffffff' : 'var(--bg-secondary)',
                    color: selectedGroupId ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    fontSize: '14px',
                    textAlign: 'left',
                    cursor: selectedGroupId ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {tempProduct ? tempProduct.name : 'Seleccionar Producto...'}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>▼</span>
                </button>

                {isProductOpen && selectedGroupId && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      width: '320px',
                      marginTop: '4px',
                      background: '#ffffff',
                      border: '1px solid var(--border-primary)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-lg)',
                      zIndex: 200,
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <div style={{ padding: '8px', borderBottom: '1px solid var(--border-primary)' }}>
                      <input
                        type="text"
                        placeholder="Buscar en este grupo..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          fontSize: '13px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-primary)',
                          outline: 'none'
                        }}
                        autoFocus
                      />
                    </div>
                    <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                      {products
                        .filter(p => p.groupId === selectedGroupId)
                        .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                        .map((prod) => (
                          <div
                            key={prod.id}
                            onClick={() => {
                              handleProductChange(prod.id);
                              setIsProductOpen(false);
                            }}
                            style={{
                              padding: '10px 12px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              cursor: 'pointer',
                              borderBottom: '1px solid var(--border-primary)',
                              fontSize: '13px',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{prod.name}</span>
                              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                Costo: ${prod.cost}/{prod.unit}
                              </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                              <span style={{ fontSize: '11px', fontWeight: 600 }}>
                                Stock: {prod.stock} {prod.unit}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <Input
                label="Cantidad"
                type="number"
                value={tempQty}
                onChange={(e) => setTempQty(Number(e.target.value))}
              />
              <Input
                label="Costo Unitario ($)"
                type="number"
                value={tempCost}
                onChange={(e) => setTempCost(Number(e.target.value))}
              />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              + Añadir al listado
            </Button>
          </div>

          {/* Added items list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Ítems en esta orden</span>
            {items.length === 0 ? (
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>No hay productos añadidos</span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#ffffff',
                      border: '1px solid var(--border-primary)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>{item.productName}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                        {item.quantity} pzas x ${item.cost} c/u {item.taxRate > 0 && `(con IVA)`}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>${item.subtotal.toLocaleString()}</span>
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--danger)',
                          cursor: 'pointer'
                        }}
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* IVA Toggle Checkbox */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--bg-secondary)',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-primary)'
            }}
          >
            <input
              type="checkbox"
              id="applyTax"
              checked={applyTax}
              onChange={(e) => handleTaxToggleChange(e.target.checked)}
              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
            />
            <label htmlFor="applyTax" style={{ fontSize: '13px', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}>
              Habilitar cálculo de IVA en esta compra
            </label>
          </div>

          <div
            style={{
              borderTop: '1px solid var(--border-primary)',
              paddingTop: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span>Subtotal:</span>
              <span>${getSubtotal().toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span>IVA ({applyTax ? (company?.taxRate || 16) : 0}%):</span>
              <span>${getTax().toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 700 }}>
              <span>Total Compra:</span>
              <span>${getTotal().toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <Input label="Observaciones / Notas" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </form>
      </Modal>
    </div>
  );
};
