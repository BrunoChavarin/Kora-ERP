import { supabase } from '../config/supabase';
import { Sale, Transaction, CustomerPriceHistory } from '../types';
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
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(s => ({
      id: s.id,
      companyId: s.company_id,
      customerId: s.customer_id,
      customerName: s.customer_name,
      folio: s.folio,
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
      .select('company_id, first_name, last_name')
      .eq('id', session.user.id)
      .single();

    if (!profile) throw new Error('Perfil no encontrado.');
    const userName = `${profile.first_name} ${profile.last_name}`;

    // Calculate Custom Folio Component: CLIENT ID
    let clientId = 0;
    if (sale.customerId && sale.customerId !== 'generic') {
      const { data: custData, error: custErr } = await supabase
        .from('customers')
        .select('consecutive_id')
        .eq('id', sale.customerId)
        .single();
      if (!custErr && custData) {
        clientId = custData.consecutive_id || 0;
      }
    }

    // Calculate Custom Folio Component: DATE (DDMMYY)
    const dateObj = new Date();
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = String(dateObj.getFullYear()).slice(-2);
    const dateStr = `${day}${month}${year}`;

    // Calculate Custom Folio Component: ROUNDED AMOUNT
    const amountStr = Math.round(sale.total).toString();

    // Calculate Custom Folio Component: CUSTOMER PURCHASE SEQUENCE
    let nextPurchaseNumber = 1;
    if (sale.customerId && sale.customerId !== 'generic') {
      const { data: maxPurch, error: maxPurchErr } = await supabase
        .from('sales')
        .select('customer_purchase_number')
        .eq('company_id', profile.company_id)
        .eq('customer_id', sale.customerId)
        .order('customer_purchase_number', { ascending: false })
        .limit(1);
      if (maxPurchErr) throw maxPurchErr;
      if (maxPurch && maxPurch.length > 0) {
        nextPurchaseNumber = (maxPurch[0].customer_purchase_number || 0) + 1;
      }
    } else {
      const { data: maxPurch, error: maxPurchErr } = await supabase
        .from('sales')
        .select('customer_purchase_number')
        .eq('company_id', profile.company_id)
        .is('customer_id', null)
        .order('customer_purchase_number', { ascending: false })
        .limit(1);
      if (maxPurchErr) throw maxPurchErr;
      if (maxPurch && maxPurch.length > 0) {
        nextPurchaseNumber = (maxPurch[0].customer_purchase_number || 0) + 1;
      }
    }

    // Calculate Custom Folio Component: SYSTEM GLOBAL SEQUENCE
    let nextGlobalConsecutive = 1;
    const { data: maxGlobal, error: maxGlobalErr } = await supabase
      .from('sales')
      .select('global_consecutive')
      .eq('company_id', profile.company_id)
      .order('global_consecutive', { ascending: false })
      .limit(1);
    if (maxGlobalErr) throw maxGlobalErr;
    if (maxGlobal && maxGlobal.length > 0) {
      nextGlobalConsecutive = (maxGlobal[0].global_consecutive || 0) + 1;
    }

    // Assemble the unique custom folio
    const folio = `${clientId}-${dateStr}-${amountStr}-${nextPurchaseNumber}-${nextGlobalConsecutive}`;

    // 1. Insert header sale
    const { data: newSale, error: saleErr } = await supabase
      .from('sales')
      .insert({
        company_id: profile.company_id,
        customer_id: sale.customerId && sale.customerId !== 'generic' ? sale.customerId : null,
        customer_name: sale.customerName,
        folio,
        customer_purchase_number: nextPurchaseNumber,
        global_consecutive: nextGlobalConsecutive,
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

    // 3. Register stock movement & decrease stock, and log to customer_prices_history
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

        // Insert into customer_prices_history
        await supabase
          .from('customer_prices_history')
          .insert({
            company_id: profile.company_id,
            customer_id: sale.customerId && sale.customerId !== 'generic' ? sale.customerId : null,
            product_id: item.productId,
            sale_id: newSale.id,
            price: item.price,
            quantity: item.quantity,
            user_name: userName
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
            description: `Venta registrada - Folio ${folio}`,
            reference_id: newSale.id,
            date: new Date().toISOString().split('T')[0]
          });
      }
    } else if (sale.status === 'pending' && sale.customerId && sale.customerId !== 'generic') {
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
      folio: newSale.folio,
      createdAt: newSale.created_at
    };
  },

  async getLastPriceForCustomer(customerId: string, productId: string): Promise<number | null> {
    if (!customerId || customerId === 'generic') return null;

    const { data, error } = await supabase
      .from('customer_prices_history')
      .select('price')
      .eq('customer_id', customerId)
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error(error);
      return null;
    }

    return data && data.length > 0 ? Number(data[0].price) : null;
  },

  async getCustomerPriceHistory(customerId: string): Promise<CustomerPriceHistory[]> {
    const { data, error } = await supabase
      .from('customer_prices_history')
      .select('*, products(name), sales(folio)')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(h => ({
      id: h.id,
      companyId: h.company_id,
      customerId: h.customer_id,
      productId: h.product_id,
      saleId: h.sale_id,
      price: Number(h.price),
      quantity: Number(h.quantity),
      userName: h.user_name,
      createdAt: h.created_at,
      productName: h.products?.name || 'Producto Desconocido',
      saleFolio: h.sales?.folio
    }));
  },

  async getAllCustomerPriceHistory(): Promise<CustomerPriceHistory[]> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return [];

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', session.user.id)
      .single();

    if (!profile) return [];

    const { data, error } = await supabase
      .from('customer_prices_history')
      .select('*, products(name), customers(name, company_name), sales(folio)')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(h => ({
      id: h.id,
      companyId: h.company_id,
      customerId: h.customer_id,
      productId: h.product_id,
      saleId: h.sale_id,
      price: Number(h.price),
      quantity: Number(h.quantity),
      userName: h.user_name,
      createdAt: h.created_at,
      productName: h.products?.name || 'Producto Desconocido',
      customerName: h.customers ? (h.customers.company_name ? `${h.customers.name} (${h.customers.company_name})` : h.customers.name) : 'Venta Genérica',
      saleFolio: h.sales?.folio
    }));
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('sales')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
