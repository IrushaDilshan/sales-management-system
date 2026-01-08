-- ==================================================
-- NLDB SALES MANAGEMENT SYSTEM
-- Migration: Salesman Operations (Transfers & Returns)
-- Created: January 8, 2026
-- Updated: To use 'qty' instead of 'quantity' to match schema
-- ==================================================

-- 1. Function to transfer stock between two shops
CREATE OR REPLACE FUNCTION transfer_stock(
    p_product_id UUID,
    p_from_outlet_id UUID,
    p_to_outlet_id UUID,
    p_quantity INTEGER,
    p_notes TEXT,
    p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_current_stock INTEGER;
    v_item_id UUID;
BEGIN
    -- Ensure input is valid
    IF p_quantity <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Quantity must be positive');
    END IF;

    -- Check source stock
    SELECT qty INTO v_current_stock
    FROM stock
    WHERE item_id = p_product_id AND outlet_id = p_from_outlet_id;

    IF v_current_stock IS NULL OR v_current_stock < p_quantity THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient stock at source shop');
    END IF;

    -- Deduct from source
    UPDATE stock
    SET qty = qty - p_quantity,
        last_updated = NOW()
    WHERE item_id = p_product_id AND outlet_id = p_from_outlet_id;

    -- Add to destination (create row if not exists)
    IF EXISTS (SELECT 1 FROM stock WHERE item_id = p_product_id AND outlet_id = p_to_outlet_id) THEN
        UPDATE stock
        SET qty = qty + p_quantity,
            last_updated = NOW()
        WHERE item_id = p_product_id AND outlet_id = p_to_outlet_id;
    ELSE
        INSERT INTO stock (item_id, outlet_id, qty, last_updated)
        VALUES (p_product_id, p_to_outlet_id, p_quantity, NOW());
    END IF;

    -- Log movement
    INSERT INTO stock_movements (
        product_id,
        from_outlet_id,
        to_outlet_id,
        quantity,
        movement_type,
        notes,
        created_by,
        created_at
    ) VALUES (
        p_product_id,
        p_from_outlet_id,
        p_to_outlet_id,
        p_quantity,
        'transfer',
        p_notes,
        p_user_id,
        NOW()
    );

    RETURN jsonb_build_object('success', true, 'message', 'Transfer successful');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- 2. Function to process customer returns
CREATE OR REPLACE FUNCTION process_customer_return(
    p_product_id UUID,
    p_outlet_id UUID,
    p_quantity INTEGER,
    p_reason TEXT,
    p_user_id UUID
)
RETURNS JSONB AS $$
BEGIN
    -- Ensure input is valid
    IF p_quantity <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Quantity must be positive');
    END IF;

    -- Add to stock (create if not exists)
    IF EXISTS (SELECT 1 FROM stock WHERE item_id = p_product_id AND outlet_id = p_outlet_id) THEN
        UPDATE stock
        SET qty = qty + p_quantity,
            last_updated = NOW()
        WHERE item_id = p_product_id AND outlet_id = p_outlet_id;
    ELSE
        INSERT INTO stock (item_id, outlet_id, qty, last_updated)
        VALUES (p_product_id, p_outlet_id, p_quantity, NOW());
    END IF;

    -- Log movement
    INSERT INTO stock_movements (
        product_id,
        to_outlet_id,
        quantity,
        movement_type,
        notes,
        created_by,
        created_at
    ) VALUES (
        p_product_id,
        p_outlet_id,
        p_quantity,
        'return',
        p_reason,
        p_user_id,
        NOW()
    );

    RETURN jsonb_build_object('success', true, 'message', 'Return processed successfully');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql;
