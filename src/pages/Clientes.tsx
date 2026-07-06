import React, { useEffect, useState } from 'react';
import { DataTable } from '../components/DataTable';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { contactsService } from '../services/contacts.service';
import { Customer } from '../types';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export const Clientes: React.FC = () => {
  const { company } = useAuth();
  const { showToast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Form State
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
  };

  useEffect(() => {
    loadData();
  }, []);

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
      await contactsService.deleteCustomer(id);
      showToast('success', 'Cliente eliminado', 'Los registros se actualizaron correctamente.');
      loadData();
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

    await contactsService.saveCustomer(payload);
    showToast('success', editCustomer ? 'Cliente editado' : 'Cliente registrado', 'El cliente ha sido guardado exitosamente.');
    setIsOpen(false);
    loadData();
  };

  const columns = [
    { header: 'Cliente', accessor: (c: Customer) => (
      <div>
        <div style={{ fontWeight: 600 }}>{c.name}</div>
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Clientes</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Consulta el listado general de clientes, facturación y estados de cuenta</p>
        </div>
        <Button onClick={openNew} icon={<Plus size={16} />}>Nuevo Cliente</Button>
      </div>

      <DataTable
        data={customers}
        columns={columns}
        onSearch={(q) => {
          return customers.some((c) => c.name.toLowerCase().includes(q.toLowerCase()) || (c.companyName && c.companyName.toLowerCase().includes(q.toLowerCase())));
        }}
      />

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
        footer={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar</Button>
          </div>
        }
      >
        <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input label="Nombre Completo" value={formName} onChange={(e) => setFormName(e.target.value)} required />
          <Input label="Empresa (Opcional)" value={formCompany} onChange={(e) => setFormCompany(e.target.value)} />
          <div style={{ display: 'flex', gap: '12px' }}>
            <Input label="Correo" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} required />
            <Input label="Teléfono" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Input label="RFC" value={formRfc} onChange={(e) => setFormRfc(e.target.value)} />
            <Input label="Saldo Pendiente Inicial" type="number" value={formBalancePending} onChange={(e) => setFormBalancePending(Number(e.target.value))} />
          </div>
          <Select
            label="Método de Pago Preferido"
            value={formPaymentMethod}
            onChange={(e) => setFormPaymentMethod(e.target.value)}
            options={[
              { value: 'Transferencia SPEI', label: 'Transferencia SPEI' },
              { value: 'Tarjeta de Crédito', label: 'Tarjeta de Crédito / Débito' },
              { value: 'Efectivo', label: 'Efectivo' }
            ]}
          />
          <Input label="Dirección de Envío / Fiscal" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} />
          <Input label="Observaciones" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
        </form>
      </Modal>
    </div>
  );
};
