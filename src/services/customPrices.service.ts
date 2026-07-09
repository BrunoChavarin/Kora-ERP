import { supabase } from '../config/supabase';
import { CustomerCustomPrice, CustomerCustomPriceHistory } from '../types';

export const customPricesService = {
  async getByCustomerId(customerId: string): Promise<CustomerCustomPrice[]> {
    const { data, error } = await supabase
      .from('customer_custom_prices')
      .select('*, products(name, category, unit, group_id)')
      .eq('customer_id', customerId);

    if (error) throw error;

    const customPrices: CustomerCustomPrice[] = [];

    for (const item of (data || [])) {
      // Query last sale for this customer and product to get lastSalePrice and lastSaleDate
      const { data: saleData } = await supabase
        .from('customer_prices_history')
        .select('price, created_at')
        .eq('customer_id', customerId)
        .eq('product_id', item.product_id)
        .order('created_at', { ascending: false })
        .limit(1);

      const lastSale = saleData && saleData.length > 0 ? saleData[0] : null;

      customPrices.push({
        id: item.id,
        companyId: item.company_id,
        customerId: item.customer_id,
        productId: item.product_id,
        price: Number(item.price),
        updatedAt: item.updated_at,
        productName: item.products?.name,
        category: item.products?.category,
        groupId: item.products?.group_id,
        unit: item.products?.unit,
        lastSalePrice: lastSale ? Number(lastSale.price) : undefined,
        lastSaleDate: lastSale ? lastSale.created_at.split('T')[0] : undefined
      });
    }

    return customPrices;
  },

  async save(customerId: string, productId: string, price: number): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) throw new Error('No autenticado.');

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, first_name, last_name')
      .eq('id', session.user.id)
      .single();

    if (!profile) throw new Error('Perfil no encontrado.');
    const userName = `${profile.first_name} ${profile.last_name}`;

    // Check if custom price already exists to determine old price
    const { data: existing } = await supabase
      .from('customer_custom_prices')
      .select('id, price')
      .eq('customer_id', customerId)
      .eq('product_id', productId)
      .single();

    let oldPrice: number | undefined;
    if (existing) {
      oldPrice = Number(existing.price);
      // Update
      const { error: updErr } = await supabase
        .from('customer_custom_prices')
        .update({ price, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (updErr) throw updErr;
    } else {
      // Insert
      const { error: insErr } = await supabase
        .from('customer_custom_prices')
        .insert({
          company_id: profile.company_id,
          customer_id: customerId,
          product_id: productId,
          price
        });
      if (insErr) throw insErr;
    }

    // Save to history if price changed
    if (oldPrice !== price) {
      await supabase
        .from('customer_custom_prices_history')
        .insert({
          company_id: profile.company_id,
          customer_id: customerId,
          product_id: productId,
          old_price: oldPrice || null,
          new_price: price,
          user_name: userName
        });
    }
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('customer_custom_prices')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getHistory(customerId: string, productId: string): Promise<CustomerCustomPriceHistory[]> {
    const { data, error } = await supabase
      .from('customer_custom_prices_history')
      .select('*')
      .eq('customer_id', customerId)
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(h => ({
      id: h.id,
      companyId: h.company_id,
      customerId: h.customer_id,
      productId: h.product_id,
      oldPrice: h.old_price ? Number(h.old_price) : undefined,
      newPrice: Number(h.new_price),
      userName: h.user_name,
      createdAt: h.created_at
    }));
  },

  async getCustomPrice(customerId: string, productId: string): Promise<number | null> {
    if (!customerId || customerId === 'generic') return null;
    const { data, error } = await supabase
      .from('customer_custom_prices')
      .select('price')
      .eq('customer_id', customerId)
      .eq('product_id', productId)
      .single();

    if (error || !data) return null;
    return Number(data.price);
  }
};
