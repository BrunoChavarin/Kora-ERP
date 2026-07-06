import React, { useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { AuthLayout } from '../layouts/AuthLayout';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { authService } from '../services/auth.service';
import { useNavigate } from 'react-router-dom';

export const RecoverPassword: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      showToast('warning', 'Campo requerido', 'Ingresa tu correo electrónico.');
      return;
    }
    setLoading(true);
    try {
      await authService.recoverPassword(email);
      showToast(
        'success',
        'Correo enviado',
        'Te enviamos un enlace de recuperación si la cuenta existe.'
      );
      navigate('/login');
    } catch {
      showToast('danger', 'Error', 'Ocurrió un problema, intenta más tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Recupera tu contraseña"
      subtitle="Ingresa tu correo y te enviaremos las instrucciones de restablecimiento"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Input
          type="email"
          label="Correo Electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nombre@empresa.com"
          required
        />

        <Button type="submit" loading={loading} style={{ width: '100%', marginTop: '8px' }}>
          Enviar Instrucciones
        </Button>

        <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
          <button
            type="button"
            onClick={() => navigate('/login')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--brand-primary)',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Volver al inicio de sesión
          </button>
        </div>
      </form>
    </AuthLayout>
  );
};
