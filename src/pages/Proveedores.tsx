import React, { useEffect, useState } from 'react';
import { DataTable } from '../components/DataTable';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { contactsService } from '../services/contacts.service';
import { Supplier } from '../types';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export const Proveedores: React.FC = () => {
  const { company } = useAuth();
  const { showToast } = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Form State
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [formCompany, setFormCompany] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formRfc, setFormRfc] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState('Transferencia');
  const [formCreditTerms, setFormCreditTerms] = useState(0);
  const [formNotes, setFormNotes] = useState('');

  const loadData = async () => {
    const list = await contactsService.getSuppliers();
    setSuppliers(list);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNew = () => {
    setEditSupplier(null);
    setFormCompany('');
    setFormContact('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormRfc('');
    setFormPaymentMethod('Transferencia');
    setFormCreditTerms(30);
    setFormNotes('');
    setIsOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditSupplier(supplier);
    setFormCompany(supplier.companyName);
    setFormContact(supplier.contactName || '');
    setFormPhone(supplier.phone || '');
    setFormEmail(supplier.email);
    setFormAddress(supplier.address || '');
    setFormRfc(supplier.rfc || '');
    setFormPaymentMethod(supplier.paymentMethod || 'Transferencia');
    setFormCreditTerms(supplier.creditTermsDays || 0);
    setFormNotes(supplier.notes || '');
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este proveedor?')) {
      await contactsService.deleteSupplier(id);
      showToast('success', 'Proveedor eliminado', 'Se quitó el proveedor correctamente.');
      loadData();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCompany || !formEmail) {
      showToast('warning', 'Campos vacíos', 'Nombre de empresa y correo son obligatorios.');
      return;
    }

    const payload: Supplier = {
      id: editSupplier ? editSupplier.id : `supp-${Math.random().toString(36).substr(2, 9)}`,
      companyId: company?.id || 'comp-1',
      companyName: formCompany,
      contactName: formContact,
      phone: formPhone,
      email: formEmail,
      address: formAddress,
      rfc: formRfc,
      paymentMethod: formPaymentMethod,
      creditTermsDays: Number(formCreditTerms),
      notes: formNotes,
      createdAt: editSupplier ? editSupplier.createdAt : new Date().toISOString()
    };

    await contactsService.saveSupplier(payload);
    showToast('success', editSupplier ? 'Proveedor modificado' : 'Proveedor creado', 'Los datos del proveedor fueron guardados.');
    setIsOpen(false);
    loadData();
  };

  const columns = [
    { header: 'Empresa', accessor: (s: Supplier) => (
      <div>
        <div style={{ fontWeight: 600 }}>{s.companyName}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>RFC: {s.rfc || 'No registrado'}</div>
      </div>
    ) },
    { header: 'Contacto', accessor: (s: Supplier) => s.contactName || '-' },
    { header: 'Teléfono', accessor: (s: Supplier) => s.phone || '-' },
    { header: 'Correo', accessor: (s: Supplier) => s.email },
    { header: 'Crédito', accessor: (s: Supplier) => `${s.creditTermsDays} días` },
    { header: 'Acciones', accessor: (s: Supplier) => (
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button variant="outline" size="sm" onClick={() => openEdit(s)}><Edit2 size={12} /></Button>
        <Button variant="danger" size="sm" onClick={() => handleDelete(s.id)}><Trash2 size={12} /></Button>
      </div>
    ) }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Proveedores</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Gestiona tu red de abastecimiento y condiciones de crédito</p>
        </div>
        <Button onClick={openNew} icon={<Plus size={16} />}>Nuevo Proveedor</Button>
      </div>

      <DataTable
        data={suppliers}
        columns={columns}
        onSearch={(q) => {
          return suppliers.some((s) => s.companyName.toLowerCase().includes(q.toLowerCase()));
        }}
      />

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
        footer={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar</Button>
          </div>
        }
      >
        <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input label="Razón Social / Empresa" value={formCompany} onChange={(e) => setFormCompany(e.target.value)} required />
          <Input label="Contacto Principal" value={formContact} onChange={(e) => setFormContact(e.target.value)} />
          <div style={{ display: 'flex', gap: '12px' }}>
            <Input label="Teléfono" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
            <Input label="Correo" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} required />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Input label="RFC" value={formRfc} onChange={(e) => setFormRfc(e.target.value)} />
            <Input label="Plazo Crédito (Días)" type="number" value={formCreditTerms} onChange={(e) => setFormCreditTerms(Number(e.target.value))} />
          </div>
          <Select
            label="Método de Pago Preferido"
            value={formPaymentMethod}
            onChange={(e) => setFormPaymentMethod(e.target.value)}
            options={[
              { value: 'Transferencia', label: 'Transferencia Bancaria SPEI' },
              { value: 'Efectivo', label: 'Efectivo' },
              { value: 'Cheque', label: 'Cheque Operativo' },
              { value: 'Tarjeta', label: 'Tarjeta de Crédito Corporativa' }
            ]}
          />
          <Input label="Dirección Física" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} />
          <Input label="Observaciones" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
        </form>
      </Modal>
    </div>
  );
};
