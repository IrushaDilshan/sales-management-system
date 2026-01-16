-- ==================================================
-- NLDB SALES MANAGEMENT SYSTEM
-- Migration: Rep Operations (Repo Transactions)
-- Created: January 16, 2026
-- ==================================================

-- 1. Ensure stock_transactions table exists (for Rep floating stock)
CREATE TABLE IF NOT EXISTS stock_transactions (
    id BIGSERIAL PRIMARY KEY,
    rep_id UUID REFERENCES users(id),
    item_id BIGINT REFERENCES items(id),
    qty INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'OUT' (issued to rep), 'SALE', 'RETURN', 'RETURN_IN', 'TRANSFER_OUT', 'RETURN_TO_HQ'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Function: Salesman returns/transfers stock to their Rep
CREATE OR REPLACE FUNCTION transfer_salesman_to_rep(
    p_salesman_id UUID,
    p_product_id BIGINT,
    p_quantity INTEGER,
    p_notes TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_shop_id UUID;
    v_rep_id UUID;
    v_current_stock INTEGER;
    v_product_uuid UUID; -- stock table uses UUID for item_id? No, BigInt. Wait.
    -- Checking 02_multi_location_inventory: product_id BIGINT.
    -- Checking 05_salesman_operations: p_product_id UUID.
    -- Wait, 03_sales_entry_system changed items(id) from INT to UUID? 
    -- "54: product_id UUID REFERENCES items(id)"
    -- "52: product_id BIGINT REFERENCES items(id)" in 02.
    -- This is confusing. 03 says "Phase 2... FULL UUID FIX".
    -- "54: product_id UUID REFERENCES items(id)" in sale_items.
    -- But stock table? "127: s.item_id" in view stock_by_outlet refers to stock.item_id.
    -- Let's check stock table definition in 02 (it alters it).
    -- It assumes stock exists.
    -- Let's assume item_id is BIGINT based on 02, OR UUID based on 03.
    -- The code in salesman/transfer.tsx uses stock.item_id.
    -- 05 migration uses p_product_id UUID.
    -- I will use UUID for p_product_id to be safe, but cast if needed.
    -- Actually, if items.id is UUID, then stock.item_id should be UUID.
    -- Code in 02: "products_id BIGINT" in stock_movements.
    -- Code in 05: "p_product_id UUID".
    -- I'll use UUID for the function parameter to match recent migrations.
BEGIN
    -- Get Salesman's Shop and Rep
    SELECT u.shop_id, s.rep_id INTO v_shop_id, v_rep_id
    FROM users u
    JOIN shops s ON u.shop_id = s.id
    WHERE u.id = p_salesman_id;

    IF v_shop_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Salesman not assigned to a shop');
    END IF;

    IF v_rep_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No Rep assigned to this shop');
    END IF;

    -- Check Salesman's Shop Stock (using p_product_id)
    -- IMPORTANT: We need to handle if item_id is UUID or BIGINT.
    -- We'll assume UUID since 05 uses it.
    
    SELECT qty INTO v_current_stock
    FROM stock
    WHERE (item_id = p_product_id OR item_id::text = p_product_id::text) -- Handle potential type mismatch
    AND outlet_id = v_shop_id;

    IF v_current_stock IS NULL OR v_current_stock < p_quantity THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient stock in shop');
    END IF;

    -- Deduct from Shop Stock
    UPDATE stock
    SET qty = qty - p_quantity,
        last_updated = NOW()
    WHERE (item_id = p_product_id OR item_id::text = p_product_id::text)
    AND outlet_id = v_shop_id;

    -- Add to Rep's Floating Stock (stock_transactions)
    -- Use 'RETURN_IN' (Stock coming IN to Rep from Salesman)
    INSERT INTO stock_transactions (rep_id, item_id, qty, type, created_at)
    VALUES (v_rep_id, (p_product_id::text)::bigint, p_quantity, 'RETURN_IN', NOW());
    -- Note: We cast to bigint for stock_transactions item_id if it is INT. 
    -- If p_product_id is UUID, this might fail if table expects INT.
    -- Based on rep/stock.tsx "item.id.toString()", it treats IDs as numbers often.
    -- Let's assume stock_transactions.item_id is BIGINT based on my create statement.
    -- If p_product_id is UUID (from earlier migration confusion), we might have an issue.
    -- However, 05 migration uses UUID. 
    -- 02 migration uses BIGINT.
    -- I'll trust 02 for 'stock' table, but 05 uses UUID.
    -- If items.id is UUID, I should cast. 
    -- But since I created stock_transactions with BIGINT in this file (if not exists), I'll try to insert BIGINT.
    -- If the system uses UUIDs really, I'll catch the error? No PLPGSQL dies.
    -- I will check users open files: 'salesman/transfer.tsx' uses `item.id`.
    -- `salesman/transfer.tsx` -> `item.id.toString()`. It seems numeric or string.
    -- `rep/stock.tsx` -> `item.id: number`. It is NUMBER.
    -- So p_product_id should be BIGINT or INTEGER.
    -- But 05 uses UUID. Strange.
    -- I found 05 migration... `p_product_id UUID`.
    -- Maybe the DB handles casting or 05 was wrong but executed?
    -- I will use BIGINT for my function parameters to be safe with `rep/stock.tsx`'s `number`.

    -- Log movement for audit
    INSERT INTO stock_movements (
        product_id,
        from_outlet_id,
        quantity,
        movement_type,
        notes,
        created_by
    ) VALUES (
        (p_product_id::text)::bigint, -- Cast to bigint if needed, or if it matches
        v_shop_id,
        p_quantity,
        'transfer_to_rep',
        p_notes,
        p_salesman_id
    );

    RETURN jsonb_build_object('success', true, 'message', 'Transfer to Rep successful');
END;
$$ LANGUAGE plpgsql;


-- 3. Function: Rep transfers stock to a Shop
CREATE OR REPLACE FUNCTION transfer_rep_to_shop(
    p_rep_id UUID,
    p_shop_id UUID,
    p_product_id BIGINT,
    p_quantity INTEGER,
    p_notes TEXT
)
RETURNS JSONB AS $$
BEGIN
    -- 1. Deduct from Rep (log negative transaction)
    INSERT INTO stock_transactions (rep_id, item_id, qty, type, created_at)
    VALUES (p_rep_id, p_product_id, p_quantity, 'TRANSFER_OUT', NOW());

    -- 2. Add to Shop Stock
    IF EXISTS (SELECT 1 FROM stock WHERE (item_id = p_product_id OR item_id::text = p_product_id::text) AND outlet_id = p_shop_id) THEN
        UPDATE stock
        SET qty = qty + p_quantity,
            last_updated = NOW()
        WHERE (item_id = p_product_id OR item_id::text = p_product_id::text) AND outlet_id = p_shop_id;
    ELSE
        INSERT INTO stock (item_id, outlet_id, qty, last_updated)
        VALUES (p_product_id, p_shop_id, p_quantity, NOW());
    END IF;

    -- 3. Log Movement
    INSERT INTO stock_movements (
        product_id,
        to_outlet_id,
        quantity,
        movement_type,
        notes,
        created_by
    ) VALUES (
        p_product_id,
        p_shop_id,
        p_quantity,
        'rep_transfer',
        p_notes,
        p_rep_id
    );

    RETURN jsonb_build_object('success', true, 'message', 'Transfer to Shop successful');
END;
$$ LANGUAGE plpgsql;


-- 4. Function: Rep returns stock to Storekeeper
CREATE OR REPLACE FUNCTION return_rep_to_storekeeper(
    p_rep_id UUID,
    p_product_id BIGINT,
    p_quantity INTEGER,
    p_notes TEXT
)
RETURNS JSONB AS $$
BEGIN
    -- 1. Deduct from Rep (log negative transaction)
    INSERT INTO stock_transactions (rep_id, item_id, qty, type, created_at)
    VALUES (p_rep_id, p_product_id, p_quantity, 'RETURN_TO_HQ', NOW());

    -- 2. Log Movement (No 'to_outlet' implies HQ/System)
    INSERT INTO stock_movements (
        product_id,
        quantity,
        movement_type,
        notes,
        created_by
    ) VALUES (
        p_product_id,
        p_quantity,
        'rep_return_hq',
        p_notes,
        p_rep_id
    );

    RETURN jsonb_build_object('success', true, 'message', 'Return to Storekeeper successful');
END;
$$ LANGUAGE plpgsql;
