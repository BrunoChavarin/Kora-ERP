import { Product, Customer, Supplier, BankAccount, Transaction, Sale, Purchase, User, Company } from '../types';

export const MOCK_COMPANY: Company = {
  id: 'comp-1',
  name: 'Acme Corporación S.A. de C.V.',
  rfc: 'ACM120345TR4',
  currency: 'MXN',
  taxRate: 16,
  language: 'es',
  createdAt: new Date().toISOString()
};

export const MOCK_USER: User = {
  id: 'usr-1',
  email: 'admin@acme.com',
  firstName: 'Carlos',
  lastName: 'Sánchez',
  roleId: 'role-admin',
  companyId: 'comp-1',
  createdAt: new Date().toISOString()
};

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    companyId: 'comp-1',
    name: 'MacBook Pro 14" M3',
    sku: 'LAP-MBP-14-M3',
    barcode: '7501234567890',
    category: 'Electrónica',
    supplierId: 'supp-1',
    cost: 25000,
    price: 34999,
    stock: 12,
    minStock: 5,
    unit: 'pza',
    description: 'Apple MacBook Pro de 14 pulgadas con chip M3, 16GB RAM, 512GB SSD.',
    status: 'active',
    location: 'Pasillo A - Estante 2',
    createdAt: new Date().toISOString()
  },
  {
    id: 'prod-2',
    companyId: 'comp-1',
    name: 'Monitor Dell UltraSharp 27"',
    sku: 'MON-DELL-U27',
    barcode: '7509876543210',
    category: 'Accesorios de Computación',
    supplierId: 'supp-1',
    cost: 6500,
    price: 9800,
    stock: 3,
    minStock: 5,
    unit: 'pza',
    description: 'Monitor 4K USB-C ideal para diseñadores y programadores.',
    status: 'active',
    location: 'Pasillo A - Estante 4',
    createdAt: new Date().toISOString()
  },
  {
    id: 'prod-3',
    companyId: 'comp-1',
    name: 'Teclado Mecánico Keychron K2',
    sku: 'TEC-KEY-K2',
    barcode: '4897092383827',
    category: 'Accesorios de Computación',
    supplierId: 'supp-2',
    cost: 1200,
    price: 2199,
    stock: 25,
    minStock: 10,
    unit: 'pza',
    description: 'Teclado inalámbrico mecánico compacto 75% con retroiluminación RGB.',
    status: 'active',
    location: 'Pasillo B - Estante 1',
    createdAt: new Date().toISOString()
  }
];

export const MOCK_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    companyId: 'comp-1',
    name: 'Juan Pérez',
    companyName: 'Tecnologías Globales S.A.',
    email: 'juan.perez@tecglobal.com',
    phone: '5512345678',
    address: 'Av. Reforma 405, CDMX, México',
    rfc: 'TGL150820AA1',
    paymentMethod: 'Transferencia SPEI',
    notes: 'Cliente premium con pago regular a 15 días.',
    balancePending: 34999,
    createdAt: new Date().toISOString()
  },
  {
    id: 'cust-2',
    companyId: 'comp-1',
    name: 'Sofía Rodríguez',
    companyName: 'Design Studio Corp',
    email: 'sofia@designstudio.mx',
    phone: '5587654321',
    address: 'Colonia Roma Norte, CDMX, México',
    rfc: 'DSC190412BB2',
    paymentMethod: 'Tarjeta de Crédito',
    notes: 'Requiere factura siempre en el mismo mes.',
    balancePending: 0,
    createdAt: new Date().toISOString()
  }
];

export const MOCK_SUPPLIERS: Supplier[] = [
  {
    id: 'supp-1',
    companyId: 'comp-1',
    companyName: 'Distribuidora Tecnológica de México',
    contactName: 'Roberto Gómez',
    phone: '5544332211',
    email: 'contacto@distek.mx',
    address: 'Parque Industrial Vallejo, CDMX',
    rfc: 'DTM101010XX1',
    paymentMethod: 'Transferencia',
    creditTermsDays: 30,
    notes: 'Proveedor principal de equipo de cómputo.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'supp-2',
    companyId: 'comp-1',
    companyName: 'Accesorios e Importaciones Express',
    contactName: 'Laura Silva',
    phone: '5566778899',
    email: 'ventas@importsexpress.com',
    address: 'Zona Centro, Guadalajara, Jal.',
    rfc: 'AIE080512YY2',
    paymentMethod: 'Efectivo / Transferencia',
    creditTermsDays: 15,
    notes: 'Distribuidor de periféricos y gadgets.',
    createdAt: new Date().toISOString()
  }
];

export const MOCK_ACCOUNTS: BankAccount[] = [
  {
    id: 'acc-1',
    companyId: 'comp-1',
    name: 'Santander Operativa',
    type: 'bank',
    balance: 450200,
    accountNumber: '•••• 1234',
    createdAt: new Date().toISOString()
  },
  {
    id: 'acc-2',
    companyId: 'comp-1',
    name: 'Caja Chica',
    type: 'cash',
    balance: 8500,
    createdAt: new Date().toISOString()
  },
  {
    id: 'acc-3',
    companyId: 'comp-1',
    name: 'American Express Corp',
    type: 'card',
    balance: -12500, // Saldo negativo por línea utilizada
    accountNumber: '•••• 5678',
    createdAt: new Date().toISOString()
  }
];

export const MOCK_SALES: Sale[] = [
  {
    id: 'sale-1',
    companyId: 'comp-1',
    customerId: 'cust-1',
    customerName: 'Juan Pérez (Tecnologías Globales S.A.)',
    items: [
      {
        productId: 'prod-1',
        productName: 'MacBook Pro 14" M3',
        quantity: 1,
        price: 34999,
        taxRate: 16,
        discount: 0,
        subtotal: 30171.55,
        total: 34999
      }
    ],
    subtotal: 30171.55,
    tax: 4827.45,
    discount: 0,
    total: 34999,
    paymentMethod: 'Transferencia SPEI',
    status: 'pending',
    invoice: 'F-1023',
    notes: 'Entrega en oficinas corporativas.',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'sale-2',
    companyId: 'comp-1',
    customerId: 'cust-2',
    customerName: 'Sofía Rodríguez (Design Studio Corp)',
    items: [
      {
        productId: 'prod-2',
        productName: 'Monitor Dell UltraSharp 27"',
        quantity: 1,
        price: 9800,
        taxRate: 16,
        discount: 0,
        subtotal: 8448.28,
        total: 9800
      }
    ],
    subtotal: 8448.28,
    tax: 1351.72,
    discount: 0,
    total: 9800,
    paymentMethod: 'Tarjeta de Crédito',
    status: 'paid',
    invoice: 'F-1024',
    notes: 'Cobrado con terminal física.',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const MOCK_PURCHASES: Purchase[] = [
  {
    id: 'purch-1',
    companyId: 'comp-1',
    supplierId: 'supp-1',
    supplierName: 'Distribuidora Tecnológica de México',
    items: [
      {
        productId: 'prod-1',
        productName: 'MacBook Pro 14" M3',
        quantity: 5,
        cost: 25000,
        taxRate: 16,
        discount: 0,
        subtotal: 107758.62,
        total: 125000
      }
    ],
    subtotal: 107758.62,
    tax: 17241.38,
    discount: 0,
    total: 125000,
    status: 'paid',
    notes: 'Lote mensual recibido completo.',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    companyId: 'comp-1',
    accountId: 'acc-1',
    type: 'income',
    amount: 9800,
    category: 'Ventas',
    description: 'Venta a Sofía Rodríguez - Monitor Dell',
    referenceId: 'sale-2',
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'tx-2',
    companyId: 'comp-1',
    accountId: 'acc-1',
    type: 'expense',
    amount: 125000,
    category: 'Compras',
    description: 'Pago a Distribuidora Tecnológica de México - Lote MacBooks',
    referenceId: 'purch-1',
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'tx-3',
    companyId: 'comp-1',
    accountId: 'acc-1',
    type: 'expense',
    amount: 15000,
    category: 'Servicios',
    description: 'Pago de Renta Oficina',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  }
];
