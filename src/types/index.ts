export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  companyId: string;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  rfc?: string;
  currency: string;
  taxRate: number; // default e.g. 16 for 16%
  language: string;
  createdAt: string;
}

export interface Role {
  id: string;
  name: string; // Admin, Manager, Cashier, etc.
  permissions: string[];
}

export interface Product {
  id: string;
  companyId: string;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  supplierId?: string;
  cost: number;
  price: number;
  stock: number;
  minStock: number;
  unit: string; // pza, kg, lit, etc.
  description?: string;
  status: 'active' | 'inactive';
  location?: string;
  createdAt: string;
}

export interface InventoryMovement {
  id: string;
  companyId: string;
  productId: string;
  type: 'in' | 'out';
  quantity: number;
  reason: string; // 'sale', 'purchase', 'adjustment', 'initial'
  referenceId?: string; // saleId or purchaseId
  createdAt: string;
}

export interface Customer {
  id: string;
  companyId: string;
  name: string;
  companyName?: string;
  email: string;
  phone?: string;
  address?: string;
  rfc?: string;
  paymentMethod?: string;
  notes?: string;
  balancePending: number;
  createdAt: string;
}

export interface Supplier {
  id: string;
  companyId: string;
  companyName: string;
  contactName?: string;
  phone?: string;
  email: string;
  address?: string;
  rfc?: string;
  paymentMethod?: string;
  creditTermsDays?: number;
  notes?: string;
  createdAt: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  cost: number;
  taxRate: number;
  discount: number;
  subtotal: number;
  total: number;
}

export interface Purchase {
  id: string;
  companyId: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: 'paid' | 'pending' | 'partial';
  notes?: string;
  createdAt: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  taxRate: number;
  discount: number;
  subtotal: number;
  total: number;
}

export interface Sale {
  id: string;
  companyId: string;
  customerId: string;
  customerName: string;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  status: 'paid' | 'pending' | 'partial';
  invoice?: string; // invoice number or 'no'
  notes?: string;
  createdAt: string;
}

export interface BankAccount {
  id: string;
  companyId: string;
  name: string; // e.g. 'Banamex Principal', 'Caja Chica', 'Tarjeta Débito'
  type: 'cash' | 'bank' | 'card';
  balance: number;
  accountNumber?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  companyId: string;
  accountId: string; // References BankAccount
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  category: string; // e.g. 'Venta', 'Compra', 'Renta', 'Sueldos', etc.
  description?: string;
  referenceId?: string; // saleId or purchaseId or transfer destination accountId
  date: string;
  createdAt: string;
}
