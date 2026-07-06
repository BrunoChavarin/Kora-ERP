import { supabase } from '../config/supabase';
import { Purchase, Transaction } from '../types';
import { productsService } from './products.service';

export const purchasesService = {
  async getAll(): Promise<Purchase[]> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return [];

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', session.user.id)
      .single();

    if (!profile) return [];

    const { data, error } = await supabase
      .from('purchases')
      .select('*, purchase_items(*)')
      .eq('company_id', profile.company_id);

    if (error) throw error;

    return (data || []).map(p => ({
      id: p.id,
      companyId: p.company_id,
      supplierId: p.supplier_id,
      supplierName: p.supplier_name,
      subtotal: Number(p.subtotal),
      tax: Number(p.tax),
      discount: Number(p.discount),
      total: Number(p.total),
      status: p.status,
      notes: p.notes,
      createdAt: p.created_at,
      items: (p.purchase_items || []).map((i: any) => ({
        productId: i.product_id,
        productName: i.product_name,
        quantity: Number(i.quantity),
        cost: Number(i.cost),
        taxRate: Number(i.tax_rate),
        discount: Number(i.discount),
        subtotal: Number(i.subtotal),
        total: Number(i.total)
      }))
    }));
  },

  async create(purchase: Omit<Purchase, 'id' | 'createdAt'>): Promise<Purchase> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) throw new Error('No autenticado.');

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', session.user.id)
      .single();

    if (!profile) throw new Error('Perfil no encontrado.');

    // 1. Insert header purchase
    const { data: newPurch, error: purchErr } = await supabase
      .from('purchases')
      .insert({
        company_id: profile.company_id,
        supplier_id: purchase.supplierId || null,
        supplier_name: purchase.supplierName,
        subtotal: purchase.subtotal,
        tax: purchase.tax,
        discount: purchase.discount,
        total: purchase.total,
        status: purchase.status,
        notes: purchase.notes || null
      })
      .select()
      .single();

    if (purchErr || !newPurch) throw purchErr;

    // 2. Insert items
    const itemsPayload = purchase.items.map(item => ({
      purchase_id: newPurch.id,
      product_id: item.productId || null,
      product_name: item.productName,
      quantity: item.quantity,
      cost: item.cost,
      tax_rate: item.taxRate,
      discount: item.discount,
      subtotal: item.subtotal,
      total: item.total
    }));

    const { error: itemsErr } = await supabase
      .from('purchase_items')
      .insert(itemsPayload);

    if (itemsErr) throw itemsErr;

    // 3. Register stock movement & increase stock
    for (const item of purchase.items) {
      if (item.productId) {
        await productsService.registerMovement({
          companyId: profile.company_id,
          productId: item.productId,
          type: 'in',
          quantity: item.quantity,
          reason: 'purchase',
          referenceId: newPurch.id
        });
      }
    }

    // 4. Update balance (expense transaction)
    if (purchase.status === 'paid') {
      const { data: accounts } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('company_id', profile.company_id);

      const defaultAccount = accounts?.[0];
      if (defaultAccount) {
        // Deduct
        const updatedBal = Number(defaultAccount.balance) - purchase.total;
        await supabase
          .from('bank_accounts')
          .update({ balance: updatedBal })
          .eq('id', defaultAccount.id);

        // Transaction
        await supabase
          .from('transactions')
          .insert({
            company_id: profile.company_id,
            account_id: defaultAccount.id,
            type: 'expense',
            amount: purchase.total,
            category: 'Compras',
            description: `Compra registrada - Proveedor: ${purchase.supplierName}`,
            reference_id: newPurch.id,
            date: new Date().toISOString().split('T')[0]
          });
      }
    }

    return {
      ...purchase,
      id: newPurch.id,
      createdAt: newPurch.created_at
    };
  }
};
