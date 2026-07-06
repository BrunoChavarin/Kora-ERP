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
import { Sale, Customer, Product, SaleItem } from '../types';
import { Plus, Eye } from 'lucide-react';

export const Ventas: React.FC = () => {
  const { company } = useAuth();
  const { showToast } = useToast();

  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [items, setItems] = useState<SaleItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('Transferencia SPEI');
  const [status, setStatus] = useState<'paid' | 'pending' | 'partial'>('paid');
  const [invoice, setInvoice] = useState('no');
  const [notes, setNotes] = useState('');

  // Temp Select item state
  const [tempProductId, setTempProductId] = useState('');
  const [tempQty, setTempQty] = useState(1);
  const [tempPrice, setTempPrice] = useState(0);

  const loadData = async () => {
    const list = await salesService.getAll();
    setSales(list);
    const cList = await contactsService.getCustomers();
    setCustomers(cList);
    const pList = await productsService.getAll();
    setProducts(pList);

    if (cList.length > 0) setSelectedCustomerId(cList[0].id);
    if (pList.length > 0) {
      setTempProductId(pList[0].id);
      setTempPrice(pList[0].price);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleProductChange = (id: string) => {
    setTempProductId(id);
    const prod = products.find(p => p.id === id);
    if (prod) {
      setTempPrice(prod.price);
    }
  };

  const addItem = () => {
    const prod = products.find(p => p.id === tempProductId);
    if (!prod) return;

    if (prod.stock < tempQty) {
      showToast('danger', 'Stock insuficiente', `Solo quedan ${prod.stock} existencias de ${prod.name}`);
      return;
    }

    const existingIndex = items.findIndex(i => i.productId === tempProductId);
    if (existingIndex >= 0) {
      const updated = [...items];
      const current = updated[existingIndex];
      const newQty = current.quantity + tempQty;

      if (prod.stock < newQty) {
        showToast('danger', 'Stock insuficiente', `No puedes agregar más. Total en stock: ${prod.stock}`);
        return;
      }

      const sub = newQty * tempPrice;
      const taxRate = company?.taxRate || 16;
      const tot = sub * (1 + taxRate / 100);

      updated[existingIndex] = {
        ...current,
        quantity: newQty,
        price: tempPrice,
        subtotal: sub,
        total: tot
      };
      setItems(updated);
    } else {
      const sub = tempQty * tempPrice;
      const taxRate = company?.taxRate || 16;
      const tot = sub * (1 + taxRate / 100);

      const newItem: SaleItem = {
        productId: tempProductId,
        productName: prod.name,
        quantity: tempQty,
        price: tempPrice,
        taxRate,
        discount: 0,
        subtotal: sub,
        total: tot
      };
      setItems([...items, newItem]);
    }
    showToast('success', 'Producto agregado', `Se sumó ${prod.name} a la orden de venta.`);
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
      showToast('warning', 'Orden vacía', 'Agrega productos a la orden de venta.');
      return;
    }

    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer) return;

    const payload: Omit<Sale, 'id' | 'createdAt'> = {
      companyId: company?.id || 'comp-1',
      customerId: selectedCustomerId,
      customerName: customer.companyName ? `${customer.name} (${customer.companyName})` : customer.name,
      items,
      subtotal,
      tax,
      discount: 0,
      total,
      paymentMethod,
      status,
      invoice: invoice === 'yes' ? `F-${Math.floor(1000 + Math.random() * 9000)}` : 'no',
      notes
    };

    await salesService.create(payload);
    showToast('success', 'Venta Registrada', 'El stock de inventario ha disminuido y el flujo fue asentado.');
    setIsOpen(false);
    setItems([]);
    setNotes('');
    loadData();
  };

  const columns = [
    { header: 'Folio Venta', accessor: (s: Sale) => s.id },
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
    ) }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Ventas</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Registra facturas y tickets de venta afectando stock en tiempo real</p>
        </div>
        <Button onClick={() => setIsOpen(true)} icon={<Plus size={16} />}>Registrar Venta</Button>
      </div>

      <DataTable data={sales} columns={columns} />

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Registrar Nueva Venta"
        footer={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit}>Finalizar Venta</Button>
          </div>
        }
      >
        <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Select
            label="Cliente"
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            options={customers.map(c => ({ value: c.id, label: c.companyName ? `${c.name} (${c.companyName})` : c.name }))}
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
              Agregar Producto a la Orden
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
                label="Precio Unitario ($)"
                type="number"
                value={tempPrice}
                onChange={(e) => setTempPrice(Number(e.target.value))}
              />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              + Agregar Item
            </Button>
          </div>

          {/* List items added */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Artículos a vender</span>
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
                        {item.quantity} pzas x ${item.price} c/u
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
              <span>Total Venta:</span>
              <span>${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
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
