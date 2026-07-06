import { db } from './db';
import { Customer, Supplier } from '../types';

export const contactsService = {
  async getCustomers(): Promise<Customer[]> {
    return db.get('customers');
  },

  async saveCustomer(customer: Customer): Promise<Customer> {
    const list: Customer[] = db.get('customers');
    const index = list.findIndex(c => c.id === customer.id);
    if (index >= 0) {
      list[index] = customer;
    } else {
      list.push(customer);
    }
    db.save('customers', list);
    return customer;
  },

  async deleteCustomer(id: string): Promise<void> {
    const list: Customer[] = db.get('customers');
    db.save('customers', list.filter(c => c.id !== id));
  },

  async getSuppliers(): Promise<Supplier[]> {
    return db.get('suppliers');
  },

  async saveSupplier(supplier: Supplier): Promise<Supplier> {
    const list: Supplier[] = db.get('suppliers');
    const index = list.findIndex(s => s.id === supplier.id);
    if (index >= 0) {
      list[index] = supplier;
    } else {
      list.push(supplier);
    }
    db.save('suppliers', list);
    return supplier;
  },

  async deleteSupplier(id: string): Promise<void> {
    const list: Supplier[] = db.get('suppliers');
    db.save('suppliers', list.filter(s => s.id !== id));
  }
};
