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
import { Purchase, Supplier, Product, PurchaseItem } from '../types';
import { Plus, Eye, ShoppingCart } from 'lucide-react';

export const Compras: React.FC = () => {
  const { company } = useAuth();
  const { showToast } = useToast();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // New Purchase Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'paid' | 'pending' | 'partial'>('paid');

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

    if (sList.length > 0) setSelectedSupplierId(sList[0].id);
    if (prList.length > 0) {
      setTempProductId(prList[0].id);
      setTempCost(prList[0].cost);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleProductChange = (id: string) => {
    setTempProductId(id);
    const prod = products.find(p => p.id === id);
    if (prod) {
      setTempCost(prod.cost);
    }
  };

  const addItem = () => {
    const prod = products.find(p => p.id === tempProductId);
    if (!prod) return;

    // Check if product is already added, if so increment quantity
    const existingIndex = items.findIndex(item => item.productId === tempProductId);
    if (existingIndex >= 0) {
      const updated = [...items];
      const current = updated[existingIndex];
      const newQty = current.quantity + tempQty;
      const sub = newQty * tempCost;
      const taxRate = company?.taxRate || 16;
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
      const taxRate = company?.taxRate || 16;
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

  const subtotal = items.reduce((acc, i) => acc + i.subtotal, 0);
  const tax = items.reduce((acc, i) => acc + (i.total - i.subtotal), 0);
  const total = subtotal + tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      showToast('warning', 'Sin productos', 'Debes agregar al menos un producto a la compra.');
      return;
    }

    const supplier = suppliers.find(s => s.id === selectedSupplierId);
    if (!supplier) return;

    const payload: Omit<Purchase, 'id' | 'createdAt'> = {
      companyId: company?.id || 'comp-1',
      supplierId: selectedSupplierId,
      supplierName: supplier.companyName,
      items,
      subtotal,
      tax,
      discount: 0,
      total,
      status,
      notes
    };

    await purchasesService.create(payload);
    showToast('success', 'Compra Registrada', 'El stock de los productos ha sido incrementado en inventarios.');
    setIsOpen(false);
    setItems([]);
    setNotes('');
    loadData();
  };

  const columns = [
    { header: 'ID Compra', accessor: (p: Purchase) => p.id },
    { header: 'Proveedor', accessor: (p: Purchase) => p.supplierName },
    { header: 'Fecha', accessor: (p: Purchase) => p.createdAt.split('T')[0] },
    { header: 'Estado', accessor: (p: Purchase) => (
      <Badge variant={p.status === 'paid' ? 'success' : p.status === 'pending' ? 'warning' : 'danger'}>
        {p.status === 'paid' ? 'Pagada' : p.status === 'pending' ? 'Pendiente' : 'Parcial'}
      </Badge>
    ) },
    { header: 'Artículos', accessor: (p: Purchase) => `${p.items.reduce((sum, item) => sum + item.quantity, 0)} pzas` },
    { header: 'Total', accessor: (p: Purchase) => (
      <span style={{ fontWeight: 600 }}>
        ${p.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
      </span>
    ) }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Compras</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Ingresa tus órdenes de compra para actualizar inventarios automáticamente</p>
        </div>
        <Button onClick={() => setIsOpen(true)} icon={<Plus size={16} />}>Registrar Compra</Button>
      </div>

      <DataTable data={purchases} columns={columns} />

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Registrar Compra / Entrada de Stock"
        footer={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button style={{ flex: 1 }} onClick={handleSubmit}>Guardar Compra</Button>
          </div>
        }
      >
        <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Select
            label="Seleccionar Proveedor"
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
            options={suppliers.map(s => ({ value: s.id, label: s.companyName }))}
          />

          <div
            style={{
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              backgroundColor: 'var(--bg-secondary)'
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Agregar Producto
            </span>
            <Select
              label="Producto"
              value={tempProductId}
              onChange={(e) => handleProductChange(e.target.value)}
              options={products.map(p => ({ value: p.id, label: `${p.name} (Stock: ${p.stock})` }))}
            />
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
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Ítems en esta compra</span>
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
                        {item.quantity} pzas x ${item.cost} c/u
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
              <span>${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span>IVA ({company?.taxRate || 16}%):</span>
              <span>${tax.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 700 }}>
              <span>Total Compra:</span>
              <span>${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <Select
            label="Estado del Pago"
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            options={[
              { value: 'paid', label: 'Pagada (Registra Egreso)' },
              { value: 'pending', label: 'Pendiente (Cuenta por pagar)' },
              { value: 'partial', label: 'Parcial' }
            ]}
          />

          <Input label="Notas de la compra" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </form>
      </Modal>
    </div>
  );
};
