import { db } from './db';
import { Sale, Transaction } from '../types';
import { productsService } from './products.service';

export const salesService = {
  async getAll(): Promise<Sale[]> {
    return db.get('sales');
  },

  async create(sale: Omit<Sale, 'id' | 'createdAt'>): Promise<Sale> {
    const sales: Sale[] = db.get('sales');
    const newSale: Sale = {
      ...sale,
      id: `sale-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };

    sales.push(newSale);
    db.save('sales', sales);

    // 1. Decrease stock for each item sold
    for (const item of newSale.items) {
      await productsService.registerMovement({
        companyId: newSale.companyId,
        productId: item.productId,
        type: 'out',
        quantity: item.quantity,
        reason: 'sale',
        referenceId: newSale.id
      });
    }

    // 2. Register Financial Transaction if paid or partial
    if (newSale.status === 'paid') {
      const accounts = db.get('accounts');
      const defaultAccount = accounts[0]; // Santander Operativa or fallback
      
      if (defaultAccount) {
        // Update account balance
        defaultAccount.balance += newSale.total;
        db.save('accounts', accounts);

        // Add transaction
        const transactions: Transaction[] = db.get('transactions');
        transactions.push({
          id: `tx-${Math.random().toString(36).substr(2, 9)}`,
          companyId: newSale.companyId,
          accountId: defaultAccount.id,
          type: 'income',
          amount: newSale.total,
          category: 'Ventas',
          description: `Venta registrada - Folio ${newSale.id}`,
          referenceId: newSale.id,
          date: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString()
        });
        db.save('transactions', transactions);
      }
    } else if (newSale.status === 'pending') {
      // Add balance pending to customer
      const customers = db.get('customers');
      const customer = customers.find((c: any) => c.id === newSale.customerId);
      if (customer) {
        customer.balancePending += newSale.total;
        db.save('customers', customers);
      }
    }

    return newSale;
  }
};
