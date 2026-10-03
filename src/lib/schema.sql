-- Falcon Swift PVT. LTD. full SQLite schema (all modules)

CREATE TABLE IF NOT EXISTS shops (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  industry_type TEXT NOT NULL DEFAULT 'commercial',
  owner_id TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  ntn TEXT,
  footer_note TEXT,
  theme_settings TEXT,
  currency TEXT DEFAULT 'PKR',
  subscription_tier TEXT NOT NULL DEFAULT 'enterprise',
  subscription_expires_at TEXT,
  allow_negative_stock INTEGER NOT NULL DEFAULT 1,
  has_emi INTEGER NOT NULL DEFAULT 1,
  has_payroll INTEGER NOT NULL DEFAULT 1,
  has_tax INTEGER NOT NULL DEFAULT 1,
  has_assets_rec INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'superadmin',
  role_id TEXT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone TEXT,
  permissions TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_system INTEGER DEFAULT 0,
  permissions TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  user_id TEXT,
  actor_name TEXT,
  actor_role TEXT,
  type TEXT NOT NULL,
  module TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  metadata TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_settings (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL UNIQUE,
  session_timeout_mins INTEGER NOT NULL DEFAULT 60,
  single_session_only INTEGER NOT NULL DEFAULT 0,
  min_password_length INTEGER NOT NULL DEFAULT 8,
  require_uppercase INTEGER NOT NULL DEFAULT 0,
  require_numbers INTEGER NOT NULL DEFAULT 1,
  require_special_chars INTEGER NOT NULL DEFAULT 0,
  password_expiry_days INTEGER NOT NULL DEFAULT 0,
  max_failed_attempts INTEGER NOT NULL DEFAULT 5,
  lockout_duration_mins INTEGER NOT NULL DEFAULT 15,
  two_factor_enabled INTEGER NOT NULL DEFAULT 0,
  auto_backup_enabled INTEGER NOT NULL DEFAULT 1,
  auto_backup_interval TEXT NOT NULL DEFAULT 'daily',
  retention_days INTEGER NOT NULL DEFAULT 14,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS active_sessions (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  email TEXT NOT NULL,
  token TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  device_info TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  last_active_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS login_audit_logs (
  id TEXT PRIMARY KEY,
  shop_id TEXT,
  user_id TEXT,
  email TEXT NOT NULL,
  status TEXT NOT NULL, -- 'SUCCESS', 'FAILED', 'LOCKED'
  failure_reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS database_backups (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  backup_type TEXT NOT NULL DEFAULT 'manual_sql', -- 'manual_sql', 'auto_daily', 'json_snapshot'
  file_size_kb REAL NOT NULL DEFAULT 0,
  record_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  created_by TEXT NOT NULL DEFAULT 'System Admin',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_shops (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  shop_id TEXT,
  role TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS brands (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS units (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  conversion_factor REAL DEFAULT 1,
  parent_unit_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS formulations (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pharmacy_formulas (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  name TEXT NOT NULL,
  therapeutic_class TEXT,
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shelves (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS warehouses (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  name TEXT NOT NULL,
  generic_name TEXT,
  code TEXT,
  barcode TEXT,
  category_id TEXT,
  brand_id TEXT,
  formulation_id TEXT,
  formula_id TEXT,
  shelf_id TEXT,
  shelf_location TEXT,
  rack_location TEXT,
  address TEXT,
  note TEXT,
  unit TEXT DEFAULT 'pcs',
  measurement_type TEXT,
  pack_size REAL DEFAULT 1,
  base_price REAL DEFAULT 0,
  purchase_price_pack REAL DEFAULT 0,
  sale_price_pack REAL DEFAULT 0,
  purchase_price_single REAL DEFAULT 0,
  sale_price_single REAL DEFAULT 0,
  current_stock REAL DEFAULT 0,
  min_stock_level REAL DEFAULT 10,
  batch_number TEXT,
  expiry_date TEXT,
  has_imei INTEGER DEFAULT 0,
  is_narcotic INTEGER DEFAULT 0,
  is_refrigerated INTEGER DEFAULT 0,
  is_ingredient INTEGER DEFAULT 0,
  formula TEXT,
  warranty TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  shop_id TEXT,
  product_id TEXT NOT NULL,
  packing_name TEXT NOT NULL,
  pack_size REAL DEFAULT 1,
  is_packing INTEGER DEFAULT 0,
  purchase_price REAL DEFAULT 0,
  sale_price REAL DEFAULT 0,
  stock_quantity REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_barcodes (
  id TEXT PRIMARY KEY,
  shop_id TEXT,
  product_id TEXT,
  variant_id TEXT,
  barcode TEXT NOT NULL,
  pack_type TEXT DEFAULT 'single',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_batches (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  product_id TEXT,
  variant_id TEXT,
  batch_number TEXT,
  expiry_date TEXT,
  stock_quantity REAL DEFAULT 0,
  purchase_price REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_imeis (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  imei1 TEXT NOT NULL,
  imei2 TEXT,
  status TEXT DEFAULT 'available',
  sold_invoice_item_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_recipes (
  id TEXT PRIMARY KEY,
  parent_product_id TEXT NOT NULL,
  ingredient_product_id TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_wastage (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity REAL NOT NULL,
  reason TEXT,
  cost_at_wastage REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock (
  id TEXT PRIMARY KEY,
  shop_id TEXT,
  product_id TEXT,
  warehouse_id TEXT,
  quantity_pack REAL DEFAULT 0,
  quantity_single REAL DEFAULT 0,
  batch_number TEXT,
  expiry_date TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parties (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT,
  phone TEXT,
  address TEXT,
  cnic_number TEXT,
  father_name TEXT,
  note TEXT,
  opening_balance REAL DEFAULT 0,
  current_balance REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cash_accounts (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'cash',
  current_balance REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS account_transactions (
  id TEXT PRIMARY KEY,
  shop_id TEXT,
  account_id TEXT,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  ref_type TEXT,
  ref_id TEXT,
  remarks TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id TEXT PRIMARY KEY,
  shop_id TEXT,
  customer_id TEXT,
  account_id TEXT,
  amount REAL NOT NULL,
  transaction_type TEXT,
  remarks TEXT,
  ref_type TEXT,
  ref_id TEXT,
  edit_history TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS register_sessions (
  id TEXT PRIMARY KEY,
  shop_id TEXT,
  user_id TEXT,
  session_type TEXT,
  status TEXT DEFAULT 'open',
  opening_balance REAL DEFAULT 0,
  closing_balance REAL,
  opened_at TEXT DEFAULT CURRENT_TIMESTAMP,
  closed_at TEXT
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  party_id TEXT,
  account_id TEXT,
  register_session_id TEXT,
  invoice_number TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  doctor_name TEXT,
  total_amount REAL DEFAULT 0,
  paid_amount REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  discount_percentage REAL DEFAULT 0,
  tax_rate REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  net_amount REAL DEFAULT 0,
  payment_mode TEXT DEFAULT 'cash',
  payment_method TEXT DEFAULT 'cash',
  status TEXT DEFAULT 'completed',
  is_voided INTEGER DEFAULT 0,
  is_edited INTEGER DEFAULT 0,
  edit_history TEXT,
  restaurant_order_status TEXT,
  service_type TEXT,
  table_id TEXT,
  bill_printed_at TEXT,
  order_number TEXT,
  delivery_fee REAL DEFAULT 0,
  additional_charges REAL DEFAULT 0,
  special_instructions TEXT,
  waiter_id TEXT,
  rider_id TEXT,
  subsidy_amount REAL DEFAULT 0,
  subsidy_voucher TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  product_id TEXT,
  variant_id TEXT,
  product_name TEXT,
  batch_id TEXT,
  batch_number TEXT,
  expiry_date TEXT,
  quantity REAL NOT NULL DEFAULT 0,
  unit_price REAL NOT NULL DEFAULT 0,
  subtotal REAL DEFAULT 0,
  total_price REAL DEFAULT 0,
  packing_name TEXT,
  sold_imeis TEXT,
  warranty TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  supplier_id TEXT,
  account_id TEXT,
  invoice_number TEXT,
  total_amount REAL DEFAULT 0,
  paid_amount REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  tax_rate REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  payment_mode TEXT DEFAULT 'cash',
  status TEXT DEFAULT 'completed',
  notes TEXT,
  is_voided INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id TEXT PRIMARY KEY,
  purchase_order_id TEXT NOT NULL,
  product_id TEXT,
  variant_id TEXT,
  quantity REAL NOT NULL DEFAULT 0,
  unit_price REAL DEFAULT 0,
  purchase_price REAL DEFAULT 0,
  subtotal REAL DEFAULT 0,
  bonus_quantity REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  batch_number TEXT,
  expiry_date TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  user_id TEXT,
  account_id TEXT,
  register_session_id TEXT,
  title TEXT,
  name TEXT,
  amount REAL NOT NULL,
  category TEXT,
  expense_type TEXT,
  payment_method TEXT DEFAULT 'cash',
  remarks TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS returns (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  party_id TEXT,
  invoice_id TEXT,
  purchase_order_id TEXT,
  type TEXT,
  total_amount REAL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS return_items (
  id TEXT PRIMARY KEY,
  return_id TEXT NOT NULL,
  product_id TEXT,
  variant_id TEXT,
  quantity REAL NOT NULL DEFAULT 0,
  unit_price REAL DEFAULT 0,
  subtotal REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  product_id TEXT,
  variant_id TEXT,
  quantity REAL NOT NULL,
  reason TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS emi_schedules (
  id TEXT PRIMARY KEY,
  invoice_id TEXT,
  due_date TEXT NOT NULL,
  installment_amount REAL NOT NULL,
  amount_paid REAL DEFAULT 0,
  late_fee REAL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS company_details (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  email TEXT,
  logo_path TEXT,
  website TEXT,
  license_no TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS print_settings (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  receipt_page_size TEXT DEFAULT 'MM80',
  receipt_font TEXT DEFAULT 'Arial',
  receipt_font_size INTEGER DEFAULT 12,
  receipt_design_settings TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS petrol_stations (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  cash_balance REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fuel_tanks (
  id TEXT PRIMARY KEY,
  shop_id TEXT,
  station_id TEXT,
  fuel_type TEXT NOT NULL,
  capacity REAL DEFAULT 0,
  current_dip REAL DEFAULT 0,
  purchase_price REAL DEFAULT 0,
  sale_price REAL DEFAULT 0,
  stock_liters REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fuel_pumps (
  id TEXT PRIMARY KEY,
  shop_id TEXT,
  station_id TEXT,
  tank_id TEXT,
  nozzle_name TEXT,
  initial_reading REAL DEFAULT 0,
  current_reading REAL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fuel_transactions (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  station_id TEXT,
  dispenser_id TEXT,
  fuel_tank_id TEXT,
  shift_date TEXT,
  quantity_sold REAL DEFAULT 0,
  total_sale REAL DEFAULT 0,
  total_cost REAL DEFAULT 0,
  profit REAL DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  opening_reading REAL,
  closing_reading REAL,
  user_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fuel_purchases (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  station_id TEXT,
  fuel_tank_id TEXT NOT NULL,
  supplier_id TEXT,
  quantity REAL NOT NULL,
  price_per_liter REAL NOT NULL,
  total_cost REAL NOT NULL,
  payment_mode TEXT DEFAULT 'cash',
  account_id TEXT,
  paid_amount REAL DEFAULT 0,
  purchase_date TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fuel_stock_differences (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  station_id TEXT,
  fuel_tank_id TEXT NOT NULL,
  expected_stock REAL DEFAULT 0,
  recorded_stock REAL DEFAULT 0,
  difference REAL DEFAULT 0,
  account_id TEXT,
  expense_id TEXT,
  remarks TEXT,
  recorded_date TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fuel_daily_close_credits (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  daily_close_id TEXT NOT NULL,
  party_id TEXT NOT NULL,
  amount REAL NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fuel_cash_transactions (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  station_id TEXT,
  account_id TEXT,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  balance_after REAL DEFAULT 0,
  remarks TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fuel_daily_closes (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  station_id TEXT,
  shift_date TEXT NOT NULL,
  total_sales REAL DEFAULT 0,
  total_profit REAL DEFAULT 0,
  total_expense REAL DEFAULT 0,
  total_credit REAL DEFAULT 0,
  cash_amount REAL DEFAULT 0,
  card_amount REAL DEFAULT 0,
  online_amount REAL DEFAULT 0,
  cash_account_id TEXT,
  bank_account_id TEXT,
  expense_account_id TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fuel_shift_readings (
  id TEXT PRIMARY KEY,
  shop_id TEXT,
  user_id TEXT,
  shift_date TEXT,
  nozzle_number INTEGER,
  fuel_type TEXT,
  opening_reading REAL DEFAULT 0,
  closing_reading REAL,
  cash_collected REAL,
  shortage_amount REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shift_meter_readings (
  id TEXT PRIMARY KEY,
  register_session_id TEXT,
  pump_id TEXT,
  opening_reading REAL DEFAULT 0,
  closing_reading REAL,
  total_liters_sold REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fixed_assets (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  name TEXT NOT NULL,
  asset_type TEXT,
  purchase_date TEXT,
  purchase_price REAL DEFAULT 0,
  salvage_value REAL DEFAULT 0,
  useful_life_years INTEGER DEFAULT 1,
  current_value REAL DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payroll_slips (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  staff_id TEXT,
  month_year TEXT NOT NULL,
  base_salary REAL DEFAULT 0,
  allowances REAL DEFAULT 0,
  deductions REAL DEFAULT 0,
  net_payable REAL DEFAULT 0,
  status TEXT DEFAULT 'unpaid',
  paid_date TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payroll_items (
  id TEXT PRIMARY KEY,
  slip_id TEXT,
  type TEXT,
  name TEXT,
  amount REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_ticket_replies (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  shop_id TEXT,
  message TEXT NOT NULL,
  is_admin INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS restaurant_tables (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  name TEXT NOT NULL,
  capacity INTEGER DEFAULT 4,
  status TEXT DEFAULT 'available',
  active_invoice_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kitchen_orders (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  table_id TEXT,
  invoice_id TEXT,
  waiter_id TEXT,
  status TEXT DEFAULT 'cooking',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kitchen_order_items (
  id TEXT PRIMARY KEY,
  kitchen_order_id TEXT NOT NULL,
  product_id TEXT,
  quantity REAL NOT NULL DEFAULT 1,
  remarks TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS restaurant_menu_sizes (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  size_name TEXT NOT NULL,
  size_description TEXT,
  price REAL DEFAULT 0,
  is_available INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS restaurant_deals (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  original_price REAL DEFAULT 0,
  deal_price REAL DEFAULT 0,
  discount_percentage REAL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  valid_from TEXT,
  valid_until TEXT,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS restaurant_deal_items (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL,
  product_id TEXT,
  item_type TEXT DEFAULT 'item',
  quantity REAL DEFAULT 1,
  size_name TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS restaurant_waiter_calls (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  table_id TEXT,
  invoice_id TEXT,
  message TEXT DEFAULT 'Waiter requested',
  call_type TEXT DEFAULT 'help',
  status TEXT DEFAULT 'pending',
  waiter_id TEXT,
  acknowledged_at TEXT,
  acknowledged_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seasonal_khata (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  party_id TEXT NOT NULL,
  crop_season TEXT NOT NULL,
  credit_limit REAL DEFAULT 0,
  outstanding_balance REAL DEFAULT 0,
  expected_harvest_payback TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS karigars (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  balance REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tailor_measurements (
  id TEXT PRIMARY KEY,
  party_id TEXT,
  invoice_id TEXT,
  chest REAL,
  waist REAL,
  length REAL,
  shoulder REAL,
  collar REAL,
  shalwar REAL,
  paincha REAL,
  teera REAL,
  big_teera REAL,
  design_details TEXT,
  cloth_image_url TEXT,
  status TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stitching_orders (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  customer_id TEXT,
  karigar_id TEXT,
  total_amount REAL DEFAULT 0,
  karigar_wage REAL DEFAULT 0,
  delivery_date TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS repair_tickets (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  party_id TEXT,
  device_model TEXT,
  imei_number TEXT,
  issue_description TEXT,
  estimated_cost REAL DEFAULT 0,
  status TEXT DEFAULT 'open',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gift_cards (
  id TEXT PRIMARY KEY,
  shop_id TEXT,
  code TEXT NOT NULL,
  balance REAL DEFAULT 0,
  issued_to TEXT,
  issued_by TEXT,
  expiry_date TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gift_card_transactions (
  id TEXT PRIMARY KEY,
  gift_card_id TEXT,
  amount REAL NOT NULL,
  transaction_type TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  shop_id TEXT,
  user_id TEXT,
  action TEXT NOT NULL,
  details TEXT,
  table_name TEXT,
  record_id TEXT,
  old_data TEXT,
  new_data TEXT,
  ip_address TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  shop_id TEXT,
  user_id TEXT,
  register_session_id TEXT,
  customer_name TEXT,
  total_amount REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  net_amount REAL DEFAULT 0,
  payment_method TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sale_items (
  id TEXT PRIMARY KEY,
  sale_id TEXT,
  product_id TEXT,
  variant_id TEXT,
  quantity REAL DEFAULT 0,
  unit_price REAL DEFAULT 0,
  subtotal REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  shop_id TEXT,
  name TEXT NOT NULL,
  phone TEXT,
  credit_limit REAL DEFAULT 0,
  current_credit REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS installment_plans (
  id TEXT PRIMARY KEY,
  shop_id TEXT,
  customer_id TEXT,
  sale_id TEXT,
  down_payment REAL DEFAULT 0,
  installment_amount REAL NOT NULL,
  total_installments INTEGER NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS installment_payments (
  id TEXT PRIMARY KEY,
  plan_id TEXT,
  amount_paid REAL NOT NULL,
  payment_date TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pending_payments (
  id TEXT PRIMARY KEY,
  shop_id TEXT,
  customer_id TEXT,
  amount REAL NOT NULL,
  due_date TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS asset_depreciation_logs (
  id TEXT PRIMARY KEY,
  asset_id TEXT,
  depreciation_amount REAL DEFAULT 0,
  remaining_value REAL DEFAULT 0,
  log_date TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bank_statement_lines (
  id TEXT PRIMARY KEY,
  shop_id TEXT,
  account_id TEXT,
  transaction_date TEXT,
  description TEXT,
  debit REAL DEFAULT 0,
  credit REAL DEFAULT 0,
  balance REAL DEFAULT 0,
  is_reconciled INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
