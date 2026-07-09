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
import { Sale, Customer, Product, SaleItem, ProductGroup } from '../types';
import { Plus } from 'lucide-react';

export const Ventas: React.FC = () => {
  const { company } = useAuth();
  const { showToast } = useToast();

  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [isOpen, setIsOpen] = useState(false);

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

  const loadData = async () => {
    const list = await salesService.getAll();
    setSales(list);
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
        priceOrigin
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
        priceOrigin
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
      await salesService.create(payload);
      showToast('success', 'Venta Registrada', 'El stock de inventario ha disminuido y el flujo fue asentado.');
      setIsOpen(false);
      setItems([]);
      setNotes('');
      loadData();
    } catch (err: any) {
      showToast('danger', 'Error', err.message || 'Error al guardar venta.');
    }
  };

  const columns = [
    { header: 'Folio Venta', accessor: (s: Sale) => s.folio || s.id.substring(0, 8) },
    { header: 'Cliente', accessor: (s: Sale) => s.customerName },
    { header: 'Fecha', accessor: (s: Sale) => s.createdAt.split('T')[0] },
    { header: 'Factura', accessor: (s: Sale) => s.invoice === 'no' ? '-' : s.invoice },
    { header: 'Estado', accessor: (s: Sale) => (
      <Badge variant={s.status === 'paid' ? 'success' : s.status === 'pending' ? 'warning' : 'danger'}>
        {s.status === 'paid' ? 'Cobrada' : s.status === 'pending' ? 'Pendiente' : 'Parcial'}
      </Badge>
    ) },
    { header: 'Total', accessor: (s: Sale) => (
      <span style={{ fontWeight: 600 }}>
        ${s.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
      </span>
    ) },
    {
      header: 'Acciones',
      accessor: (s: Sale) => (
        <Button
          variant="danger"
          size="sm"
          onClick={async () => {
            const confirmVal = prompt('Para eliminar esta venta de forma permanente, escribe "Eliminar":');
            if (confirmVal === 'Eliminar') {
              try {
                await salesService.delete(s.id);
                showToast('success', 'Venta Eliminada', 'La venta ha sido eliminada permanentemente y el consecutivo liberado.');
                loadData();
              } catch (err: any) {
                showToast('danger', 'Error', err.message || 'No se pudo eliminar la venta.');
              }
            }
          }}
        >
          Eliminar
        </Button>
      )
    }
  ];

  const selectedGroupName = groups.find(g => g.id === selectedGroupId)?.name || 'Seleccionar Grupo...';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Ventas</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Registra y gestiona los cobros, facturación y salida de mercancía.</p>
        </div>
        <Button onClick={openNewSaleModal} icon={<Plus size={16} />}>Registrar Venta</Button>
      </div>

      <DataTable data={sales} columns={columns} />

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
    </div>
  );
};
