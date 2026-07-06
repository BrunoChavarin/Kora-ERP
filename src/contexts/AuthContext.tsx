import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Company } from '../types';
import { authService } from '../services/auth.service';
import { supabase } from '../config/supabase';

interface AuthContextType {
  user: User | null;
  company: Company | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ user: User; company: Company }>;
  register: (data: { firstName: string; lastName: string; email: string; password?: string; companyName: string }) => Promise<{ user: User; company: Company }>;
  logout: () => Promise<void>;
  updateCompany: (company: Company) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize and listen to session changes
  useEffect(() => {
    // 1. Initial check
    authService.getSession().then((session) => {
      if (session) {
        setUser(session.user);
        setCompany(session.company);
      } else {
        setUser(null);
        setCompany(null);
      }
      setLoading(false);
    });

    // 2. Auth State listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const sessionData = await authService.getSession();
        if (sessionData) {
          setUser(sessionData.user);
          setCompany(sessionData.company);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setCompany(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const session = await authService.login(email, password);
      setUser(session.user);
      setCompany(session.company);
      return session;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: {
    firstName: string;
    lastName: string;
    email: string;
    password?: string;
    companyName: string;
  }) => {
    setLoading(true);
    try {
      const session = await authService.register(data);
      setUser(session.user);
      setCompany(session.company);
      return session;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authService.logout();
      setUser(null);
      setCompany(null);
    } finally {
      setLoading(false);
    }
  };

  const updateCompany = async (updatedCompany: Company) => {
    const { error } = await supabase
      .from('companies')
      .update({
        name: updatedCompany.name,
        rfc: updatedCompany.rfc,
        currency: updatedCompany.currency,
        tax_rate: updatedCompany.taxRate,
        language: updatedCompany.language
      })
      .eq('id', updatedCompany.id);

    if (error) throw error;
    setCompany(updatedCompany);
  };

  const updateUser = async (updatedUser: User) => {
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: updatedUser.firstName,
        last_name: updatedUser.lastName,
        email: updatedUser.email
      })
      .eq('id', updatedUser.id);

    if (error) throw error;
    setUser(updatedUser);
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
