import React, { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Badge } from '../components/Badge';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { financeService } from '../services/finance.service';
import { BankAccount, Transaction } from '../types';
import { Plus, ArrowUpRight, ArrowDownRight, RefreshCw, BarChart2 } from 'lucide-react';

export const Finanzas: React.FC = () => {
  const { company } = useAuth();
  const { showToast } = useToast();

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // New Transaction Form State
  const [formType, setFormType] = useState<'income' | 'expense' | 'transfer'>('income');
  const [formAccountId, setFormAccountId] = useState('');
  const [formAmount, setFormAmount] = useState(0);
  const [formCategory, setFormCategory] = useState('Ventas');
  const [formDescription, setFormDescription] = useState('');
  const [formReferenceId, setFormReferenceId] = useState(''); // transfer dest account

  const loadData = async () => {
    const accList = await financeService.getAccounts();
    setAccounts(accList);
    const txList = await financeService.getTransactions();
    setTransactions(txList);

    if (accList.length > 0) {
      setFormAccountId(accList[0].id);
      setFormReferenceId(accList[1]?.id || '');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formAmount <= 0) {
      showToast('warning', 'Monto inválido', 'El importe debe ser mayor a 0.');
      return;
    }

    await financeService.createTransaction({
      companyId: company?.id || 'comp-1',
      accountId: formAccountId,
      type: formType,
      amount: Number(formAmount),
      category: formCategory,
      description: formDescription || (formType === 'transfer' ? 'Transferencia interna' : formCategory),
      referenceId: formType === 'transfer' ? formReferenceId : undefined,
      date: new Date().toISOString().split('T')[0]
    });

    showToast('success', 'Movimiento asentado', 'El saldo de las cuentas fue actualizado.');
    setIsOpen(false);
    setFormAmount(0);
    setFormDescription('');
    loadData();
  };

  // Calculations
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const incomeTotal = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expenseTotal = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  const columns = [
    { header: 'Descripción', accessor: (t: Transaction) => t.description || t.category },
    { header: 'Categoría', accessor: (t: Transaction) => t.category },
    { header: 'Cuenta', accessor: (t: Transaction) => accounts.find(a => a.id === t.accountId)?.name || '-' },
    { header: 'Fecha', accessor: (t: Transaction) => t.date },
    { header: 'Monto', accessor: (t: Transaction) => (
      <span style={{ fontWeight: 600, color: t.type === 'income' ? 'var(--success)' : t.type === 'expense' ? 'var(--danger)' : 'var(--text-secondary)' }}>
        {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : '⇄'} ${t.amount.toLocaleString()}
      </span>
    ) }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Finanzas & Tesorería</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Gestiona cuentas de caja, bancos y monitorea el flujo de efectivo</p>
        </div>
        <Button onClick={() => setIsOpen(true)} icon={<Plus size={16} />}>Registrar Movimiento</Button>
      </div>

      {/* Stats Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <Card title="Saldo Disponible Total" subtitle="Suma de caja y cuentas de banco">
          <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--brand-primary)' }}>
            ${totalBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
        </Card>
        <Card title="Ingresos Totales" subtitle="Depósitos y ventas cobradas">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '20px', fontWeight: 600, color: 'var(--success)' }}>
              +${incomeTotal.toLocaleString('es-MX')}
            </span>
            <ArrowUpRight size={20} style={{ color: 'var(--success)' }} />
          </div>
        </Card>
        <Card title="Egresos Totales" subtitle="Pagos y compras liquidadas">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '20px', fontWeight: 600, color: 'var(--danger)' }}>
              -${expenseTotal.toLocaleString('es-MX')}
            </span>
            <ArrowDownRight size={20} style={{ color: 'var(--danger)' }} />
          </div>
        </Card>
      </div>

      {/* Account Balances section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }} className="finance-layout-grid">
        {/* Bank accounts list */}
        <Card title="Cuentas & Saldos por Cuenta" subtitle="Monitoreo de efectivo y tarjetas">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            {accounts.map(acc => (
              <div
                key={acc.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-sm)',
                  background: '#ffffff'
                }}
              >
                <div>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>{acc.name}</span>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    {acc.type} {acc.accountNumber && `• ${acc.accountNumber}`}
                  </div>
                </div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: acc.balance >= 0 ? 'var(--text-primary)' : 'var(--danger)' }}>
                  ${acc.balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Transactions ledger */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Historial de Movimientos</h3>
          <DataTable data={transactions} columns={columns} />
        </div>
      </div>

      {/* Quick Transaction Dialog */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Registrar Movimiento / Transacción"
        footer={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Asentar Movimiento</Button>
          </div>
        }
      >
        <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Select
            label="Tipo de Movimiento"
            value={formType}
            onChange={(e) => setFormType(e.target.value as any)}
            options={[
              { value: 'income', label: 'Ingreso (+)' },
              { value: 'expense', label: 'Egreso (-)' },
              { value: 'transfer', label: 'Transferencia interna (⇄)' }
            ]}
          />

          <div style={{ display: 'flex', gap: '12px' }}>
            <Select
              label={formType === 'transfer' ? 'Cuenta Origen' : 'Cuenta'}
              value={formAccountId}
              onChange={(e) => setFormAccountId(e.target.value)}
              options={accounts.map(a => ({ value: a.id, label: a.name }))}
            />
            {formType === 'transfer' && (
              <Select
                label="Cuenta Destino"
                value={formReferenceId}
                onChange={(e) => setFormReferenceId(e.target.value)}
                options={accounts.filter(a => a.id !== formAccountId).map(a => ({ value: a.id, label: a.name }))}
              />
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Input
              label="Importe ($)"
              type="number"
              value={formAmount}
              onChange={(e) => setFormAmount(Number(e.target.value))}
            />
            {formType !== 'transfer' && (
              <Select
                label="Categoría"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                options={
                  formType === 'income'
                    ? [
                        { value: 'Ventas', label: 'Cobro de Ventas' },
                        { value: 'Aportaciones', label: 'Aportación Capital' },
                        { value: 'Otros Ingresos', label: 'Otros Ingresos' }
                      ]
                    : [
                        { value: 'Compras', label: 'Compra Proveedores' },
                        { value: 'Renta', label: 'Renta de Oficinas' },
                        { value: 'Sueldos', label: 'Nómina / Sueldos' },
                        { value: 'Servicios', label: 'Servicios de Luz/Internet' }
                      ]
                }
              />
            )}
          </div>

          <Input label="Descripción / Concepto" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
        </form>
      </Modal>

      <style>{`
        @media (max-width: 992px) {
          .finance-layout-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
