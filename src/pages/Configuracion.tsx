import React, { useState } from 'react';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Button } from '../components/Button';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { Company, User } from '../types';

export const Configuracion: React.FC = () => {
  const { company, user, updateCompany, updateUser } = useAuth();
  const { showToast } = useToast();

  // Company Form State
  const [compName, setCompName] = useState(company?.name || '');
  const [compRfc, setCompRfc] = useState(company?.rfc || '');
  const [compTax, setCompTax] = useState(company?.taxRate || 16);
  const [compCurrency, setCompCurrency] = useState(company?.currency || 'MXN');

  // User Form State
  const [usrFirstName, setUsrFirstName] = useState(user?.firstName || '');
  const [usrLastName, setUsrLastName] = useState(user?.lastName || '');
  const [usrEmail, setUsrEmail] = useState(user?.email || '');

  // Simulator state
  const [backupLoading, setBackupLoading] = useState(false);

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!compName) return;

    const payload: Company = {
      ...company!,
      name: compName,
      rfc: compRfc,
      taxRate: Number(compTax),
      currency: compCurrency
    };

    updateCompany(payload);
    showToast('success', 'Configuración guardada', 'Los datos de la empresa se actualizaron.');
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usrFirstName || !usrEmail) return;

    const payload: User = {
      ...user!,
      firstName: usrFirstName,
      lastName: usrLastName,
      email: usrEmail
    };

    updateUser(payload);
    showToast('success', 'Perfil guardado', 'Tus datos de acceso han sido actualizados.');
  };

  const triggerBackup = () => {
    setBackupLoading(true);
    setTimeout(() => {
      setBackupLoading(false);
      showToast('success', 'Respaldo Generado', 'Se descargó el archivo JSON con toda la información local de la empresa.');
      
      // Download local DB as a JSON backup file
      const backupData: Record<string, any> = {};
      const keys = ['company', 'users', 'products', 'customers', 'suppliers', 'accounts', 'sales', 'purchases', 'transactions'];
      keys.forEach(k => {
        const val = localStorage.getItem(`kora_${k}`);
        if (val) backupData[k] = JSON.parse(val);
      });

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `kora_backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }, 1500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Configuración General</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Configura impuestos, moneda predeterminada, datos fiscales y perfiles de acceso</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Company Settings */}
        <Card title="Datos de la Empresa" subtitle="Información corporativa e impuestos facturables">
          <form onSubmit={handleSaveCompany} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            <Input label="Razón Social / Nombre" value={compName} onChange={(e) => setCompName(e.target.value)} required />
            <div style={{ display: 'flex', gap: '12px' }}>
              <Input label="RFC" value={compRfc} onChange={(e) => setCompRfc(e.target.value)} />
              <Input label="Tasa de Impuesto (IVA %)" type="number" value={compTax} onChange={(e) => setCompTax(Number(e.target.value))} />
            </div>
            <Select
              label="Moneda Predeterminada"
              value={compCurrency}
              onChange={(e) => setCompCurrency(e.target.value)}
              options={[
                { value: 'MXN', label: 'Peso Mexicano (MXN)' },
                { value: 'USD', label: 'Dólar Americano (USD)' },
                { value: 'EUR', label: 'Euro (EUR)' }
              ]}
            />
            <Button type="submit" style={{ alignSelf: 'flex-start' }}>Actualizar Empresa</Button>
          </form>
        </Card>

        {/* User Profile Settings */}
        <Card title="Mi Cuenta" subtitle="Modifica tus datos de perfil e inicio de sesión">
          <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Input label="Nombre" value={usrFirstName} onChange={(e) => setUsrFirstName(e.target.value)} required />
              <Input label="Apellido" value={usrLastName} onChange={(e) => setUsrLastName(e.target.value)} />
            </div>
            <Input label="Correo electrónico" type="email" value={usrEmail} onChange={(e) => setUsrEmail(e.target.value)} required />
            <Button type="submit" style={{ alignSelf: 'flex-start' }}>Actualizar Perfil</Button>
          </form>
        </Card>

        {/* Backup Simulator card */}
        <Card title="Respaldos y Seguridad" subtitle="Exporta toda la información almacenada en el ERP">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Al descargar un respaldo, se generará una copia completa en formato JSON que contiene el inventario, catálogo de clientes, catálogo de proveedores, transacciones y balance de cuentas registrado en este dispositivo.
            </p>
            <Button variant="outline" onClick={triggerBackup} loading={backupLoading} style={{ alignSelf: 'flex-start' }}>
              Descargar Respaldo Total
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
