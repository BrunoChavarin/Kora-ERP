import React, { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { productsService } from '../services/products.service';
import { contactsService } from '../services/contacts.service';
import { Product, Supplier, ProductGroup } from '../types';
import { Plus, Edit2, Trash2, FolderPlus, HelpCircle } from 'lucide-react';

export const Inventarios: React.FC = () => {
  const { company } = useAuth();
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  // Product Form State
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
  const [formGroupId, setFormGroupId] = useState('');

  // Group Form State
  const [editGroup, setEditGroup] = useState<ProductGroup | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupColor, setGroupColor] = useState('#4f46e5');

  const loadData = async () => {
    try {
      const prodList = await productsService.getAll();
      setProducts(prodList);
      const groupList = await productsService.getGroups();
      setGroups(groupList);
      const suppList = await contactsService.getSuppliers();
      setSuppliers(suppList);
    } catch (err) {
      console.error('Error al cargar inventarios:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Open Product Modal (General or Specific to a Group)
  const openProductNew = (specificGroupId?: string) => {
    setEditProduct(null);
    setFormName('');
    setFormSku('');
    setFormBarcode('');
    setFormCategory('General');
    setFormSupplier(suppliers[0]?.id || '');
    setFormCost(0);
    setFormPrice(0);
    setFormStock(0);
    setFormMinStock(0);
    setFormUnit('pza');
    setFormDescription('');
    setFormStatus('active');
    setFormLocation('');
    setFormGroupId(specificGroupId || groups[0]?.id || '');
    setIsProductModalOpen(true);
  };

  const openProductEdit = (product: Product) => {
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
    setFormGroupId(product.groupId || '');
    setIsProductModalOpen(true);
  };

  const handleProductSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formSku) {
      showToast('warning', 'Campos incompletos', 'El nombre y SKU son requeridos.');
      return;
    }

    const payload: Product = {
      id: editProduct ? editProduct.id : `prod-${Math.random().toString(36).substr(2, 9)}`,
      companyId: company?.id || '',
      groupId: formGroupId || undefined,
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

    try {
      await productsService.save(payload);
      showToast(
        'success',
        editProduct ? 'Producto actualizado' : 'Producto registrado',
        `El producto ${formName} se guardó exitosamente.`
      );
      setIsProductModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('danger', 'Error al guardar', err.message || 'Intenta de nuevo.');
    }
  };

  const handleProductDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este producto?')) {
      try {
        await productsService.delete(id);
        showToast('success', 'Producto eliminado', 'El producto ha sido retirado del catálogo.');
        loadData();
      } catch (err: any) {
        showToast('danger', 'Error al eliminar', err.message || 'Intenta de nuevo.');
      }
    }
  };

  // Open Group Modal
  const openGroupNew = () => {
    setEditGroup(null);
    setGroupName('');
    setGroupDescription('');
    setGroupColor('#4f46e5');
    setIsGroupModalOpen(true);
  };

  const openGroupEdit = (group: ProductGroup) => {
    setEditGroup(group);
    setGroupName(group.name);
    setGroupDescription(group.description || '');
    setGroupColor(group.color || '#4f46e5');
    setIsGroupModalOpen(true);
  };

  const handleGroupSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName) {
      showToast('warning', 'Nombre requerido', 'Ingresa el nombre del grupo.');
      return;
    }

    try {
      await productsService.saveGroup({
        id: editGroup ? editGroup.id : undefined,
        name: groupName,
        description: groupDescription,
        color: groupColor
      });

      showToast(
        'success',
        editGroup ? 'Grupo actualizado' : 'Grupo creado',
        `El grupo de productos ${groupName} se guardó exitosamente.`
      );
      setIsGroupModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('danger', 'Error al guardar grupo', err.message || 'Intenta de nuevo.');
    }
  };

  const handleGroupDelete = async (groupId: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este grupo? Los productos quedarán sin grupo.')) {
      try {
        await productsService.deleteGroup(groupId);
        showToast('success', 'Grupo eliminado', 'El grupo ha sido retirado.');
        loadData();
      } catch (err: any) {
        showToast('danger', 'Error al eliminar grupo', err.message || 'Intenta de nuevo.');
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header View */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Inventarios por Grupo</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Administra tus productos organizados en familias, grupos y stock crítico
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button onClick={openGroupNew} variant="outline" icon={<FolderPlus size={16} />}>
            Nuevo Grupo
          </Button>
          <Button onClick={() => openProductNew()} icon={<Plus size={16} />}>
            Agregar Producto
          </Button>
        </div>
      </div>

      {/* Grid of Product Groups */}
      {groups.length === 0 ? (
        <div
          style={{
            padding: '48px',
            textAlign: 'center',
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-primary)',
            color: 'var(--text-tertiary)'
          }}
        >
          <HelpCircle size={48} style={{ margin: '0 auto 12px', color: 'var(--border-primary)' }} />
          <h3>No hay grupos creados</h3>
          <p style={{ fontSize: '13px', margin: '4px 0 16px' }}>Crea tu primer grupo de productos para comenzar a organizar tu inventario.</p>
          <Button onClick={openGroupNew} size="sm">Crear Primer Grupo</Button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            alignItems: 'stretch'
          }}
          className="groups-responsive-grid"
        >
          {groups.map((group) => {
            const groupProducts = products.filter((p) => p.groupId === group.id);
            const totalStock = groupProducts.reduce((sum, p) => sum + p.stock, 0);

            return (
              <Card
                key={group.id}
                hoverable
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  height: '420px',
                  position: 'relative',
                  borderTop: `4px solid ${group.color || '#4f46e5'}`,
                  padding: '20px'
                }}
              >
                {/* Header card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                  <div style={{ overflow: 'hidden' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                      {group.name}
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '2px 0 0', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                      {group.description || 'Sin descripción'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => openGroupEdit(group)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-tertiary)',
                        padding: '4px'
                      }}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleGroupDelete(group.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--danger)',
                        padding: '4px'
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Subtitle / Stats */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    paddingBottom: '12px',
                    borderBottom: '1px solid var(--border-primary)',
                    marginBottom: '12px'
                  }}
                >
                  <span>Productos: <strong>{groupProducts.length}</strong></span>
                  <span>Stock Total: <strong>{totalStock}</strong></span>
                </div>

                {/* Inner scrollable list */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }} className="inner-products-scroll">
                  {groupProducts.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)', fontSize: '12px' }}>
                      Sin productos en este grupo.
                    </div>
                  ) : (
                    groupProducts.map((p) => {
                      const isLowStock = p.stock <= p.minStock;
                      return (
                        <div
                          key={p.id}
                          onClick={() => openProductEdit(p)}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 10px',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                          }}
                          className="product-row"
                        >
                          <span style={{ fontSize: '13px', fontWeight: 500, textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '140px' }}>
                            {p.name}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: isLowStock ? 'var(--danger)' : 'var(--text-primary)' }}>
                              {p.stock} {p.unit}
                            </span>
                            {isLowStock && <span style={{ color: 'var(--danger)', fontSize: '12px' }}>⚠️</span>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Button inside card */}
                <Button
                  onClick={() => openProductNew(group.id)}
                  variant="outline"
                  size="sm"
                  style={{ width: '100%', marginTop: 'auto' }}
                  icon={<Plus size={14} />}
                >
                  Agregar producto
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {/* 1. Modal: Create / Edit Product */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title={editProduct ? 'Editar Producto' : 'Nuevo Producto'}
        size="md"
        footer={
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setIsProductModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleProductSave}>Guardar</Button>
          </div>
        }
      >
        <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input label="Nombre del Producto" value={formName} onChange={(e) => setFormName(e.target.value)} required />
          
          <Select
            label="Grupo de Productos"
            value={formGroupId}
            onChange={(e) => setFormGroupId(e.target.value)}
            options={groups.map((g) => ({ value: g.id, label: g.name }))}
            required
          />

          <div style={{ display: 'flex', gap: '12px' }}>
            <Input label="SKU" value={formSku} onChange={(e) => setFormSku(e.target.value)} required />
            <Input label="Código de barras" value={formBarcode} onChange={(e) => setFormBarcode(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Input label="Categoría" value={formCategory} onChange={(e) => setFormCategory(e.target.value)} />
            <Select
              label="Proveedor"
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
            <Input label="Unidad de medida" value={formUnit} onChange={(e) => setFormUnit(e.target.value)} placeholder="pza, kg, rollos, cajas" />
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
          
          {editProduct && (
            <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-start' }}>
              <Button variant="danger" size="sm" onClick={() => { setIsProductModalOpen(false); handleProductDelete(editProduct.id); }}>
                Eliminar Producto
              </Button>
            </div>
          )}
        </form>
      </Modal>

      {/* 2. Modal: Create / Edit Group */}
      <Modal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        title={editGroup ? 'Editar Grupo' : 'Nuevo Grupo de Productos'}
        size="sm"
        footer={
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setIsGroupModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleGroupSave}>Guardar Grupo</Button>
          </div>
        }
      >
        <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input label="Nombre del Grupo" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Bolsas de Basura" required />
          <Input label="Descripción" value={groupDescription} onChange={(e) => setGroupDescription(e.target.value)} placeholder="Bolsas de polietileno de diferentes medidas" />
          
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>Color del Grupo</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="color"
                value={groupColor}
                onChange={(e) => setGroupColor(e.target.value)}
                style={{
                  border: '1px solid var(--border-primary)',
                  borderRadius: '4px',
                  width: '40px',
                  height: '40px',
                  cursor: 'pointer',
                  padding: '2px',
                  backgroundColor: '#ffffff'
                }}
              />
              <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{groupColor}</span>
            </div>
          </div>
        </form>
      </Modal>

      {/* Styles for responsive grids and row hover */}
      <style>{`
        .product-row:hover {
          background-color: var(--bg-tertiary) !important;
        }
        .inner-products-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .inner-products-scroll::-webkit-scrollbar-thumb {
          background-color: var(--border-primary);
          border-radius: 2px;
        }
        @media (max-width: 992px) {
          .groups-responsive-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 600px) {
          .groups-responsive-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
