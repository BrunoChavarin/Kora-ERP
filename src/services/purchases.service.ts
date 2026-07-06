import { db } from './db';
import { Purchase, Transaction } from '../types';
import { productsService } from './products.service';

export const purchasesService = {
  async getAll(): Promise<Purchase[]> {
    return db.get('purchases');
  },

  async create(purchase: Omit<Purchase, 'id' | 'createdAt'>): Promise<Purchase> {
    const purchases: Purchase[] = db.get('purchases');
    const newPurchase: Purchase = {
      ...purchase,
      id: `purch-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };

    purchases.push(newPurchase);
    db.save('purchases', purchases);

    // 1. Increase stock for each item purchased
    for (const item of newPurchase.items) {
      await productsService.registerMovement({
        companyId: newPurchase.companyId,
        productId: item.productId,
        type: 'in',
        quantity: item.quantity,
        reason: 'purchase',
        referenceId: newPurchase.id
      });
    }

    // 2. Register Financial Transaction (expense) if paid
    if (newPurchase.status === 'paid') {
      const accounts = db.get('accounts');
      const defaultAccount = accounts[0];
      
      if (defaultAccount) {
        // Update account balance
        defaultAccount.balance -= newPurchase.total;
        db.save('accounts', accounts);

        // Add transaction
        const transactions: Transaction[] = db.get('transactions');
        transactions.push({
          id: `tx-${Math.random().toString(36).substr(2, 9)}`,
          companyId: newPurchase.companyId,
          accountId: defaultAccount.id,
          type: 'expense',
          amount: newPurchase.total,
          category: 'Compras',
          description: `Compra registrada - Proveedor: ${newPurchase.supplierName}`,
          referenceId: newPurchase.id,
          date: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString()
        });
        db.save('transactions', transactions);
      }
    }

    return newPurchase;
  }
};
