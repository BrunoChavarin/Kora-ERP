import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { AuthLayout } from '../layouts/AuthLayout';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

interface LoginProps {
  onNavigate: (view: 'register' | 'recover') => void;
}

export const Login: React.FC<LoginProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('admin@acme.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('warning', 'Campos incompletos', 'Ingresa correo y contraseña.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      showToast('success', 'Sesión iniciada', 'Bienvenido a Kora ERP.');
    } catch (err: any) {
      showToast('danger', 'Error de ingreso', err.message || 'Credenciales inválidas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Ingresa a tu cuenta" subtitle="Gestiona tu negocio de manera eficiente e inteligente">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Input
          type="email"
          label="Correo Electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nombre@empresa.com"
          required
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <Input
            type="password"
            label="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          <button
            type="button"
            onClick={() => onNavigate('recover')}
            style={{
              alignSelf: 'flex-end',
              background: 'transparent',
              border: 'none',
              color: 'var(--brand-primary)',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        <Button type="submit" loading={loading} style={{ width: '100%', marginTop: '8px' }}>
          Iniciar Sesión
        </Button>

        <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
          ¿No tienes una cuenta?{' '}
          <button
            type="button"
            onClick={() => onNavigate('register')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--brand-primary)',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Regístrate aquí
          </button>
        </div>
      </form>
    </AuthLayout>
  );
};
