import { db } from './db';
import { Product, InventoryMovement } from '../types';

export const productsService = {
  async getAll(): Promise<Product[]> {
    return db.get('products');
  },

  async save(product: Product): Promise<Product> {
    const products: Product[] = db.get('products');
    const index = products.findIndex(p => p.id === product.id);
    if (index >= 0) {
      products[index] = product;
    } else {
      products.push(product);
    }
    db.save('products', products);
    return product;
  },

  async delete(productId: string): Promise<void> {
    const products: Product[] = db.get('products');
    const filtered = products.filter(p => p.id !== productId);
    db.save('products', filtered);
  },

  async registerMovement(movement: Omit<InventoryMovement, 'id' | 'createdAt'>): Promise<InventoryMovement> {
    const movements: InventoryMovement[] = db.get('inventory_movements') || [];
    const newMovement: InventoryMovement = {
      ...movement,
      id: `mov-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };
    movements.push(newMovement);
    db.save('inventory_movements', movements);

    // Adjust product stock
    const products: Product[] = db.get('products');
    const product = products.find(p => p.id === movement.productId);
    if (product) {
      if (movement.type === 'in') {
        product.stock += movement.quantity;
      } else {
        product.stock -= movement.quantity;
      }
      db.save('products', products);
    }

    return newMovement;
  }
};
