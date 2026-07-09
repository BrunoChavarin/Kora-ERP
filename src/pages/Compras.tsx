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
import { contactsService } from '../services/contacts.service';
import { productsService } from '../services/products.service';
import { Purchase, Supplier, Product, PurchaseItem, ProductGroup } from '../types';
import { Plus } from 'lucide-react';

export const Compras: React.FC = () => {
  const { company } = useAuth();
  const { showToast } = useToast();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [isOpen, setIsOpen] = useState(false);

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
    const sList = await contactsService.getSuppliers();
    setSuppliers(sList);
    const prList = await productsService.getAll();
    setProducts(prList);
    const gList = await productsService.getGroups();
    setGroups(gList);

    if (sList.length > 0) setSelectedSupplierId(sList[0].id);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Órdenes de Compra</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Ingresa tus órdenes de compra para actualizar inventarios automáticamente al ser recibidas</p>
        </div>
        <Button onClick={openNewOrderModal} icon={<Plus size={16} />}>Registrar Órden</Button>
      </div>

      <DataTable data={purchases} columns={columns} />

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
