import { supabase } from '../config/supabase';
import { Customer, Supplier } from '../types';

export const contactsService = {
  async getCustomers(): Promise<Customer[]> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return [];

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', session.user.id)
      .single();

    if (!profile) return [];

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('company_id', profile.company_id);

    if (error) throw error;

    return (data || []).map(c => ({
      id: c.id,
      companyId: c.company_id,
      consecutiveId: c.consecutive_id,
      name: c.name,
      companyName: c.company_name,
      email: c.email,
      phone: c.phone,
      address: c.address,
      rfc: c.rfc,
      paymentMethod: c.payment_method,
      notes: c.notes,
      balancePending: Number(c.balance_pending),
      createdAt: c.created_at
    }));
  },

  async saveCustomer(customer: Customer): Promise<Customer> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) throw new Error('No autenticado.');

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', session.user.id)
      .single();

    if (!profile) throw new Error('Perfil no encontrado.');

    const isNew = customer.id.startsWith('cust-');
    let consecutiveId = customer.consecutiveId;

    if (isNew) {
      const { data: maxData, error: maxErr } = await supabase
        .from('customers')
        .select('consecutive_id')
        .eq('company_id', profile.company_id)
        .order('consecutive_id', { ascending: false })
        .limit(1);

      if (maxErr) throw maxErr;
      const maxVal = maxData && maxData.length > 0 ? (maxData[0].consecutive_id || 0) : 0;
      consecutiveId = maxVal + 1;
    }

    const payload = {
      company_id: profile.company_id,
      consecutive_id: consecutiveId,
      name: customer.name,
      company_name: customer.companyName || null,
      email: customer.email,
      phone: customer.phone || null,
      address: customer.address || null,
      rfc: customer.rfc || null,
      payment_method: customer.paymentMethod,
      notes: customer.notes || null,
      balance_pending: customer.balancePending
    };

    if (!isNew) {
      const { error } = await supabase
        .from('customers')
        .update(payload)
        .eq('id', customer.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('customers')
        .insert(payload);
      if (error) throw error;
    }

    return {
      ...customer,
      consecutiveId
    };
  },

  async deleteCustomer(id: string): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getSuppliers(): Promise<Supplier[]> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return [];

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', session.user.id)
      .single();

    if (!profile) return [];

    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('company_id', profile.company_id);

    if (error) throw error;

    return (data || []).map(s => ({
      id: s.id,
      companyId: s.company_id,
      consecutiveId: s.consecutive_id,
      companyName: s.company_name,
      contactName: s.contact_name,
      phone: s.phone,
      email: s.email,
      address: s.address,
      rfc: s.rfc,
      paymentMethod: s.payment_method,
      creditTermsDays: Number(s.credit_terms_days),
      notes: s.notes,
      createdAt: s.created_at
    }));
  },

  async saveSupplier(supplier: Supplier): Promise<Supplier> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) throw new Error('No autenticado.');

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', session.user.id)
      .single();

    if (!profile) throw new Error('Perfil no encontrado.');

    const isNew = supplier.id.startsWith('supp-');
    let consecutiveId = supplier.consecutiveId;

    if (isNew) {
      const { data: maxData, error: maxErr } = await supabase
        .from('suppliers')
        .select('consecutive_id')
        .eq('company_id', profile.company_id)
        .order('consecutive_id', { ascending: false })
        .limit(1);

      if (maxErr) throw maxErr;
      const maxVal = maxData && maxData.length > 0 ? (maxData[0].consecutive_id || 0) : 0;
      consecutiveId = maxVal + 1;
    }

    const payload = {
      company_id: profile.company_id,
      consecutive_id: consecutiveId,
      company_name: supplier.companyName,
      contact_name: supplier.contactName || null,
      phone: supplier.phone || null,
      email: supplier.email,
      address: supplier.address || null,
      rfc: supplier.rfc || null,
      payment_method: supplier.paymentMethod,
      credit_terms_days: supplier.creditTermsDays,
      notes: supplier.notes || null
    };

    if (!isNew) {
      const { error } = await supabase
        .from('suppliers')
        .update(payload)
        .eq('id', supplier.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('suppliers')
        .insert(payload);
      if (error) throw error;
    }

    return {
      ...supplier,
      consecutiveId
    };
  },

  async deleteSupplier(id: string): Promise<void> {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
