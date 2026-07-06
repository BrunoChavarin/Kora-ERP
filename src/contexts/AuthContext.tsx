import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Company } from '../types';
import { authService } from '../services/auth.service';

interface AuthContextType {
  user: User | null;
  company: Company | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { firstName: string; lastName: string; email: string; companyName: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateCompany: (company: Company) => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService.getSession().then((session) => {
      if (session) {
        setUser(session.user);
        setCompany(session.company);
      }
      setLoading(false);
    });
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const session = await authService.login(email, password);
      setUser(session.user);
      setCompany(session.company);
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: { firstName: string; lastName: string; email: string; companyName: string }) => {
    setLoading(true);
    try {
      const session = await authService.register(data);
      setUser(session.user);
      setCompany(session.company);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setCompany(null);
  };

  const updateCompany = (updatedCompany: Company) => {
    setCompany(updatedCompany);
    // sync back to session storage
    const session = { user, company: updatedCompany };
    localStorage.setItem('kora_session', JSON.stringify(session));
    localStorage.setItem('kora_company', JSON.stringify(updatedCompany));
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    const session = { user: updatedUser, company };
    localStorage.setItem('kora_session', JSON.stringify(session));
  };

  return (
    <AuthContext.Provider value={{ user, company, loading, login, register, logout, updateCompany, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
