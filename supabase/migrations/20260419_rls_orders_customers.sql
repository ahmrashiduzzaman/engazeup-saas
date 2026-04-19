-- ═══════════════════════════════════════════════════════════════════════════
-- EngazeUp — Row Level Security Migration
-- Tables: orders, customers
-- Date: 2026-04-19
--
-- SAFE TO RUN: Edge Functions using SERVICE_ROLE_KEY bypass RLS automatically.
-- Only anon/authenticated (frontend) requests are subject to these policies.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: Enable RLS on both tables
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.orders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: DROP any old/conflicting policies (idempotent — safe to re-run)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can SELECT their own orders"    ON public.orders;
DROP POLICY IF EXISTS "Users can INSERT their own orders"    ON public.orders;
DROP POLICY IF EXISTS "Users can UPDATE their own orders"    ON public.orders;
DROP POLICY IF EXISTS "Users can DELETE their own orders"    ON public.orders;

DROP POLICY IF EXISTS "Users can SELECT their own customers"  ON public.customers;
DROP POLICY IF EXISTS "Users can INSERT their own customers"  ON public.customers;
DROP POLICY IF EXISTS "Users can UPDATE their own customers"  ON public.customers;
DROP POLICY IF EXISTS "Users can DELETE their own customers"  ON public.customers;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: CREATE RLS Policies — orders
-- Rule: shop_id must equal the currently logged-in user's ID (auth.uid())
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Users can SELECT their own orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (shop_id = auth.uid());

CREATE POLICY "Users can INSERT their own orders"
  ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (shop_id = auth.uid());

CREATE POLICY "Users can UPDATE their own orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING    (shop_id = auth.uid())
  WITH CHECK (shop_id = auth.uid());

CREATE POLICY "Users can DELETE their own orders"
  ON public.orders
  FOR DELETE
  TO authenticated
  USING (shop_id = auth.uid());


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: CREATE RLS Policies — customers
-- Rule: shop_id must equal the currently logged-in user's ID (auth.uid())
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Users can SELECT their own customers"
  ON public.customers
  FOR SELECT
  TO authenticated
  USING (shop_id = auth.uid());

CREATE POLICY "Users can INSERT their own customers"
  ON public.customers
  FOR INSERT
  TO authenticated
  WITH CHECK (shop_id = auth.uid());

CREATE POLICY "Users can UPDATE their own customers"
  ON public.customers
  FOR UPDATE
  TO authenticated
  USING    (shop_id = auth.uid())
  WITH CHECK (shop_id = auth.uid());

CREATE POLICY "Users can DELETE their own customers"
  ON public.customers
  FOR DELETE
  TO authenticated
  USING (shop_id = auth.uid());


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5 (BONUS): Fix CSV Import duplicate constraint
-- Currently: phone is unique GLOBALLY across all shops (wrong!)
-- Fix:       (shop_id, phone) unique — same phone in different shops is OK
-- ─────────────────────────────────────────────────────────────────────────────

-- Remove old global unique constraint on phone (if exists)
ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS customers_phone_key;

-- Add correct per-shop unique constraint
ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS customers_shop_id_phone_key;

ALTER TABLE public.customers
  ADD CONSTRAINT customers_shop_id_phone_key UNIQUE (shop_id, phone);


-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION — Run these SELECTs to confirm everything is set correctly
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT tablename, rowsecurity
--   FROM pg_tables
--   WHERE tablename IN ('orders', 'customers');
-- Expected: rowsecurity = true for both

-- SELECT schemaname, tablename, policyname, cmd, roles
--   FROM pg_policies
--   WHERE tablename IN ('orders', 'customers')
--   ORDER BY tablename, cmd;
-- Expected: 4 policies per table (SELECT, INSERT, UPDATE, DELETE)
