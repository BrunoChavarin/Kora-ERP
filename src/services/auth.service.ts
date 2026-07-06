import { supabase } from '../config/supabase';
import { User, Company } from '../types';

export const authService = {
  async getSession(): Promise<{ user: User; company: Company } | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return null;

    // Get User Profile from DB
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileErr || !profile) return null;

    // Get Company associated
    const { data: company, error: compErr } = await supabase
      .from('companies')
      .select('*')
      .eq('id', profile.company_id)
      .single();

    if (compErr || !company) return null;

    return {
      user: {
        id: profile.id,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        roleId: profile.role_id,
        companyId: profile.company_id,
        createdAt: profile.created_at
      },
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        rfc: company.rfc,
        currency: company.currency,
        taxRate: Number(company.tax_rate),
        language: company.language,
        createdAt: company.created_at
      }
    };
  },

  async login(email: string, password: string): Promise<{ user: User; company: Company }> {
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authErr || !authData.user) {
      throw new Error(authErr?.message || 'Error al iniciar sesión.');
    }

    const sessionData = await this.getSession();
    if (!sessionData) {
      throw new Error('No se encontró un perfil o empresa asociada a este usuario.');
    }

    return sessionData;
  },

  async register(data: {
    firstName: string;
    lastName: string;
    email: string;
    password?: string;
    companyName: string;
  }): Promise<{ user: User; company: Company }> {
    if (!data.password) throw new Error('Contraseña requerida');

    // Create unique slug from company name (e.g. "Acme Corp" -> "acmecorp")
    const baseSlug = data.companyName
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[^a-z0-9]/g, ''); // alphanumeric only

    const slug = `${baseSlug}${Math.floor(10 + Math.random() * 90)}`; // suffix to ensure uniqueness

    // 1. Create company first
    const { data: company, error: compErr } = await supabase
      .from('companies')
      .insert({
        name: data.companyName,
        slug,
        currency: 'MXN',
        tax_rate: 16,
        language: 'es'
      })
      .select()
      .single();

    if (compErr || !company) {
      throw new Error(compErr?.message || 'Error al crear la empresa.');
    }

    // 2. SignUp user in Supabase auth
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: data.email,
      password: data.password
    });

    if (authErr || !authData.user) {
      // rollback company creation
      await supabase.from('companies').delete().eq('id', company.id);
      throw new Error(authErr?.message || 'Error al crear el usuario.');
    }

    // 3. Create profile entry
    const { error: profileErr } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        company_id: company.id,
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        role_id: 'role-admin'
      });

    if (profileErr) {
      // rollback auth & company
      await supabase.from('companies').delete().eq('id', company.id);
      throw new Error(profileErr.message || 'Error al crear el perfil de usuario.');
    }

    // Return the session details
    return {
      user: {
        id: authData.user.id,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        roleId: 'role-admin',
        companyId: company.id,
        createdAt: new Date().toISOString()
      },
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        rfc: company.rfc,
        currency: company.currency,
        taxRate: Number(company.tax_rate),
        language: company.language,
        createdAt: company.created_at
      }
    };
  },

  async recoverPassword(email: string): Promise<boolean> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`
    });
    if (error) throw error;
    return true;
  },

  async logout(): Promise<void> {
    await supabase.auth.signOut();
  }
};
