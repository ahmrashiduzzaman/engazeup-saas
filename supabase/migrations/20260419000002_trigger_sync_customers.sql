-- ═══════════════════════════════════════════════════════════════════════════
-- EngazeUp — Auto Customer Sync Trigger
-- Fires: AFTER INSERT ON public.orders
-- Logic: UPSERT into customers (per shop_id + phone)
--
-- Safe: Uses ON CONFLICT DO UPDATE — idempotent, no duplicate risk
-- Safe: Works regardless of source (WooCommerce, Facebook, Manual, CSV)
-- Safe: phone NULL/empty হলে trigger কিছু করে না — skip করে
-- ═══════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: Create the trigger function
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_customer_on_order_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- runs as the function owner (bypasses RLS) — needed so
                  -- service-role inserts also sync customers correctly
SET search_path = public
AS $$
DECLARE
  v_phone   TEXT;
  v_name    TEXT;
  v_address TEXT;
  v_cod     NUMERIC;
BEGIN
  -- ── Guard: phone নম্বর না থাকলে sync করার কিছু নেই ──────────────────────
  v_phone := TRIM(NEW.phone_number);
  IF v_phone IS NULL OR v_phone = '' THEN
    RETURN NEW;
  END IF;

  -- ── Normalize values ──────────────────────────────────────────────────────
  v_name    := COALESCE(NULLIF(TRIM(NEW.customer_name), ''), 'Customer');
  v_address := COALESCE(NULLIF(TRIM(NEW.address),       ''), '');
  v_cod     := COALESCE(NEW.cod_amount, 0);

  -- ── UPSERT into customers ─────────────────────────────────────────────────
  -- Conflict key: (shop_id, phone) — per-shop unique constraint
  --
  -- INSERT path  → new customer, total_orders=1, total_spent=cod
  -- UPDATE path  → existing customer, increment counters, refresh name/address
  --                (only overwrite name/address if new value is non-empty)
  INSERT INTO public.customers (
    shop_id,
    name,
    phone,
    address,
    total_orders,
    total_spent,
    is_deleted,
    created_at,
    updated_at
  )
  VALUES (
    NEW.shop_id,
    v_name,
    v_phone,
    v_address,
    1,
    v_cod,
    FALSE,
    NOW(),
    NOW()
  )
  ON CONFLICT (shop_id, phone)
  DO UPDATE SET
    -- শুধু আপডেট করব যদি নতুন ভ্যালু বেটার (খালি না হলে):
    name         = CASE
                     WHEN EXCLUDED.name <> 'Customer' THEN EXCLUDED.name
                     ELSE customers.name
                   END,
    address      = CASE
                     WHEN EXCLUDED.address <> '' THEN EXCLUDED.address
                     ELSE customers.address
                   END,
    total_orders = customers.total_orders + 1,
    total_spent  = customers.total_spent  + EXCLUDED.total_spent,
    is_deleted   = FALSE,  -- অর্ডার আসলে soft-deleted কাস্টমারও রিঅ্যাক্টিভেট হবে
    updated_at   = NOW();

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- Trigger failure এ order insert যেন block না হয়
    RAISE WARNING '[sync_customer_on_order_insert] Error syncing customer for phone=%, shop=%: %',
      v_phone, NEW.shop_id, SQLERRM;
    RETURN NEW;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: Drop old trigger if exists (idempotent)
-- ─────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_sync_customer_on_order_insert ON public.orders;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: Attach the trigger to the orders table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TRIGGER trg_sync_customer_on_order_insert
  AFTER INSERT
  ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_customer_on_order_insert();


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: One-time backfill — পুরনো orders থেকে customers sync করুন
-- (নতুন orders-এর জন্য trigger কাজ করবে, কিন্তু পুরনো ডাটার জন্য এটা চালান)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.customers (
  shop_id,
  name,
  phone,
  address,
  total_orders,
  total_spent,
  is_deleted,
  created_at,
  updated_at
)
SELECT
  o.shop_id,
  COALESCE(NULLIF(TRIM(o.customer_name), ''), 'Customer') AS name,
  TRIM(o.phone_number)                                     AS phone,
  COALESCE(NULLIF(TRIM(o.address), ''), '')                AS address,
  COUNT(*)                                                  AS total_orders,
  COALESCE(SUM(o.cod_amount), 0)                           AS total_spent,
  FALSE                                                     AS is_deleted,
  MIN(o.created_at)                                         AS created_at,
  NOW()                                                     AS updated_at
FROM public.orders o
WHERE
  o.phone_number IS NOT NULL
  AND TRIM(o.phone_number) <> ''
  AND (o.is_deleted IS NULL OR o.is_deleted = FALSE)
GROUP BY
  o.shop_id,
  TRIM(o.phone_number),
  COALESCE(NULLIF(TRIM(o.customer_name), ''), 'Customer'),
  COALESCE(NULLIF(TRIM(o.address), ''), '')
ON CONFLICT (shop_id, phone)
DO UPDATE SET
  total_orders = EXCLUDED.total_orders,
  total_spent  = EXCLUDED.total_spent,
  updated_at   = NOW();


-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION — Run to confirm trigger is active
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT trigger_name, event_manipulation, event_object_table, action_timing
--   FROM information_schema.triggers
--   WHERE event_object_table = 'orders'
--     AND trigger_name = 'trg_sync_customer_on_order_insert';
-- Expected: 1 row — INSERT AFTER

-- SELECT COUNT(*) FROM public.customers;
-- Should show backfilled customer count
