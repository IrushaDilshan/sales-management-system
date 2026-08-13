const fs = require('fs');
const path = require('path');

const migrationsDir = __dirname;
const outputFile = path.join(migrationsDir, 'unified_setup.sql');

// Ordered list of migrations
const migrationFiles = [
    '01_product_categories.sql',
    '02_multi_location_inventory.sql',
    '03_sales_entry_system.sql',
    '04_fix_requests_timestamp.sql',
    '05_salesman_operations.sql',
    '06_fix_stock_schema.sql',
    '07_ensure_routes_permissions.sql',
    '08_add_phone_to_users.sql',
    '09_fix_admin_permissions_and_shop_id.sql',
    '10_fix_user_visibility.sql',
    '11_fix_reduce_stock_function.sql',
    '12_critical_stock_fix.sql',
    '13_expenses_tracking.sql',
    '14_rep_operations.sql',
    '15_product_images_and_ma_permissions.sql',
    '16_consolidate_categories.sql',
    '17_fix_stock_qty_and_policies.sql',
    '18_fix_stock_relationships.sql',
    '19_fix_product_categories_access.sql',
    '20_fix_public_access_and_data.sql',
    '21_force_fix_permissions.sql',
    '22_fix_items_rls_insert.sql',
    '23_fix_items_public_access.sql',
    '25_fix_shops_public_access.sql',
    '26_fix_routes_public_access.sql',
    '27_update_wipe_function.sql',
    'fix_admin_users.sql'
];

// Baseline Schema to prepend
const baselineSchema = `-- ==================================================
-- BASELINE SCHEMA SETUP
-- Creates the baseline tables before migrations run.
-- ==================================================

-- Restore default Supabase permissions on public schema
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create items table
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    role VARCHAR(50) DEFAULT 'pending',
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create routes table
CREATE TABLE IF NOT EXISTS routes (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    rep_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create shops table
CREATE TABLE IF NOT EXISTS shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(100),
    rep_id UUID REFERENCES users(id) ON DELETE SET NULL,
    route_id BIGINT REFERENCES routes(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Circular reference
ALTER TABLE users ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES shops(id) ON DELETE SET NULL;

-- 5. Create stock table
CREATE TABLE IF NOT EXISTS stock (
    id BIGSERIAL PRIMARY KEY,
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create requests table
CREATE TABLE IF NOT EXISTS requests (
    id BIGSERIAL PRIMARY KEY,
    salesman_id UUID REFERENCES users(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create request_items table
CREATE TABLE IF NOT EXISTS request_items (
    id BIGSERIAL PRIMARY KEY,
    request_id BIGINT REFERENCES requests(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    qty INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create deliveries table
CREATE TABLE IF NOT EXISTS deliveries (
    id BIGSERIAL PRIMARY KEY,
    request_id BIGINT REFERENCES requests(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Create salesman_shops table
CREATE TABLE IF NOT EXISTS salesman_shops (
    salesman_id UUID REFERENCES users(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    PRIMARY KEY (salesman_id, shop_id)
);

-- 10. Create rep_shops table
CREATE TABLE IF NOT EXISTS rep_shops (
    rep_id UUID REFERENCES users(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    PRIMARY KEY (rep_id, shop_id)
);

-- 11. Create shop_requests table
CREATE TABLE IF NOT EXISTS shop_requests (
    id BIGSERIAL PRIMARY KEY,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Supabase auth.users profile sync trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    'pending'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==================================================
-- END OF BASELINE
-- ==================================================
`;

let combinedSql = baselineSchema + '\n\n';

for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    if (fs.existsSync(filePath)) {
        console.log(`Processing ${file}...`);
        let content = fs.readFileSync(filePath, 'utf8');

        // Apply type corrections for items.id and shops.id referencing columns from BIGINT to UUID
        content = content.replace(/outlet_id BIGINT REFERENCES shops\(id\)/g, 'outlet_id UUID REFERENCES shops(id)');
        content = content.replace(/from_outlet_id BIGINT REFERENCES shops\(id\)/g, 'from_outlet_id UUID REFERENCES shops(id)');
        content = content.replace(/to_outlet_id BIGINT REFERENCES shops\(id\)/g, 'to_outlet_id UUID REFERENCES shops(id)');
        content = content.replace(/product_id BIGINT REFERENCES items\(id\)/g, 'product_id UUID REFERENCES items(id)');
        content = content.replace(/item_id BIGINT REFERENCES items\(id\)/g, 'item_id UUID REFERENCES items(id)');
        content = content.replace(/created_by BIGINT REFERENCES users\(id\)/g, 'created_by UUID REFERENCES users(id)');
        content = content.replace(/recorded_by BIGINT REFERENCES users\(id\)/g, 'recorded_by UUID REFERENCES users(id)');

        // Correct stock table column name from qty/s.qty to quantity/s.quantity in stock context
        content = content.replace(/s\.qty\b/g, 's.quantity');
        content = content.replace(/\bqty = qty/g, 'quantity = quantity');
        content = content.replace(/\bqty =/g, 'quantity =');
        content = content.replace(/\bSET qty =/g, 'SET quantity =');
        content = content.replace(/SELECT qty INTO/g, 'SELECT quantity INTO');
        content = content.replace(/SELECT qty FROM stock/g, 'SELECT quantity FROM stock');
        content = content.replace(/item_id, outlet_id, qty/g, 'item_id, outlet_id, quantity');
        content = content.replace(/item_id, outlet_id, quantity, last_updated/g, 'item_id, outlet_id, quantity, last_updated');

        // Comment out column rename operations to keep column as quantity consistently
        content = content.replace(/ALTER TABLE stock RENAME COLUMN quantity TO qty;/gi, '-- ALTER TABLE stock RENAME COLUMN quantity TO qty; -- (Bypassed: Column is always quantity)');
        content = content.replace(/ALTER TABLE stock RENAME COLUMN qty TO quantity;/gi, '-- ALTER TABLE stock RENAME COLUMN qty TO quantity; -- (Bypassed: Column is always quantity)');

        // Comment out legacy request date column migrations
        content = content.replace(/UPDATE requests SET created_at = date::timestamp WHERE created_at IS NULL;/gi, '-- UPDATE requests SET created_at = date::timestamp WHERE created_at IS NULL; -- (Bypassed: Column date does not exist in baseline)');

        combinedSql += `-- --- START OF MIGRATION: ${file} ---\n` + content + `\n-- --- END OF MIGRATION: ${file} ---\n\n`;
    } else {
        console.warn(`Warning: File ${file} not found.`);
    }
}

fs.writeFileSync(outputFile, combinedSql, 'utf8');
console.log(`Success! Created unified setup SQL script at ${outputFile}`);
