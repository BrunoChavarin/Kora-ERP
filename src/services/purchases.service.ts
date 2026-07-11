import { supabase } from '../config/supabase';
import { Purchase, Transaction, PurchaseCostHistory } from '../types';
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
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(p => ({
      id: p.id,
      companyId: p.company_id,
      supplierId: p.supplier_id,
      supplierName: p.supplier_name,
      orderNumber: p.order_number,
      folio: p.folio,
      userName: p.user_name,
      subtotal: Number(p.subtotal),
      tax: Number(p.tax),
      discount: Number(p.discount),
      total: Number(p.total),
      status: p.status,
      notes: p.notes,
      year: p.year,
      month: p.month,
      day: p.day,
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
      .select('company_id, first_name, last_name')
      .eq('id', session.user.id)
      .single();

    if (!profile) throw new Error('Perfil no encontrado.');
    const userName = `${profile.first_name} ${profile.last_name}`;

    // Calculate Supplier Consecutive ID
    let supplierConsecutiveId = 0;
    if (purchase.supplierId) {
      const { data: suppData, error: suppErr } = await supabase
        .from('suppliers')
        .select('consecutive_id')
        .eq('id', purchase.supplierId)
        .single();
      if (!suppErr && suppData) {
        supplierConsecutiveId = suppData.consecutive_id || 0;
      }
    }

    // Calculate Date (DDMMYY)
    const dateObj = new Date();
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = String(dateObj.getFullYear()).slice(-2);
    const dateStr = `${day}${month}${year}`;

    // Calculate Rounded Total Cost
    const amountStr = Math.round(purchase.total).toString();

    // Calculate Supplier Purchase Sequence
    let nextPurchaseNumber = 1;
    if (purchase.supplierId) {
      const { data: maxPurch, error: maxPurchErr } = await supabase
        .from('purchases')
        .select('supplier_purchase_number')
        .eq('company_id', profile.company_id)
        .eq('supplier_id', purchase.supplierId)
        .order('supplier_purchase_number', { ascending: false })
        .limit(1);
      if (maxPurchErr) throw maxPurchErr;
      if (maxPurch && maxPurch.length > 0) {
        nextPurchaseNumber = (maxPurch[0].supplier_purchase_number || 0) + 1;
      }
    }

    // Calculate System Global Purchase Sequence
    let nextGlobalConsecutive = 1;
    const { data: maxGlobal, error: maxGlobalErr } = await supabase
      .from('purchases')
      .select('global_consecutive')
      .eq('company_id', profile.company_id)
      .order('global_consecutive', { ascending: false })
      .limit(1);
    if (maxGlobalErr) throw maxGlobalErr;
    if (maxGlobal && maxGlobal.length > 0) {
      nextGlobalConsecutive = (maxGlobal[0].global_consecutive || 0) + 1;
    }

    // Assemble unique purchases folio
    const folio = `${supplierConsecutiveId}-${dateStr}-${amountStr}-${nextPurchaseNumber}-${nextGlobalConsecutive}`;

    // 1. Insert header purchase
    const now = new Date();
    const yr = now.getFullYear();
    const mo = now.getMonth() + 1;
    const dy = now.getDate();

    const { data: newPurch, error: purchErr } = await supabase
      .from('purchases')
      .insert({
        company_id: profile.company_id,
        supplier_id: purchase.supplierId || null,
        supplier_name: purchase.supplierName,
        order_number: purchase.orderNumber,
        folio,
        supplier_purchase_number: nextPurchaseNumber,
        global_consecutive: nextGlobalConsecutive,
        user_name: userName,
        subtotal: purchase.subtotal,
        tax: purchase.tax,
        discount: purchase.discount,
        total: purchase.total,
        status: purchase.status,
        notes: purchase.notes || null,
        year: yr,
        month: mo,
        day: dy
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

    // Only apply inventory changes, transactions and history if status is 'received'
    if (purchase.status === 'received') {
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

          // Insert into purchase_costs_history
          await supabase
            .from('purchase_costs_history')
            .insert({
              company_id: profile.company_id,
              product_id: item.productId,
              supplier_id: purchase.supplierId || null,
              purchase_order_id: newPurch.id,
              cost: item.cost,
              quantity: item.quantity,
              user_name: userName
            });
        }
      }

      // 4. Update Financial flow / Account balance (outgoing expense)
      const { data: accounts } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('company_id', profile.company_id);

      const defaultAccount = accounts?.[0];
      if (defaultAccount) {
        // Decrease balance
        const updatedBal = Number(defaultAccount.balance) - purchase.total;
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
            type: 'expense',
            amount: purchase.total,
            category: 'Compras',
            description: `Compra registrada - Folio ${folio}`,
            reference_id: newPurch.id,
            date: new Date().toISOString().split('T')[0]
          });
      }
    }

    return {
      ...purchase,
      id: newPurch.id,
      folio: newPurch.folio,
      createdAt: newPurch.created_at
    };
  },

  async updateStatus(id: string, status: 'received' | 'cancelled'): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) throw new Error('No autenticado.');

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, first_name, last_name')
      .eq('id', session.user.id)
      .single();

    if (!profile) throw new Error('Perfil no encontrado.');
    const userName = `${profile.first_name} ${profile.last_name}`;

    // Get the purchase order header and items
    const { data: purchase, error: getErr } = await supabase
      .from('purchases')
      .select('*, purchase_items(*)')
      .eq('id', id)
      .single();

    if (getErr || !purchase) throw new Error('Orden de compra no encontrada.');

    // If it's already received or cancelled, do nothing
    if (purchase.status !== 'pending') {
      throw new Error('La orden ya no está en estado pendiente.');
    }

    // 1. Update purchase status
    const { error: updErr } = await supabase
      .from('purchases')
      .update({ status })
      .eq('id', id);

    if (updErr) throw updErr;

    // 2. If transitioning to received, register stock, costs history, and financials
    if (status === 'received') {
      const items = purchase.purchase_items || [];

      for (const item of items) {
        if (item.product_id) {
          await productsService.registerMovement({
            companyId: profile.company_id,
            productId: item.product_id,
            type: 'in',
            quantity: Number(item.quantity),
            reason: 'purchase',
            referenceId: id
          });

          // Insert into purchase_costs_history
          await supabase
            .from('purchase_costs_history')
            .insert({
              company_id: profile.company_id,
              product_id: item.product_id,
              supplier_id: purchase.supplier_id || null,
              purchase_order_id: id,
              cost: Number(item.cost),
              quantity: Number(item.quantity),
              user_name: userName
            });
        }
      }

      // Decrement finance
      const { data: accounts } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('company_id', profile.company_id);

      const defaultAccount = accounts?.[0];
      const purchaseTotal = Number(purchase.total);
      if (defaultAccount) {
        const updatedBal = Number(defaultAccount.balance) - purchaseTotal;
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
            type: 'expense',
            amount: purchaseTotal,
            category: 'Compras',
            description: `Compra confirmada - Folio ${purchase.folio || purchase.order_number}`,
            reference_id: id,
            date: new Date().toISOString().split('T')[0]
          });
      }
    }
  },

  async getCostHistory(productId: string): Promise<PurchaseCostHistory[]> {
    const { data, error } = await supabase
      .from('purchase_costs_history')
      .select('*, suppliers(company_name), purchases(order_number, folio)')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(h => ({
      id: h.id,
      companyId: h.company_id,
      productId: h.product_id,
      supplierId: h.supplier_id,
      purchaseOrderId: h.purchase_order_id,
      cost: Number(h.cost),
      quantity: Number(h.quantity),
      userName: h.user_name,
      createdAt: h.created_at,
      orderNumber: h.purchases?.folio || h.purchases?.order_number || 'N/A',
      supplierName: h.suppliers?.company_name || 'Proveedor Desconocido'
    }));
  },

  async getAllCostHistory(): Promise<PurchaseCostHistory[]> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return [];

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', session.user.id)
      .single();

    if (!profile) return [];

    const { data, error } = await supabase
      .from('purchase_costs_history')
      .select('*, suppliers(company_name), products(name), purchases(order_number, folio)')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(h => ({
      id: h.id,
      companyId: h.company_id,
      productId: h.product_id,
      supplierId: h.supplier_id,
      purchaseOrderId: h.purchase_order_id,
      cost: Number(h.cost),
      quantity: Number(h.quantity),
      userName: h.user_name,
      createdAt: h.created_at,
      orderNumber: h.purchases?.folio || h.purchases?.order_number || 'N/A',
      supplierName: h.suppliers?.company_name || 'Proveedor Desconocido',
      productName: h.products?.name || 'Producto Desconocido'
    }));
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('purchases')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
