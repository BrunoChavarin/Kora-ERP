import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DataTable } from '../components/DataTable';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { contactsService } from '../services/contacts.service';
import { salesService } from '../services/sales.service';
import { productsService } from '../services/products.service';
import { customPricesService } from '../services/customPrices.service';
import { Customer, CustomerPriceHistory, Sale, Product, CustomerCustomPrice, CustomerCustomPriceHistory, ProductGroup } from '../types';
import { Plus, Edit2, Trash2, X, ChevronDown, ChevronRight, Search, ShoppingBag, History } from 'lucide-react';

export const Clientes: React.FC = () => {
  const { company } = useAuth();
  const { companySlug } = useParams<{ companySlug: string }>();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [isOpen, setIsOpen] = useState(false); // Customer form modal

  // Drawer detail state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [drawerTab, setDrawerTab] = useState<'pedidos' | 'precios' | 'personalizados'>('pedidos');
  const [priceHistory, setPriceHistory] = useState<CustomerPriceHistory[]>([]);
  const [customPrices, setCustomPrices] = useState<CustomerCustomPrice[]>([]);
  
  // Expanded states in Drawer
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [expandedProductPriceId, setExpandedProductPriceId] = useState<string | null>(null);
  const [expandedCustomPriceId, setExpandedCustomPriceId] = useState<string | null>(null);

  // Search states inside Drawer tabs
  const [salesSearch, setSalesSearch] = useState('');
  const [pricesSearch, setPricesSearch] = useState('');
  const [customPricesSearch, setCustomPricesSearch] = useState('');

  // Custom Price Modal state
  const [isCpModalOpen, setIsCpModalOpen] = useState(false);
  const [cpProductId, setCpProductId] = useState('');
  const [cpGroupId, setCpGroupId] = useState('');
  const [cpPrice, setCpPrice] = useState(0);
  const [cpHistoryMap, setCpHistoryMap] = useState<Record<string, CustomerCustomPriceHistory[]>>({});

  // Form State for creating/editing customer
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [formName, setFormName] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formRfc, setFormRfc] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState('Transferencia SPEI');
  const [formNotes, setFormNotes] = useState('');
  const [formBalancePending, setFormBalancePending] = useState(0);

  const loadData = async () => {
    const list = await contactsService.getCustomers();
    setCustomers(list);
    const salesList = await salesService.getAll();
    setAllSales(salesList);
    const pList = await productsService.getAll();
    setProducts(pList);
    const gList = await productsService.getGroups();
    setGroups(gList);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadCustomerHistory = async (customerId: string) => {
    try {
      const history = await salesService.getCustomerPriceHistory(customerId);
      setPriceHistory(history);
      const cp = await customPricesService.getByCustomerId(customerId);
      setCustomPrices(cp);
    } catch (err) {
      console.error('Error al cargar datos del cliente:', err);
    }
  };

  const loadCustomPriceHistory = async (customerId: string, productId: string) => {
    try {
      const hist = await customPricesService.getHistory(customerId, productId);
      setCpHistoryMap(prev => ({
        ...prev,
        [productId]: hist
      }));
    } catch (err) {
      console.error('Error al cargar historial de cambios de precio:', err);
    }
  };

  const openNew = () => {
    setEditCustomer(null);
    setFormName('');
    setFormCompany('');
    setFormEmail('');
    setFormPhone('');
    setFormAddress('');
    setFormRfc('');
    setFormPaymentMethod('Transferencia SPEI');
    setFormNotes('');
    setFormBalancePending(0);
    setIsOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditCustomer(customer);
    setFormName(customer.name);
    setFormCompany(customer.companyName || '');
    setFormEmail(customer.email);
    setFormPhone(customer.phone || '');
    setFormAddress(customer.address || '');
    setFormRfc(customer.rfc || '');
    setFormPaymentMethod(customer.paymentMethod || 'Transferencia SPEI');
    setFormNotes(customer.notes || '');
    setFormBalancePending(customer.balancePending);
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este cliente?')) {
      try {
        await contactsService.deleteCustomer(id);
        showToast('success', 'Cliente eliminado', 'Los registros se actualizaron correctamente.');
        if (selectedCustomer?.id === id) {
          setSelectedCustomer(null);
        }
        loadData();
      } catch (err: any) {
        showToast('danger', 'Error', err.message || 'No se pudo eliminar el cliente.');
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail) {
      showToast('warning', 'Campos requeridos', 'Ingresa nombre y correo electrónico.');
      return;
    }

    const payload: Customer = {
      id: editCustomer ? editCustomer.id : `cust-${Math.random().toString(36).substr(2, 9)}`,
      companyId: company?.id || 'comp-1',
      name: formName,
      companyName: formCompany,
      email: formEmail,
      phone: formPhone,
      address: formAddress,
      rfc: formRfc,
      paymentMethod: formPaymentMethod,
      notes: formNotes,
      balancePending: Number(formBalancePending),
      createdAt: editCustomer ? editCustomer.createdAt : new Date().toISOString()
    };

    try {
      await contactsService.saveCustomer(payload);
      showToast('success', editCustomer ? 'Cliente editado' : 'Cliente registrado', 'El cliente ha sido guardado exitosamente.');
      setIsOpen(false);
      loadData();
      if (selectedCustomer && selectedCustomer.id === payload.id) {
        setSelectedCustomer(payload);
      }
    } catch (err: any) {
      showToast('danger', 'Error', err.message || 'Error al guardar cliente.');
    }
  };

  // Custom Price save handler
  const handleSaveCustomPrice = async () => {
    if (!selectedCustomer || !cpProductId || cpPrice <= 0) {
      showToast('warning', 'Campos requeridos', 'Por favor selecciona un producto y define un precio válido.');
      return;
    }

    try {
      await customPricesService.save(selectedCustomer.id, cpProductId, cpPrice);
      showToast('success', 'Precio Guardado', 'El precio personalizado ha sido registrado.');
      setIsCpModalOpen(false);
      loadCustomerHistory(selectedCustomer.id);
    } catch (err: any) {
      showToast('danger', 'Error', err.message || 'No se pudo guardar el precio personalizado.');
    }
  };

  const handleDeleteCustomPrice = async (cpId: string) => {
    if (window.confirm('¿Seguro que deseas eliminar este precio personalizado?')) {
      try {
        await customPricesService.delete(cpId);
        showToast('success', 'Precio Eliminado', 'Se ha removido el precio personalizado.');
        if (selectedCustomer) loadCustomerHistory(selectedCustomer.id);
      } catch (err: any) {
        showToast('danger', 'Error', err.message || 'No se pudo eliminar.');
      }
    }
  };

  const handleCustomerClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setExpandedOrderId(null);
    setExpandedProductPriceId(null);
    setExpandedCustomPriceId(null);
    setSalesSearch('');
    setPricesSearch('');
    setCustomPricesSearch('');
    loadCustomerHistory(customer.id);
  };

  const columns = [
    { header: 'Cliente', accessor: (c: Customer) => (
      <div style={{ cursor: 'pointer' }} onClick={() => handleCustomerClick(c)}>
        <div style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>{c.name}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{c.companyName || 'Persona Física'}</div>
      </div>
    ) },
    { header: 'Correo', accessor: (c: Customer) => c.email },
    { header: 'Teléfono', accessor: (c: Customer) => c.phone || '-' },
    { header: 'RFC', accessor: (c: Customer) => c.rfc || '-' },
    { header: 'Saldo Pendiente', accessor: (c: Customer) => (
      <span style={{ fontWeight: 600, color: c.balancePending > 0 ? 'var(--danger)' : 'var(--success)' }}>
        ${c.balancePending.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
      </span>
    ) },
    { header: 'Acciones', accessor: (c: Customer) => (
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button variant="outline" size="sm" onClick={() => openEdit(c)}><Edit2 size={12} /></Button>
        <Button variant="danger" size="sm" onClick={() => handleDelete(c.id)}><Trash2 size={12} /></Button>
      </div>
    ) }
  ];

  // Calculations for selected customer in Drawer
  const customerSales = selectedCustomer
    ? allSales.filter(s => s.customerId === selectedCustomer.id)
    : [];
  const totalSalesCount = customerSales.length;
  const totalAmountBought = customerSales.reduce((sum, s) => sum + s.total, 0);
  const ticketPromedio = totalSalesCount > 0 ? totalAmountBought / totalSalesCount : 0;
  const lastPurchaseDate = customerSales.length > 0 ? customerSales[0].createdAt.split('T')[0] : 'Sin compras';

  // Group prices for Tab 2
  const groupedPrices = priceHistory.reduce((acc, h) => {
    if (!acc[h.productId]) {
      acc[h.productId] = {
        productId: h.productId,
        productName: h.productName || 'Producto',
        latestPrice: h.price,
        history: []
      };
    }
    acc[h.productId].history.push(h);
    return acc;
  }, {} as Record<string, { productId: string, productName: string, latestPrice: number, history: CustomerPriceHistory[] }>);

  // Filtered lists in Drawer
  const filteredSales = customerSales.filter(s => {
    const query = salesSearch.toLowerCase();
    return (s.folio || '').toLowerCase().includes(query) ||
           (s.notes || '').toLowerCase().includes(query) ||
           (s.paymentMethod || '').toLowerCase().includes(query);
  });

  const filteredPrices = Object.values(groupedPrices).filter(p => 
    p.productName.toLowerCase().includes(pricesSearch.toLowerCase())
  );

  const filteredCustomPrices = customPrices.filter(cp =>
    (cp.productName || '').toLowerCase().includes(customPricesSearch.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', overflowX: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Clientes</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Da de alta clientes y haz clic sobre ellos para ver su expediente y precios negociados.</p>
        </div>
        <Button onClick={openNew} icon={<Plus size={16} />}>Nuevo Cliente</Button>
      </div>

      <DataTable data={customers} columns={columns} />

      {/* Backdrop for closing drawer when clicking outside */}
      {selectedCustomer && (
        <div
          onClick={() => setSelectedCustomer(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            backdropFilter: 'blur(1px)',
            zIndex: 99998,
            transition: 'opacity 0.25s ease'
          }}
        />
      )}

      {/* Sliding Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: selectedCustomer ? 0 : '-100%',
          width: '550px',
          maxWidth: '100vw',
          height: '100vh',
          backgroundColor: '#ffffff',
          boxShadow: '-8px 0 30px rgba(0, 0, 0, 0.12)',
          zIndex: 99999,
          transition: 'right 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid var(--border-primary)'
        }}
      >
        {selectedCustomer && (
          <>
            {/* Drawer Header */}
            <div
              style={{
                padding: '24px',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                backgroundColor: 'var(--bg-secondary)'
              }}
            >
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedCustomer.name}</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{selectedCustomer.companyName || 'Persona Física'}</p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <Button size="sm" variant="outline" onClick={() => openEdit(selectedCustomer)}>Editar Datos</Button>
                  <Button
                    size="sm"
                    icon={<ShoppingBag size={12} />}
                    onClick={() => {
                      navigate(`/${companySlug}/ventas?customerId=${selectedCustomer.id}`);
                      setSelectedCustomer(null);
                    }}
                  >
                    Crear Venta
                  </Button>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  color: 'var(--text-tertiary)'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* General Info & Metrics Grid */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', borderBottom: '1px solid var(--border-primary)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                <div><strong>RFC:</strong> {selectedCustomer.rfc || 'No registrado'}</div>
                <div><strong>Teléfono:</strong> {selectedCustomer.phone || '-'}</div>
                <div><strong>Email:</strong> <span style={{ fontSize: '12px' }}>{selectedCustomer.email}</span></div>
                <div><strong>Método Pago:</strong> {selectedCustomer.paymentMethod || 'SPEI'}</div>
                <div style={{ gridColumn: 'span 2' }}><strong>Dirección:</strong> {selectedCustomer.address || 'No registrada'}</div>
              </div>

              {/* Commercial Metrics Badges */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  textAlign: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Pedidos</div>
                  <div style={{ fontSize: '15px', fontWeight: 700 }}>{totalSalesCount}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Comprado</div>
                  <div style={{ fontSize: '15px', fontWeight: 700 }}>${Math.round(totalAmountBought).toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Saldo Pend.</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: selectedCustomer.balancePending > 0 ? 'var(--danger)' : 'var(--success)' }}>
                    ${Math.round(selectedCustomer.balancePending).toLocaleString()}
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--border-primary)', gridColumn: 'span 3', paddingTop: '8px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <span>Ticket Promedio: <strong>${Math.round(ticketPromedio).toLocaleString()}</strong></span>
                  <span>Última Compra: <strong>{lastPurchaseDate}</strong></span>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid var(--border-primary)',
                backgroundColor: 'var(--bg-secondary)',
                position: 'sticky',
                top: 0,
                zIndex: 10
              }}
            >
              <button
                onClick={() => setDrawerTab('pedidos')}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  background: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: drawerTab === 'pedidos' ? 'var(--brand-primary)' : 'var(--text-secondary)',
                  borderBottom: drawerTab === 'pedidos' ? '2px solid var(--brand-primary)' : 'none',
                  cursor: 'pointer'
                }}
              >
                Pedidos ({totalSalesCount})
              </button>
              <button
                onClick={() => setDrawerTab('precios')}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  background: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: drawerTab === 'precios' ? 'var(--brand-primary)' : 'var(--text-secondary)',
                  borderBottom: drawerTab === 'precios' ? '2px solid var(--brand-primary)' : 'none',
                  cursor: 'pointer'
                }}
              >
                Historial Compras ({Object.keys(groupedPrices).length})
              </button>
              <button
                onClick={() => setDrawerTab('personalizados')}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  background: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: drawerTab === 'personalizados' ? 'var(--brand-primary)' : 'var(--text-secondary)',
                  borderBottom: drawerTab === 'personalizados' ? '2px solid var(--brand-primary)' : 'none',
                  cursor: 'pointer'
                }}
              >
                Precios Clientes ({customPrices.length})
              </button>
            </div>

            {/* Tab Content (Independent scroll) */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              {drawerTab === 'pedidos' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-tertiary)' }} />
                    <input
                      type="text"
                      placeholder="Buscar pedidos..."
                      value={salesSearch}
                      onChange={(e) => setSalesSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px 6px 30px',
                        fontSize: '12px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-primary)',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {filteredSales.map((sale) => {
                    const isExpanded = expandedOrderId === sale.id;
                    return (
                      <div
                        key={sale.id}
                        style={{
                          border: '1px solid var(--border-primary)',
                          borderRadius: 'var(--radius-md)',
                          overflow: 'hidden',
                          backgroundColor: '#ffffff'
                        }}
                      >
                        <div
                          onClick={() => setExpandedOrderId(isExpanded ? null : sale.id)}
                          style={{
                            padding: '12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            backgroundColor: isExpanded ? 'var(--bg-secondary)' : 'transparent'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brand-primary)' }}>
                                {sale.folio || sale.id.substring(0, 8)}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                {sale.createdAt.split('T')[0]} • {sale.items.length} prod • {sale.paymentMethod}
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '13px', fontWeight: 700 }}>
                              ${sale.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </div>
                            <span style={{ fontSize: '10px', color: sale.status === 'paid' ? 'var(--success)' : 'var(--warning)', fontWeight: 600 }}>
                              {sale.status === 'paid' ? 'Cobrada' : 'Pendiente'}
                            </span>
                          </div>
                        </div>

                        {isExpanded && (
                          <div style={{ padding: '12px', borderTop: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-primary)', color: 'var(--text-tertiary)' }}>
                                  <th style={{ padding: '4px' }}>Producto</th>
                                  <th style={{ padding: '4px', textAlign: 'center' }}>Cant.</th>
                                  <th style={{ padding: '4px', textAlign: 'right' }}>Precio</th>
                                  <th style={{ padding: '4px', textAlign: 'right' }}>Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sale.items.map((item, i) => (
                                  <tr key={i} style={{ borderBottom: '1px dotted var(--border-primary)' }}>
                                    <td style={{ padding: '6px 4px', fontWeight: 500 }}>{item.productName}</td>
                                    <td style={{ padding: '6px 4px', textAlign: 'center' }}>{item.quantity}</td>
                                    <td style={{ padding: '6px 4px', textAlign: 'right' }}>${item.price.toFixed(2)}</td>
                                    <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 600 }}>${item.total.toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {sale.notes && (
                              <div style={{ fontSize: '11px', marginTop: '10px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                <strong>Notas:</strong> {sale.notes}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {filteredSales.length === 0 && (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>
                      No se encontraron pedidos.
                    </div>
                  )}
                </div>
              )}

              {drawerTab === 'precios' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-tertiary)' }} />
                    <input
                      type="text"
                      placeholder="Buscar por nombre..."
                      value={pricesSearch}
                      onChange={(e) => setPricesSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px 6px 30px',
                        fontSize: '12px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-primary)',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {filteredPrices.map((p) => {
                    const isExpanded = expandedProductPriceId === p.productId;
                    return (
                      <div
                        key={p.productId}
                        style={{
                          border: '1px solid var(--border-primary)',
                          borderRadius: 'var(--radius-md)',
                          overflow: 'hidden',
                          backgroundColor: '#ffffff'
                        }}
                      >
                        <div
                          onClick={() => setExpandedProductPriceId(isExpanded ? null : p.productId)}
                          style={{
                            padding: '12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            backgroundColor: isExpanded ? 'var(--bg-secondary)' : 'transparent'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <span style={{ fontSize: '13px', fontWeight: 600 }}>{p.productName}</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Último Precio:</span>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--brand-primary)' }}>
                              ${p.latestPrice.toFixed(2)}
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div style={{ padding: '12px', borderTop: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}>
                            <div style={{ fontSize: '11px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                              Historial de Precios Cobrados
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {p.history.map((hist, index) => (
                                <div
                                  key={index}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '11px',
                                    padding: '4px 0',
                                    borderBottom: '1px dotted var(--border-primary)'
                                  }}
                                >
                                  <span style={{ color: 'var(--text-secondary)' }}>
                                    {hist.createdAt.split('T')[0]} ({hist.quantity} pzas)
                                  </span>
                                  <strong style={{ color: 'var(--text-primary)' }}>
                                    ${hist.price.toFixed(2)}
                                  </strong>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tab 3: Precios Personalizados */}
              {drawerTab === 'personalizados' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Actions Header */}
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-tertiary)' }} />
                      <input
                        type="text"
                        placeholder="Buscar precios personalizados..."
                        value={customPricesSearch}
                        onChange={(e) => setCustomPricesSearch(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 10px 6px 30px',
                          fontSize: '12px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-primary)',
                          outline: 'none'
                        }}
                      />
                    </div>
                    <Button
                      size="sm"
                      icon={<Plus size={12} />}
                      onClick={() => {
                        setCpProductId(products.length > 0 ? products[0].id : '');
                        setCpGroupId(groups.length > 0 ? groups[0].id : '');
                        setCpPrice(0);
                        setIsCpModalOpen(true);
                      }}
                    >
                      Agregar Producto
                    </Button>
                  </div>

                  {/* List of custom prices */}
                  {filteredCustomPrices.map((cp) => {
                    const isExpanded = expandedCustomPriceId === cp.id;
                    const historyList = cpHistoryMap[cp.productId] || [];
                    const grpName = groups.find(g => g.id === cp.groupId)?.name || 'General';
                    return (
                      <div
                        key={cp.id}
                        style={{
                          border: '1px solid var(--border-primary)',
                          borderRadius: 'var(--radius-md)',
                          overflow: 'hidden',
                          backgroundColor: '#ffffff'
                        }}
                      >
                        {/* Summary Row */}
                        <div
                          style={{
                            padding: '12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: isExpanded ? 'var(--bg-secondary)' : 'transparent'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                               onClick={() => {
                                 const nextVal = isExpanded ? null : cp.id;
                                 setExpandedCustomPriceId(nextVal);
                                 if (nextVal && selectedCustomer) {
                                   loadCustomPriceHistory(selectedCustomer.id, cp.productId);
                                 }
                               }}
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <div>
                              <span style={{ fontSize: '13px', fontWeight: 600 }}>{cp.productName}</span>
                              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                                Grupo: {grpName} • Act: {cp.updatedAt.split('T')[0]}
                              </div>
                              {cp.lastSalePrice && (
                                <div style={{ fontSize: '10px', color: 'var(--brand-primary)', marginTop: '2px' }}>
                                  Última Venta: ${cp.lastSalePrice.toFixed(2)} el {cp.lastSaleDate}
                                </div>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Precio Especial:</span>
                              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--success)' }}>
                                ${cp.price.toFixed(2)}/{cp.unit || 'kg'}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                onClick={() => {
                                  setCpProductId(cp.productId);
                                  const prod = products.find(p => p.id === cp.productId);
                                  setCpGroupId(prod?.groupId || '');
                                  setCpPrice(cp.price);
                                  setIsCpModalOpen(true);
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '4px',
                                  color: 'var(--text-secondary)'
                                }}
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteCustomPrice(cp.id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '4px',
                                  color: 'var(--danger)'
                                }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Audit Log / Price Changes History */}
                        {isExpanded && (
                          <div style={{ padding: '12px', borderTop: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}>
                            <div style={{ fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                              <History size={12} /> Historial de Cambios de Lista de Precios
                            </div>
                            {historyList.length === 0 ? (
                              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', padding: '4px 0' }}>No hay cambios registrados.</div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {historyList.map((hist, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      fontSize: '11px',
                                      padding: '4px 0',
                                      borderBottom: '1px dotted var(--border-primary)'
                                    }}
                                  >
                                    <span style={{ color: 'var(--text-secondary)' }}>
                                      {hist.createdAt.split('T')[0]} • Modificó: {hist.userName || 'Sistema'}
                                    </span>
                                    <strong style={{ color: 'var(--text-primary)' }}>
                                      {hist.oldPrice ? `$${hist.oldPrice.toFixed(2)}` : 'Ninguno'} → ${hist.newPrice.toFixed(2)}
                                    </strong>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {filteredCustomPrices.length === 0 && (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>
                      No hay precios especiales asignados.
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Customer Form Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editCustomer ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
        footer={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button style={{ flex: 1 }} onClick={handleSave}>Guardar Cliente</Button>
          </div>
        }
      >
        <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input label="Nombre del Cliente *" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ej. Juan Pérez" />
          <Input label="Empresa" value={formCompany} onChange={(e) => setFormCompany(e.target.value)} placeholder="Ej. Empaques México S.A." />
          <Input label="Correo Electrónico *" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="Ej. correo@empresa.com" />
          <Input label="Teléfono" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="Ej. 5512345678" />
          <Input label="Dirección Física" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="Calle, Número, Colonia, CP" />
          <Input label="RFC" value={formRfc} onChange={(e) => setFormRfc(e.target.value)} placeholder="Ej. XAXX010101000" />
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <Select
              label="Método de Pago Preferido"
              value={formPaymentMethod}
              onChange={(e) => setFormPaymentMethod(e.target.value)}
              options={[
                { value: 'Transferencia SPEI', label: 'Transferencia SPEI' },
                { value: 'Tarjeta de Crédito', label: 'Tarjeta de Crédito' },
                { value: 'Efectivo', label: 'Efectivo' }
              ]}
            />
            <Input
              label="Saldo Pendiente Inicial ($)"
              type="number"
              value={formBalancePending}
              onChange={(e) => setFormBalancePending(Number(e.target.value))}
            />
          </div>

          <Input label="Notas Internas" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Comentarios adicionales" />
        </form>
      </Modal>

      {/* Custom Prices Form Modal */}
      <Modal
        isOpen={isCpModalOpen}
        onClose={() => setIsCpModalOpen(false)}
        title="Asignar Precio Personalizado"
        footer={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="outline" onClick={() => setIsCpModalOpen(false)}>Cancelar</Button>
            <Button style={{ flex: 1 }} onClick={handleSaveCustomPrice}>Guardar Precio</Button>
          </div>
        }
      >
        <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Select
            label="Grupo de Productos"
            value={cpGroupId}
            onChange={(e) => {
              setCpGroupId(e.target.value);
              const firstInGroup = products.find(p => p.groupId === e.target.value);
              setCpProductId(firstInGroup ? firstInGroup.id : '');
            }}
            options={groups.map(g => ({ value: g.id, label: g.name }))}
          />

          <Select
            label="Producto"
            value={cpProductId}
            onChange={(e) => setCpProductId(e.target.value)}
            options={products
              .filter(p => p.groupId === cpGroupId)
              .map(p => ({ value: p.id, label: `${p.name} (General: $${p.price}/${p.unit})` }))
            }
          />

          <Input
            label="Precio Especial ($)"
            type="number"
            value={cpPrice}
            onChange={(e) => setCpPrice(Number(e.target.value))}
            placeholder="Ingresa el precio especial"
          />
        </form>
      </Modal>
    </div>
  );
};
