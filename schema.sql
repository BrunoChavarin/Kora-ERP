-- 1. Crear tabla de Empresas (companies)
CREATE TABLE public.companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  rfc TEXT,
  currency TEXT DEFAULT 'MXN' NOT NULL,
  tax_rate NUMERIC DEFAULT 16 NOT NULL,
  language TEXT DEFAULT 'es' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 2. Crear tabla de Perfiles de Usuario (profiles) vinculada a auth.users de Supabase
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role_id TEXT DEFAULT 'role-admin' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Crear tabla de Clientes (customers)
CREATE TABLE public.customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  consecutive_id INT,
  name TEXT NOT NULL,
  company_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  rfc TEXT,
  payment_method TEXT DEFAULT 'Transferencia SPEI',
  notes TEXT,
  balance_pending NUMERIC DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- 4. Crear tabla de Proveedores (suppliers)
CREATE TABLE public.suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  consecutive_id INT,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  rfc TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- 5. Crear tabla de Productos (products)
CREATE TABLE public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  barcode TEXT,
  category TEXT NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  cost NUMERIC DEFAULT 0 NOT NULL,
  price NUMERIC DEFAULT 0 NOT NULL,
  stock NUMERIC DEFAULT 0 NOT NULL,
  min_stock NUMERIC DEFAULT 0 NOT NULL,
  unit TEXT DEFAULT 'pza' NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' NOT NULL,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(company_id, sku)
);

-- Habilitar RLS en products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 6. Crear tabla de Movimientos de Inventario (inventory_movements)
CREATE TABLE public.inventory_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('in', 'out')) NOT NULL,
  quantity NUMERIC NOT NULL,
  reason TEXT NOT NULL, -- 'sale', 'purchase', 'adjustment', 'initial'
  reference_id UUID, -- Referencia a venta o compra
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en inventory_movements
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- 7. Crear tabla de Ventas (sales)
CREATE TABLE public.sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  folio TEXT,
  customer_purchase_number INT,
  global_consecutive INT,
  subtotal NUMERIC NOT NULL,
  tax NUMERIC NOT NULL,
  discount NUMERIC DEFAULT 0 NOT NULL,
  total NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT CHECK (status IN ('paid', 'pending', 'partial')) NOT NULL,
  invoice TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en sales
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- 8. Crear tabla de Detalle de Venta (sale_items)
CREATE TABLE public.sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  tax_rate NUMERIC NOT NULL,
  discount NUMERIC DEFAULT 0 NOT NULL,
  subtotal NUMERIC NOT NULL,
  total NUMERIC NOT NULL
);

-- Habilitar RLS en sale_items
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- 9. Crear tabla de Compras (purchases)
CREATE TABLE public.purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT NOT NULL,
  order_number TEXT NOT NULL,
  folio TEXT,
  supplier_purchase_number INT,
  global_consecutive INT,
  user_name TEXT,
  subtotal NUMERIC NOT NULL,
  tax NUMERIC NOT NULL,
  discount NUMERIC DEFAULT 0 NOT NULL,
  total NUMERIC NOT NULL,
  status TEXT CHECK (status IN ('pending', 'received', 'cancelled')) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en purchases
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- 10. Crear tabla de Detalle de Compra (purchase_items)
CREATE TABLE public.purchase_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  cost NUMERIC NOT NULL,
  tax_rate NUMERIC NOT NULL,
  discount NUMERIC DEFAULT 0 NOT NULL,
  subtotal NUMERIC NOT NULL,
  total NUMERIC NOT NULL
);

-- Habilitar RLS en purchase_items
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

-- 11. Crear tabla de Cuentas Bancarias / Caja (bank_accounts)
CREATE TABLE public.bank_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('cash', 'bank', 'card')) NOT NULL,
  balance NUMERIC DEFAULT 0 NOT NULL,
  account_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en bank_accounts
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- 12. Crear tabla de Transacciones Financieras (transactions)
CREATE TABLE public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES public.bank_accounts(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('income', 'expense', 'transfer')) NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  reference_id UUID,
  date DATE DEFAULT CURRENT_DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 13. Crear tabla de Historial de Costos de Compra (purchase_costs_history)
CREATE TABLE public.purchase_costs_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  purchase_order_id UUID REFERENCES public.purchases(id) ON DELETE CASCADE,
  cost NUMERIC NOT NULL,
  quantity NUMERIC NOT NULL,
  user_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en purchase_costs_history
ALTER TABLE public.purchase_costs_history ENABLE ROW LEVEL SECURITY;

-- 14. Crear tabla de Historial de Precios de Venta (customer_prices_history)
CREATE TABLE public.customer_prices_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  quantity NUMERIC NOT NULL,
  user_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en customer_prices_history
ALTER TABLE public.customer_prices_history ENABLE ROW LEVEL SECURITY;


-- ==========================================
-- REGLES DE SEGURIDAD (RLS POLICIES)
-- ==========================================

-- Las siguientes políticas aseguran aislamiento multi-tenant:
-- El usuario solo tiene acceso a la información de su propia empresa (company_id)

-- Función auxiliar para obtener el company_id del usuario logueado
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Políticas para profiles
CREATE POLICY "Permitir lectura del propio perfil" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Permitir inserción de perfil al registrarse" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Permitir actualización de perfil propio" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Políticas para companies
CREATE POLICY "Permitir ver la propia empresa" ON public.companies
  FOR SELECT USING (id = public.get_user_company_id());

CREATE POLICY "Permitir insertar empresa durante registro" ON public.companies
  FOR INSERT WITH CHECK (true); -- Permitir inserción inicial durante registro

CREATE POLICY "Permitir actualizar empresa propia" ON public.companies
  FOR UPDATE USING (id = public.get_user_company_id());

-- Políticas para clientes (customers)
CREATE POLICY "Acceso a clientes de la empresa" ON public.customers
  FOR ALL USING (company_id = public.get_user_company_id());

-- Políticas para proveedores (suppliers)
CREATE POLICY "Acceso a proveedores de la empresa" ON public.suppliers
  FOR ALL USING (company_id = public.get_user_company_id());

-- Políticas para productos (products)
CREATE POLICY "Acceso a productos de la empresa" ON public.products
  FOR ALL USING (company_id = public.get_user_company_id());

-- Políticas para movimientos de inventario (inventory_movements)
CREATE POLICY "Acceso a movimientos de inventario" ON public.inventory_movements
  FOR ALL USING (company_id = public.get_user_company_id());

-- Políticas para ventas (sales)
CREATE POLICY "Acceso a ventas de la empresa" ON public.sales
  FOR ALL USING (company_id = public.get_user_company_id());

-- Políticas para detalles de venta (sale_items)
CREATE POLICY "Acceso a detalles de ventas" ON public.sale_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.sales
      WHERE sales.id = sale_items.sale_id
        AND sales.company_id = public.get_user_company_id()
    )
  );

-- Políticas para compras (purchases)
CREATE POLICY "Acceso a compras de la empresa" ON public.purchases
  FOR ALL USING (company_id = public.get_user_company_id());

-- Políticas para detalles de compra (purchase_items)
CREATE POLICY "Acceso a detalles de compras" ON public.purchase_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.purchases
      WHERE purchases.id = purchase_items.purchase_id
        AND purchases.company_id = public.get_user_company_id()
    )
  );

-- Políticas para cuentas bancarias (bank_accounts)
CREATE POLICY "Acceso a cuentas bancarias de la empresa" ON public.bank_accounts
  FOR ALL USING (company_id = public.get_user_company_id());

-- Políticas para transacciones (transactions)
CREATE POLICY "Acceso a transacciones de la empresa" ON public.transactions
  FOR ALL USING (company_id = public.get_user_company_id());

-- Políticas para purchase_costs_history
CREATE POLICY "Acceso a historial de costos de compra de la empresa" ON public.purchase_costs_history
  FOR ALL USING (company_id = public.get_user_company_id());

-- Políticas para customer_prices_history
CREATE POLICY "Acceso a historial de precios de venta de la empresa" ON public.customer_prices_history
  FOR ALL USING (company_id = public.get_user_company_id());

-- 11. Tabla de Precios Personalizados de Clientes (customer_custom_prices)
CREATE TABLE public.customer_custom_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  price NUMERIC NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(customer_id, product_id)
);

ALTER TABLE public.customer_custom_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso a precios personalizados de la empresa" ON public.customer_custom_prices
  FOR ALL USING (company_id = public.get_user_company_id());

-- 12. Tabla de Historial de Cambios de Precios Personalizados (customer_custom_prices_history)
CREATE TABLE public.customer_custom_prices_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  old_price NUMERIC,
  new_price NUMERIC NOT NULL,
  user_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.customer_custom_prices_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso a historial de precios personalizados de la empresa" ON public.customer_custom_prices_history
  FOR ALL USING (company_id = public.get_user_company_id());

