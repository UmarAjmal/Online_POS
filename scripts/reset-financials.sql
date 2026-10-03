-- Reset all financial data for a clean trial balance start
-- Keeps: shop, user, categories, brands, units, products (stock zeroed), walk-in party

BEGIN;

DELETE FROM account_transactions WHERE shop_id = 'ar-group-shop-001';
DELETE FROM credit_transactions WHERE shop_id = 'ar-group-shop-001';
DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE shop_id = 'ar-group-shop-001');
DELETE FROM invoices WHERE shop_id = 'ar-group-shop-001';
DELETE FROM purchase_order_items WHERE purchase_order_id IN (SELECT id FROM purchase_orders WHERE shop_id = 'ar-group-shop-001');
DELETE FROM purchase_orders WHERE shop_id = 'ar-group-shop-001';
DELETE FROM expenses WHERE shop_id = 'ar-group-shop-001';
DELETE FROM return_items WHERE return_id IN (SELECT id FROM returns WHERE shop_id = 'ar-group-shop-001');
DELETE FROM returns WHERE shop_id = 'ar-group-shop-001';
DELETE FROM emi_schedules WHERE invoice_id IN (SELECT id FROM invoices WHERE shop_id = 'ar-group-shop-001');
DELETE FROM register_sessions WHERE shop_id = 'ar-group-shop-001';
DELETE FROM fixed_assets WHERE shop_id = 'ar-group-shop-001';

UPDATE cash_accounts SET current_balance = 0 WHERE shop_id = 'ar-group-shop-001';
UPDATE parties SET current_balance = 0 WHERE shop_id = 'ar-group-shop-001';
UPDATE products SET current_stock = 0 WHERE shop_id = 'ar-group-shop-001';

-- Remove demo parties except walk-in
DELETE FROM parties WHERE shop_id = 'ar-group-shop-001' AND id != 'walkin';

-- Remove pre-seeded cash accounts (app will recreate Cash in Hand on next load)
DELETE FROM cash_accounts WHERE shop_id = 'ar-group-shop-001';

COMMIT;
