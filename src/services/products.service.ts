import { supabase } from '../config/supabase';
import { Product, InventoryMovement } from '../types';

export const productsService = {
  async getAll(): Promise<Product[]> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return [];

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', session.user.id)
      .single();

    if (!profile) return [];

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('company_id', profile.company_id);

    if (error) throw error;

    return (data || []).map(p => ({
      id: p.id,
      companyId: p.company_id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      category: p.category,
      supplierId: p.supplier_id,
      cost: Number(p.cost),
      price: Number(p.price),
      stock: Number(p.stock),
      minStock: Number(p.min_stock),
      unit: p.unit,
      description: p.description,
      status: p.status,
      location: p.location,
      createdAt: p.created_at
    }));
  },

  async save(product: Product): Promise<Product> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) throw new Error('Usuario no autenticado.');

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', session.user.id)
      .single();

    if (!profile) throw new Error('No se encontró el perfil de la empresa.');

    // Remove client side specific ID if creating new to let UUID gen work or parse properly
    const isNew = !product.id.startsWith('prod-') && product.id.includes('-'); 
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const hasValidUuid = uuidPattern.test(product.id);

    const payload = {
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      category: product.category,
      supplier_id: product.supplierId || null,
      cost: product.cost,
      price: product.price,
      stock: product.stock,
      min_stock: product.minStock,
      unit: product.unit,
      description: product.description,
      status: product.status,
      location: product.location,
      company_id: profile.company_id
    };

    if (hasValidUuid) {
      const { error } = await supabase
        .from('products')
        .upsert({ id: product.id, ...payload });
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('products')
        .insert(payload);
      if (error) throw error;
    }

    return product;
  },

  async delete(productId: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) throw error;
  },

  async registerMovement(movement: Omit<InventoryMovement, 'id' | 'createdAt'>): Promise<InventoryMovement> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) throw new Error('No autenticado.');

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', session.user.id)
      .single();

    if (!profile) throw new Error('Perfil no encontrado.');

    const { data, error } = await supabase
      .from('inventory_movements')
      .insert({
        company_id: profile.company_id,
        product_id: movement.productId,
        type: movement.type,
        quantity: movement.quantity,
        reason: movement.reason,
        reference_id: movement.referenceId || null
      })
      .select()
      .single();

    if (error) throw error;

    // Adjust product stock
    const { data: prod } = await supabase
      .from('products')
      .select('stock')
      .eq('id', movement.productId)
      .single();

    if (prod) {
      const newStock = movement.type === 'in'
        ? Number(prod.stock) + movement.quantity
        : Number(prod.stock) - movement.quantity;

      await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', movement.productId);
    }

    return {
      id: data.id,
      companyId: data.company_id,
      productId: data.product_id,
      type: data.type,
      quantity: Number(data.quantity),
      reason: data.reason,
      referenceId: data.reference_id,
      createdAt: data.created_at
    };
  }
};
