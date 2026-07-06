import { supabase } from '../config/supabase';
import { Sale, Transaction } from '../types';
import { productsService } from './products.service';

export const salesService = {
  async getAll(): Promise<Sale[]> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return [];

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', session.user.id)
      .single();

    if (!profile) return [];

    const { data, error } = await supabase
      .from('sales')
      .select('*, sale_items(*)')
      .eq('company_id', profile.company_id);

    if (error) throw error;

    return (data || []).map(s => ({
      id: s.id,
      companyId: s.company_id,
      customerId: s.customer_id,
      customerName: s.customer_name,
      subtotal: Number(s.subtotal),
      tax: Number(s.tax),
      discount: Number(s.discount),
      total: Number(s.total),
      paymentMethod: s.payment_method,
      status: s.status,
      invoice: s.invoice,
      notes: s.notes,
      createdAt: s.created_at,
      items: (s.sale_items || []).map((i: any) => ({
        productId: i.product_id,
        productName: i.product_name,
        quantity: Number(i.quantity),
        price: Number(i.price),
        taxRate: Number(i.tax_rate),
        discount: Number(i.discount),
        subtotal: Number(i.subtotal),
        total: Number(i.total)
      }))
    }));
  },

  async create(sale: Omit<Sale, 'id' | 'createdAt'>): Promise<Sale> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) throw new Error('No autenticado.');

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', session.user.id)
      .single();

    if (!profile) throw new Error('Perfil no encontrado.');

    // 1. Insert header sale
    const { data: newSale, error: saleErr } = await supabase
      .from('sales')
      .insert({
        company_id: profile.company_id,
        customer_id: sale.customerId || null,
        customer_name: sale.customerName,
        subtotal: sale.subtotal,
        tax: sale.tax,
        discount: sale.discount,
        total: sale.total,
        payment_method: sale.paymentMethod,
        status: sale.status,
        invoice: sale.invoice || null,
        notes: sale.notes || null
      })
      .select()
      .single();

    if (saleErr || !newSale) throw saleErr;

    // 2. Insert items
    const itemsPayload = sale.items.map(item => ({
      sale_id: newSale.id,
      product_id: item.productId || null,
      product_name: item.productName,
      quantity: item.quantity,
      price: item.price,
      tax_rate: item.taxRate,
      discount: item.discount,
      subtotal: item.subtotal,
      total: item.total
    }));

    const { error: itemsErr } = await supabase
      .from('sale_items')
      .insert(itemsPayload);

    if (itemsErr) throw itemsErr;

    // 3. Register stock movement & decrease stock
    for (const item of sale.items) {
      if (item.productId) {
        await productsService.registerMovement({
          companyId: profile.company_id,
          productId: item.productId,
          type: 'out',
          quantity: item.quantity,
          reason: 'sale',
          referenceId: newSale.id
        });
      }
    }

    // 4. Update Financial flow / Account balance if paid
    if (sale.status === 'paid') {
      const { data: accounts } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('company_id', profile.company_id);

      const defaultAccount = accounts?.[0];
      if (defaultAccount) {
        // Update balance
        const updatedBal = Number(defaultAccount.balance) + sale.total;
        await supabase
          .from('bank_accounts')
          .update({ balance: updatedBal })
          .eq('id', defaultAccount.id);

        // Insert Transaction
        await supabase
          .from('transactions')
          .insert({
            company_id: profile.company_id,
            account_id: defaultAccount.id,
            type: 'income',
            amount: sale.total,
            category: 'Ventas',
            description: `Venta registrada - Folio ${newSale.id.substring(0, 8)}`,
            reference_id: newSale.id,
            date: new Date().toISOString().split('T')[0]
          });
      }
    } else if (sale.status === 'pending' && sale.customerId) {
      // Add balance pending to customer
      const { data: customer } = await supabase
        .from('customers')
        .select('balance_pending')
        .eq('id', sale.customerId)
        .single();

      if (customer) {
        const newBal = Number(customer.balance_pending) + sale.total;
        await supabase
          .from('customers')
          .update({ balance_pending: newBal })
          .eq('id', sale.customerId);
      }
    }

    return {
      ...sale,
      id: newSale.id,
      createdAt: newSale.created_at
    };
  }
};
