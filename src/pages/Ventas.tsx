import React, { useEffect, useState } from 'react';
import { DataTable } from '../components/DataTable';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Badge } from '../components/Badge';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { salesService } from '../services/sales.service';
import { contactsService } from '../services/contacts.service';
import { productsService } from '../services/products.service';
import { customPricesService } from '../services/customPrices.service';
import { purchasesService } from '../services/purchases.service';
import { Sale, Customer, Product, SaleItem, ProductGroup, Purchase } from '../types';
import { Plus, Calendar as CalendarIcon, List as ListIcon, Filter, ArrowUpDown, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { RemissionNoteModal } from '../components/RemissionNoteModal';
import { CostAnalysisDrawer } from '../components/CostAnalysisDrawer';

export const Ventas: React.FC = () => {
  const { company } = useAuth();
  const { showToast } = useToast();

  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
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
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterMinAmount, setFilterMinAmount] = useState('');
  const [filterMaxAmount, setFilterMaxAmount] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('generic');
  const [items, setItems] = useState<SaleItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('Transferencia SPEI');
  const [status, setStatus] = useState<'paid' | 'pending' | 'partial'>('paid');
  const [invoice, setInvoice] = useState('no');
  const [notes, setNotes] = useState('');
  const [applyTax, setApplyTax] = useState(true); // IVA toggle state

  // Hierarchical Product Selector states
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isProductOpen, setIsProductOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // Remission Note states
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isRemissionOpen, setIsRemissionOpen] = useState(false);

  // Cost Analysis states
  const [selectedSaleForCost, setSelectedSaleForCost] = useState<Sale | null>(null);
  const [isCostAnalysisOpen, setIsCostAnalysisOpen] = useState(false);

  const loadData = async () => {
    const list = await salesService.getAll();
    setSales(list);
    const purList = await purchasesService.getAll();
    setPurchases(purList);
    const cList = await contactsService.getCustomers();
    setCustomers(cList);
    const pList = await productsService.getAll();
    setProducts(pList);
    const gList = await productsService.getGroups();
    setGroups(gList);
    setSelectedCustomerId('generic');
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNewSaleModal = () => {
    setSelectedCustomerId('generic');
    setItems([]);
    setPaymentMethod('Transferencia SPEI');
    setStatus('paid');
    setInvoice('no');
    setNotes('');
    setApplyTax(true);
    setIsCategoryOpen(false);
    setIsProductOpen(false);
    setProductSearch('');
    setIsOpen(true);
  };

  const addItemForProduct = async (prod: Product) => {
    let price = prod.price;
    let priceOrigin = 'Precio general del producto';

    // Pricing Priority checking
    if (selectedCustomerId && selectedCustomerId !== 'generic') {
      const customPrice = await customPricesService.getCustomPrice(selectedCustomerId, prod.id);
      if (customPrice !== null) {
        price = customPrice;
        priceOrigin = 'Precio personalizado del cliente';
      } else {
        // Fallback to customer history price
        const lastPrice = await salesService.getLastPriceForCustomer(selectedCustomerId, prod.id);
        if (lastPrice !== null) {
          price = lastPrice;
          priceOrigin = 'Último precio de compra del cliente';
        }
      }
    }

    const existingIndex = items.findIndex(item => item.productId === prod.id);
    const taxRate = applyTax ? (company?.taxRate || 16) : 0;
    const groupName = groups.find(g => g.id === prod.groupId)?.name || 'Sin Grupo';

    if (existingIndex >= 0) {
      const updated = [...items];
      const current = updated[existingIndex];
      const newQty = current.quantity + 1;
      const sub = newQty * price;
      const tot = sub * (1 + taxRate / 100);

      updated[existingIndex] = {
        ...current,
        quantity: newQty,
        price,
        subtotal: sub,
        total: tot,
        priceOrigin,
        groupName,
        cost: prod.cost
      };
      setItems(updated);
    } else {
      const sub = 1 * price;
      const tot = sub * (1 + taxRate / 100);

      const newItem: SaleItem = {
        productId: prod.id,
        productName: prod.name,
        quantity: 1,
        price,
        taxRate,
        discount: 0,
        subtotal: sub,
        total: tot,
        priceOrigin,
        groupName,
        cost: prod.cost
      };
      setItems([...items, newItem]);
    }
    showToast('success', 'Producto agregado', `Se añadió 1 de ${prod.name} a la orden.`);
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
      showToast('warning', 'Sin artículos', 'Debes agregar al menos un producto a la venta.');
      return;
    }

    let customerName = 'Cliente Genérico';
    if (selectedCustomerId !== 'generic') {
      const customer = customers.find(c => c.id === selectedCustomerId);
      if (!customer) return;
      customerName = customer.companyName ? `${customer.name} (${customer.companyName})` : customer.name;
    }

    // Auto-update custom prices check
    if (selectedCustomerId && selectedCustomerId !== 'generic') {
      for (const item of items) {
        if (item.priceOrigin === 'Modificado manualmente') {
          const update = confirm(
            `El precio de "${item.productName}" ($${item.price}) es diferente al registrado para este cliente. ¿Deseas actualizar su precio personalizado?`
          );
          if (update) {
            try {
              await customPricesService.save(selectedCustomerId, item.productId, item.price);
              showToast('success', 'Lista de precios actualizada', `Se actualizó el precio de ${item.productName}.`);
            } catch (cpErr: any) {
              console.error('No se pudo actualizar el precio personalizado:', cpErr);
            }
          }
        }
      }
    }

    const computedSubtotal = getSubtotal();
    const computedTax = getTax();
    const computedTotal = getTotal();

    const payload: Omit<Sale, 'id' | 'createdAt'> = {
      companyId: company?.id || '',
      customerId: selectedCustomerId,
      customerName,
      items,
      subtotal: computedSubtotal,
      tax: computedTax,
      discount: 0,
      total: computedTotal,
      paymentMethod,
      status,
      invoice: invoice === 'yes' ? `F-${Math.floor(1000 + Math.random() * 9000)}` : 'no',
      notes
    };

    try {
      const createdSale = await salesService.create(payload);
      showToast('success', 'Venta Registrada', 'El stock de inventario ha disminuido y el flujo fue asentado.');
      setIsOpen(false);
      setItems([]);
      setNotes('');
      loadData();
      
      // Auto open remission note preview
      setSelectedSale(createdSale);
      setIsRemissionOpen(true);
    } catch (err: any) {
      showToast('danger', 'Error', err.message || 'Error al guardar venta.');
    }
  };

  const columns = [
    {
      header: 'Folio Venta',
      accessor: (s: Sale) => (
        <button
          onClick={() => {
            setSelectedSale(s);
            setIsRemissionOpen(true);
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#0284c7',
            textDecoration: 'underline',
            cursor: 'pointer',
            fontWeight: 600,
            padding: 0,
            fontFamily: 'inherit',
            fontSize: 'inherit',
            textAlign: 'left'
          }}
        >
          {s.folio || s.id.substring(0, 8)}
        </button>
      )
    },
    { header: 'Cliente', accessor: (s: Sale) => s.customerName },
    { header: 'Fecha', accessor: (s: Sale) => s.createdAt.split('T')[0] },
    { header: 'Factura', accessor: (s: Sale) => s.invoice === 'no' ? '-' : s.invoice },
    { header: 'Estado', accessor: (s: Sale) => (
      <Badge variant={s.status === 'paid' ? 'success' : s.status === 'pending' ? 'warning' : s.status === 'cancelled' ? 'danger' : 'danger'}>
        {s.status === 'paid' ? 'Cobrada' : s.status === 'pending' ? 'Pendiente' : s.status === 'cancelled' ? 'Cancelada' : 'Parcial'}
      </Badge>
    ) },
    { header: 'Total', accessor: (s: Sale) => (
      <span style={{ fontWeight: 600 }}>
        ${s.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
      </span>
    ) },
    {
      header: 'Acciones',
      accessor: (s: Sale) => s.status === 'cancelled' ? (
        <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Cancelada</span>
      ) : (
        <Button
          variant="danger"
          size="sm"
          onClick={async () => {
            const reason = prompt('Por favor, ingresa el motivo de la cancelación de esta venta:');
            if (reason !== null) {
              if (!reason.trim()) {
                showToast('danger', 'Error', 'El motivo de cancelación es obligatorio.');
                return;
              }
              try {
                await salesService.cancel(s.id, reason);
                showToast('success', 'Venta Cancelada', 'La venta ha sido cancelada y el inventario devuelto.');
                loadData();
              } catch (err: any) {
                showToast('danger', 'Error', err.message || 'No se pudo cancelar la venta.');
              }
            }
          }}
        >
          Cancelar
        </Button>
      )
    }
  ];

  const selectedGroupName = groups.find(g => g.id === selectedGroupId)?.name || 'Seleccionar Grupo...';

  // Calculations for temporal organization
  const filteredSales = sales.filter(s => {
    const sDate = new Date(s.createdAt);
    const sMonth = s.month || (sDate.getMonth() + 1);
    const sYear = s.year || sDate.getFullYear();
    
    if (sMonth !== selectedMonth || sYear !== selectedYear) return false;
    
    if (selectedCalendarDay !== null) {
      const sDay = s.day || sDate.getDate();
      if (sDay !== selectedCalendarDay) return false;
    }

    if (filterCustomer && s.customerId !== filterCustomer) return false;
    if (filterStatus && s.status !== filterStatus) return false;
    if (filterUser && s.userName && !s.userName.toLowerCase().includes(filterUser.toLowerCase())) return false;
    if (filterMinAmount && s.total < Number(filterMinAmount)) return false;
    if (filterMaxAmount && s.total > Number(filterMaxAmount)) return false;
    if (filterStartDate) {
      const start = new Date(filterStartDate);
      if (sDate < start) return false;
    }
    if (filterEndDate) {
      const end = new Date(filterEndDate);
      end.setHours(23, 59, 59, 999);
      if (sDate > end) return false;
    }
    return true;
  });

  const sortedSales = [...filteredSales].sort((a, b) => {
    if (sortBy === 'date-desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === 'date-asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sortBy === 'total-desc') return b.total - a.total;
    if (sortBy === 'total-asc') return a.total - b.total;
    return 0;
  });

  const salesGroupedByDay: { [dateStr: string]: Sale[] } = {};
  const orderedDays: string[] = [];
  sortedSales.forEach(s => {
    const sDate = new Date(s.createdAt);
    const day = s.day || sDate.getDate();
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const monthStr = months[sDate.getMonth()];
    const year = s.year || sDate.getFullYear();
    const dateStr = `📅 ${day} de ${monthStr} de ${year}`;
    
    if (!orderedDays.includes(dateStr)) {
      orderedDays.push(dateStr);
    }
    if (!salesGroupedByDay[dateStr]) {
      salesGroupedByDay[dateStr] = [];
    }
    salesGroupedByDay[dateStr].push(s);
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
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Órdenes de Venta</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Registra y gestiona los cobros, facturación y salida de mercancía.</p>
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
          <Button onClick={openNewSaleModal} icon={<Plus size={16} />}>Registrar Venta</Button>
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
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Cliente</label>
            <select
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-primary)', outline: 'none', fontSize: '13px' }}
            >
              <option value="">Todos los clientes</option>
              <option value="generic">Venta Genérica</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.companyName ? `${c.name} (${c.companyName})` : c.name}</option>
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
              <option value="paid">Cobrada</option>
              <option value="pending">Pendiente</option>
              <option value="partial">Parcial</option>
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
                setFilterCustomer('');
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
              const salesOnDay = sales.filter(s => {
                const sDate = new Date(s.createdAt);
                const sDay = s.day || sDate.getDate();
                const sMonth = s.month || (sDate.getMonth() + 1);
                const sYear = s.year || sDate.getFullYear();
                return sDay === dayNum && sMonth === selectedMonth && sYear === selectedYear;
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
                  {salesOnDay.length > 0 && (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        backgroundColor: '#e0f2fe',
                        color: '#0369a1',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        textAlign: 'center',
                        alignSelf: 'flex-start'
                      }}
                    >
                      {salesOnDay.length} {salesOnDay.length === 1 ? 'vta' : 'vtas'}
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
              No se encontraron órdenes de venta registradas para este periodo o con los filtros seleccionados.
            </div>
          ) : (
            orderedDays.map((dayStr) => {
              const daySales = salesGroupedByDay[dayStr];
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

                  {/* Day Sales Cards Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: '16px'
                    }}
                  >
                    {daySales.map((sale) => {
                      const totalQty = sale.items.reduce((sum, item) => sum + item.quantity, 0);
                      const creatorName = sale.userName || 'No Registrado';

                      return (
                        <div
                          key={sale.id}
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
                              {sale.folio || sale.id.substring(0, 8)}
                            </span>
                             <Badge variant={sale.status === 'paid' ? 'success' : sale.status === 'pending' ? 'warning' : sale.status === 'cancelled' ? 'danger' : 'danger'}>
                              {sale.status === 'paid' ? 'Cobrada' : sale.status === 'pending' ? 'Pendiente' : sale.status === 'cancelled' ? 'Cancelada' : 'Parcial'}
                            </Badge>
                          </div>

                          {/* Client / Customer Info */}
                          <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Cliente</div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>{sale.customerName}</div>
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
                                ${sale.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
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
                            <Button
                              variant="outline"
                              size="sm"
                              style={{ flex: 1, padding: '6px 8px', fontSize: '12px' }}
                              onClick={() => {
                                setSelectedSale(sale);
                                setIsRemissionOpen(true);
                              }}
                            >
                              Ver detalle
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              style={{ flex: 1, padding: '6px 8px', fontSize: '12px', borderColor: '#0284c7', color: '#0284c7' }}
                              onClick={() => {
                                setSelectedSaleForCost(sale);
                                setIsCostAnalysisOpen(true);
                              }}
                            >
                              Revisar costos
                            </Button>
                            {sale.status !== 'cancelled' && (
                              <Button
                                variant="danger"
                                size="sm"
                                style={{ padding: '6px 8px', fontSize: '12px' }}
                                onClick={async () => {
                                  const reason = prompt('Por favor, ingresa el motivo de la cancelación de esta venta:');
                                  if (reason !== null) {
                                    if (!reason.trim()) {
                                      showToast('danger', 'Error', 'El motivo de cancelación es obligatorio.');
                                      return;
                                    }
                                    try {
                                      await salesService.cancel(sale.id, reason);
                                      showToast('success', 'Venta Cancelada', 'La venta ha sido cancelada y el inventario devuelto.');
                                      loadData();
                                    } catch (err: any) {
                                      showToast('danger', 'Error', err.message || 'No se pudo cancelar la venta.');
                                    }
                                  }
                                }}
                              >
                                Cancelar
                              </Button>
                            )}
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
        title="Registrar Nueva Venta"
        footer={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button style={{ flex: 1 }} onClick={handleSubmit}>Finalizar Venta</Button>
          </div>
        }
      >
        <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Select
            label="Cliente"
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            options={[
              { value: 'generic', label: 'Venta Genérica' },
              ...customers.map(c => ({ value: c.id, label: c.companyName ? `${c.name} (${c.companyName})` : c.name }))
            ]}
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
              Agregar Producto a la Orden
            </span>

            <div style={{ display: 'flex', gap: '12px' }}>
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
                    Seleccionar Producto...
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
                        .map((prod) => {
                          const hasStock = prod.stock > 0;
                          return (
                            <div
                              key={prod.id}
                              onClick={() => {
                                if (hasStock) {
                                  addItemForProduct(prod);
                                  setIsProductOpen(false);
                                }
                              }}
                              style={{
                                padding: '10px 12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: hasStock ? 'pointer' : 'not-allowed',
                                opacity: hasStock ? 1 : 0.65,
                                borderBottom: '1px solid var(--border-primary)',
                                fontSize: '13px',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                if (hasStock) e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{prod.name}</span>
                                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                  Costo: ${prod.cost}/{prod.unit}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--brand-primary)', fontWeight: 500 }}>
                                  Sugerido: ${prod.price}/{prod.unit}
                                </span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: hasStock ? 'var(--text-secondary)' : 'var(--danger)' }}>
                                  Stock: {prod.stock} {prod.unit}
                                </span>
                                {!hasStock && (
                                  <span style={{ fontSize: '9px', background: 'var(--danger)', color: '#ffffff', padding: '2px 6px', borderRadius: '3px', fontWeight: 600 }}>
                                    Sin stock
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* List items added with inline inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Artículos a vender</span>
            {items.length === 0 ? (
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>No hay productos añadidos</span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#ffffff',
                      border: '1px solid var(--border-primary)',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.productName}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                        {item.taxRate > 0 ? 'Con IVA' : 'Sin IVA'} • <strong>{item.priceOrigin || 'Precio general del producto'}</strong>
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* Quantity Input */}
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const updated = [...items];
                          const sub = val * item.price;
                          const tot = sub * (1 + item.taxRate / 100);
                          updated[idx] = { ...item, quantity: val, subtotal: sub, total: tot };
                          setItems(updated);
                        }}
                        style={{
                          width: '60px',
                          padding: '6px',
                          fontSize: '13px',
                          border: '1px solid var(--border-primary)',
                          borderRadius: '4px',
                          textAlign: 'center',
                          outline: 'none'
                        }}
                      />
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>x</span>
                      {/* Price Input */}
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const updated = [...items];
                          const sub = item.quantity * val;
                          const tot = sub * (1 + item.taxRate / 100);
                          updated[idx] = { ...item, price: val, subtotal: sub, total: tot, priceOrigin: 'Modificado manualmente' };
                          setItems(updated);
                        }}
                        style={{
                          width: '80px',
                          padding: '6px',
                          fontSize: '13px',
                          border: '1px solid var(--border-primary)',
                          borderRadius: '4px',
                          textAlign: 'right',
                          outline: 'none'
                        }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: 600, minWidth: '70px', textAlign: 'right' }}>
                        ${item.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--danger)',
                          cursor: 'pointer',
                          fontSize: '18px',
                          padding: '4px'
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
              Habilitar cálculo de IVA en esta venta
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
              <span>Total Venta:</span>
              <span>${getTotal().toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Select
              label="Método Pago"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              options={[
                { value: 'Transferencia SPEI', label: 'SPEI' },
                { value: 'Tarjeta Crédito', label: 'Tarjeta' },
                { value: 'Efectivo', label: 'Efectivo' }
              ]}
            />
            <Select
              label="Estado"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              options={[
                { value: 'paid', label: 'Pagada (Cobrada)' },
                { value: 'pending', label: 'Pendiente (Crédito)' }
              ]}
            />
          </div>

          <Select
            label="¿Generar Factura Fiscal?"
            value={invoice}
            onChange={(e) => setInvoice(e.target.value)}
            options={[
              { value: 'no', label: 'No, solo ticket de venta' },
              { value: 'yes', label: 'Sí, generar folio fiscal' }
            ]}
          />

          <Input label="Notas / Comentarios" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </form>
      </Modal>

      <RemissionNoteModal
        isOpen={isRemissionOpen}
        onClose={() => {
          setIsRemissionOpen(false);
          setSelectedSale(null);
        }}
        sale={selectedSale}
      />

      <CostAnalysisDrawer
        isOpen={isCostAnalysisOpen}
        onClose={() => {
          setIsCostAnalysisOpen(false);
          setSelectedSaleForCost(null);
        }}
        sale={selectedSaleForCost}
      />
    </div>
  );
};
