import React, { useEffect, useState } from 'react';
import { DataTable } from '../components/DataTable';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Drawer } from '../components/Drawer';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Badge } from '../components/Badge';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { productsService } from '../services/products.service';
import { contactsService } from '../services/contacts.service';
import { Product, Supplier } from '../types';
import { LayoutGrid, Table2, Plus, Edit2, Trash2 } from 'lucide-react';

export const Inventarios: React.FC = () => {
  const { company } = useAuth();
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isOpen, setIsOpen] = useState(false);
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Form State
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formSupplier, setFormSupplier] = useState('');
  const [formCost, setFormCost] = useState(0);
  const [formPrice, setFormPrice] = useState(0);
  const [formStock, setFormStock] = useState(0);
  const [formMinStock, setFormMinStock] = useState(0);
  const [formUnit, setFormUnit] = useState('pza');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formLocation, setFormLocation] = useState('');

  const loadData = async () => {
    const list = await productsService.getAll();
    setProducts(list);
    const suppList = await contactsService.getSuppliers();
    setSuppliers(suppList);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNew = () => {
    setEditProduct(null);
    setFormName('');
    setFormSku('');
    setFormBarcode('');
    setFormCategory('Electrónica');
    setFormSupplier(suppliers[0]?.id || '');
    setFormCost(0);
    setFormPrice(0);
    setFormStock(0);
    setFormMinStock(0);
    setFormUnit('pza');
    setFormDescription('');
    setFormStatus('active');
    setFormLocation('');
    setIsOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditProduct(product);
    setFormName(product.name);
    setFormSku(product.sku);
    setFormBarcode(product.barcode || '');
    setFormCategory(product.category);
    setFormSupplier(product.supplierId || '');
    setFormCost(product.cost);
    setFormPrice(product.price);
    setFormStock(product.stock);
    setFormMinStock(product.minStock);
    setFormUnit(product.unit);
    setFormDescription(product.description || '');
    setFormStatus(product.status);
    setFormLocation(product.location || '');
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este producto?')) {
      await productsService.delete(id);
      showToast('success', 'Producto eliminado', 'El producto ha sido retirado del catálogo.');
      loadData();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formSku) {
      showToast('warning', 'Campos incompletos', 'El nombre y SKU son campos requeridos.');
      return;
    }

    const payload: Product = {
      id: editProduct ? editProduct.id : `prod-${Math.random().toString(36).substr(2, 9)}`,
      companyId: company?.id || 'comp-1',
      name: formName,
      sku: formSku,
      barcode: formBarcode,
      category: formCategory,
      supplierId: formSupplier,
      cost: Number(formCost),
      price: Number(formPrice),
      stock: Number(formStock),
      minStock: Number(formMinStock),
      unit: formUnit,
      description: formDescription,
      status: formStatus,
      location: formLocation,
      createdAt: editProduct ? editProduct.createdAt : new Date().toISOString()
    };

    await productsService.save(payload);
    showToast(
      'success',
      editProduct ? 'Producto actualizado' : 'Producto registrado',
      `El producto ${formName} se guardó exitosamente.`
    );
    setIsOpen(false);
    loadData();
  };

  // Filter Logic
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm));
    const matchesCategory = categoryFilter ? p.category === categoryFilter : true;
    const matchesStatus = statusFilter ? p.status === statusFilter : true;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const uniqueCategories = Array.from(new Set(products.map((p) => p.category)));

  // Define Columns
  const columns = [
    { header: 'Producto', accessor: (p: Product) => (
      <div>
        <div style={{ fontWeight: 600 }}>{p.name}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>SKU: {p.sku}</div>
      </div>
    ), sortKey: 'name' as keyof Product },
    { header: 'Categoría', accessor: (p: Product) => p.category, sortKey: 'category' as keyof Product },
    { header: 'Costo', accessor: (p: Product) => `$${p.cost.toLocaleString()}` },
    { header: 'Precio', accessor: (p: Product) => `$${p.price.toLocaleString()}` },
    { header: 'Stock', accessor: (p: Product) => (
      <span style={{ fontWeight: 600, color: p.stock <= p.minStock ? 'var(--danger)' : 'var(--text-primary)' }}>
        {p.stock} {p.unit} {p.stock <= p.minStock && '⚠️'}
      </span>
    ), sortKey: 'stock' as keyof Product },
    { header: 'Estado', accessor: (p: Product) => (
      <Badge variant={p.status === 'active' ? 'success' : 'danger'}>
        {p.status === 'active' ? 'Activo' : 'Inactivo'}
      </Badge>
    ) },
    { header: 'Acciones', accessor: (p: Product) => (
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button variant="outline" size="sm" onClick={() => openEdit(p)}><Edit2 size={12} /></Button>
        <Button variant="danger" size="sm" onClick={() => handleDelete(p.id)}><Trash2 size={12} /></Button>
      </div>
    ) }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header and top tools */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Inventarios</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Administra y controla el catálogo de productos y existencias</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', display: 'flex' }}>
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '8px 12px',
                border: 'none',
                background: viewMode === 'table' ? 'var(--bg-secondary)' : '#ffffff',
                cursor: 'pointer'
              }}
            >
              <Table2 size={16} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '8px 12px',
                border: 'none',
                background: viewMode === 'grid' ? 'var(--bg-secondary)' : '#ffffff',
                cursor: 'pointer'
              }}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
          <Button onClick={openNew} icon={<Plus size={16} />}>Nuevo Producto</Button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          background: '#ffffff',
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-primary)',
          flexWrap: 'wrap'
        }}
      >
        <input
          type="text"
          placeholder="Buscar por Nombre, SKU, Código de barras..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            minWidth: '240px',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-primary)',
            fontSize: '14px',
            outline: 'none'
          }}
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-primary)',
            fontSize: '14px',
            background: '#ffffff'
          }}
        >
          <option value="">Todas las Categorías</option>
          {uniqueCategories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-primary)',
            fontSize: '14px',
            background: '#ffffff'
          }}
        >
          <option value="">Todos los Estados</option>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </select>
      </div>

      {/* Main List Render */}
      {viewMode === 'table' ? (
        <DataTable data={filteredProducts} columns={columns} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {filteredProducts.map((p) => (
            <Card key={p.id} hoverable>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>{p.category}</span>
                <Badge variant={p.status === 'active' ? 'success' : 'danger'}>
                  {p.status === 'active' ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginTop: '8px' }}>{p.name}</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>SKU: {p.sku}</p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', borderTop: '1px solid var(--border-primary)', paddingTop: '12px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Precio</span>
                  <div style={{ fontSize: '16px', fontWeight: 700 }}>${p.price.toLocaleString()}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Existencias</span>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: p.stock <= p.minStock ? 'var(--danger)' : 'var(--text-primary)' }}>
                    {p.stock} {p.unit}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <Button variant="outline" size="sm" style={{ flex: 1 }} onClick={() => openEdit(p)}>Editar</Button>
                <Button variant="danger" size="sm" onClick={() => handleDelete(p.id)}><Trash2 size={12} /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Create Product Modal Form */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editProduct ? 'Editar Producto' : 'Nuevo Producto'}
        size="md"
        footer={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar</Button>
          </div>
        }
      >
        <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input label="Nombre del Producto" value={formName} onChange={(e) => setFormName(e.target.value)} required />
          <div style={{ display: 'flex', gap: '12px' }}>
            <Input label="SKU" value={formSku} onChange={(e) => setFormSku(e.target.value)} required />
            <Input label="Código de barras" value={formBarcode} onChange={(e) => setFormBarcode(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Input label="Categoría" value={formCategory} onChange={(e) => setFormCategory(e.target.value)} />
            <Select
              label="Proveedor principal"
              value={formSupplier}
              onChange={(e) => setFormSupplier(e.target.value)}
              options={suppliers.map((s) => ({ value: s.id, label: s.companyName }))}
            />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Input label="Costo" type="number" value={formCost} onChange={(e) => setFormCost(Number(e.target.value))} />
            <Input label="Precio Venta" type="number" value={formPrice} onChange={(e) => setFormPrice(Number(e.target.value))} />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Input label="Stock Actual" type="number" value={formStock} onChange={(e) => setFormStock(Number(e.target.value))} />
            <Input label="Stock Mínimo" type="number" value={formMinStock} onChange={(e) => setFormMinStock(Number(e.target.value))} />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Input label="Unidad de medida" value={formUnit} onChange={(e) => setFormUnit(e.target.value)} placeholder="pza, kg, lit" />
            <Input label="Ubicación almacén" value={formLocation} onChange={(e) => setFormLocation(e.target.value)} />
          </div>
          <Select
            label="Estado"
            value={formStatus}
            onChange={(e) => setFormStatus(e.target.value as any)}
            options={[
              { value: 'active', label: 'Activo' },
              { value: 'inactive', label: 'Inactivo' }
            ]}
          />
          <Input label="Descripción" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
        </form>
      </Modal>
    </div>
  );
};
