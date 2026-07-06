import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { AuthLayout } from '../layouts/AuthLayout';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

interface RegisterProps {
  onNavigate: (view: 'login') => void;
}

export const Register: React.FC<RegisterProps> = ({ onNavigate }) => {
  const { register } = useAuth();
  const { showToast } = useToast();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password || !confirmPassword || !companyName) {
      showToast('warning', 'Campos incompletos', 'Completa todo el formulario.');
      return;
    }
    if (password !== confirmPassword) {
      showToast('danger', 'Contraseñas no coinciden', 'La contraseña y su confirmación deben ser iguales.');
      return;
    }
    setLoading(true);
    try {
      await register({ firstName, lastName, email, companyName });
      showToast('success', 'Registro exitoso', 'Tu cuenta y empresa han sido creadas.');
    } catch (err: any) {
      showToast('danger', 'Error al registrar', err.message || 'Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Crea tu cuenta ERP" subtitle="Empieza a digitalizar los procesos de tu empresa hoy">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Input label="Nombre" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          <Input label="Apellido" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </div>
        <Input
          type="email"
          label="Correo Electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nombre@empresa.com"
          required
        />
        <Input
          type="text"
          label="Nombre de la Empresa"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Mi Empresa S.A."
          required
        />
        <Input
          type="password"
          label="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
          required
        />
        <Input
          type="password"
          label="Confirmar Contraseña"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirma tu contraseña"
          required
        />

        <Button type="submit" loading={loading} style={{ width: '100%', marginTop: '8px' }}>
          Crear Cuenta & Acceder
        </Button>

        <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
          ¿Ya tienes cuenta?{' '}
          <button
            type="button"
            onClick={() => onNavigate('login')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--brand-primary)',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Inicia sesión aquí
          </button>
        </div>
      </form>
    </AuthLayout>
  );
};
