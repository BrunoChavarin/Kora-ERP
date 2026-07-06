import {
  MOCK_PRODUCTS,
  MOCK_CUSTOMERS,
  MOCK_SUPPLIERS,
  MOCK_ACCOUNTS,
  MOCK_SALES,
  MOCK_PURCHASES,
  MOCK_TRANSACTIONS,
  MOCK_COMPANY,
  MOCK_USER
} from './mockData';

class LocalDatabase {
  private getStorage<T>(key: string, defaultValue: T): T {
    const val = localStorage.getItem(`kora_${key}`);
    if (!val) {
      this.setStorage(key, defaultValue);
      return defaultValue;
    }
    try {
      return JSON.parse(val) as T;
    } catch {
      return defaultValue;
    }
  }

  private setStorage<T>(key: string, data: T): void {
    localStorage.setItem(`kora_${key}`, JSON.stringify(data));
  }

  // Initialize database with default data if empty
  public init() {
    this.getStorage('company', MOCK_COMPANY);
    this.getStorage('users', [MOCK_USER]);
    this.getStorage('products', MOCK_PRODUCTS);
    this.getStorage('customers', MOCK_CUSTOMERS);
    this.getStorage('suppliers', MOCK_SUPPLIERS);
    this.getStorage('accounts', MOCK_ACCOUNTS);
    this.getStorage('sales', MOCK_SALES);
    this.getStorage('purchases', MOCK_PURCHASES);
    this.getStorage('transactions', MOCK_TRANSACTIONS);
    this.getStorage('session', { user: MOCK_USER, company: MOCK_COMPANY });
  }

  public get(key: string): any {
    return this.getStorage(key, []);
  }

  public save(key: string, data: any): void {
    this.setStorage(key, data);
  }

  public clear(): void {
    localStorage.clear();
    this.init();
  }
}

export const db = new LocalDatabase();
db.init();
