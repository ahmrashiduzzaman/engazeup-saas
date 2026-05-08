-- ═══════════════════════════════════════════════════════════════════════════
-- EngazeUp — RBAC, Gamification Triggers & Trial RLS
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: Add Role and Gamification Flags to Shops
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS reward_api_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reward_sms_claimed BOOLEAN NOT NULL DEFAULT FALSE;

-- The column reward_customer_list_claimed was already added in a previous migration.

-- Seed Super Admin Role for Rashiduzzaman
UPDATE public.shops
SET role = 'super_admin'
FROM auth.users
WHERE auth.users.id = public.shops.id
  AND auth.users.email = 'mstkhadizakhatun023@gmail.com';

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: Gamification Triggers for Trial Extension
-- ─────────────────────────────────────────────────────────────────────────────

-- Trigger for API & SMS (shops table)
CREATE OR REPLACE FUNCTION public.handle_shop_rewards()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- API Reward
  IF NEW.steadfast_api_key IS NOT NULL AND NEW.reward_api_claimed = FALSE THEN
    NEW.reward_api_claimed := TRUE;
    NEW.plan_expires_at := GREATEST(NEW.plan_expires_at, NOW()) + interval '5 days';
  END IF;
  
  -- SMS Reward (Triggered when sms_credits goes above 0)
  IF NEW.sms_credits > 0 AND NEW.reward_sms_claimed = FALSE THEN
    NEW.reward_sms_claimed := TRUE;
    NEW.plan_expires_at := GREATEST(NEW.plan_expires_at, NOW()) + interval '3 days';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_shop_update_rewards ON public.shops;
CREATE TRIGGER before_shop_update_rewards
  BEFORE UPDATE ON public.shops
  FOR EACH ROW EXECUTE PROCEDURE public.handle_shop_rewards();


-- Trigger for First Customer (customers table)
CREATE OR REPLACE FUNCTION public.reward_first_customer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.shops
  SET 
    reward_customer_list_claimed = TRUE,
    plan_expires_at = GREATEST(plan_expires_at, NOW()) + interval '5 days'
  WHERE id = NEW.shop_id AND reward_customer_list_claimed = FALSE;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_customer_insert_reward ON public.customers;
CREATE TRIGGER after_customer_insert_reward
  AFTER INSERT ON public.customers
  FOR EACH ROW EXECUTE PROCEDURE public.reward_first_customer();

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: Strict RLS with RBAC & Trial Enforcement
-- ─────────────────────────────────────────────────────────────────────────────

-- Function to evaluate access cleanly
CREATE OR REPLACE FUNCTION public.has_shop_access(check_shop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shops
    WHERE id = check_shop_id
      AND (
        role IN ('admin', 'super_admin') 
        OR plan != 'starter' 
        OR plan_expires_at >= NOW()
      )
  );
$$;

-- Note: In the existing migration 20260419000001_rls_orders_customers.sql, 
-- policies were created using (shop_id = auth.uid()). 
-- We will replace them with our new logic.

-- ORDERS
DROP POLICY IF EXISTS "Users can SELECT their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can INSERT their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can UPDATE their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can DELETE their own orders" ON public.orders;

CREATE POLICY "Users can SELECT their own orders" ON public.orders FOR SELECT TO authenticated USING (shop_id = auth.uid() AND public.has_shop_access(shop_id));
CREATE POLICY "Users can INSERT their own orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (shop_id = auth.uid() AND public.has_shop_access(shop_id));
CREATE POLICY "Users can UPDATE their own orders" ON public.orders FOR UPDATE TO authenticated USING (shop_id = auth.uid() AND public.has_shop_access(shop_id));
CREATE POLICY "Users can DELETE their own orders" ON public.orders FOR DELETE TO authenticated USING (shop_id = auth.uid() AND public.has_shop_access(shop_id));

-- CUSTOMERS
DROP POLICY IF EXISTS "Users can SELECT their own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can INSERT their own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can UPDATE their own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can DELETE their own customers" ON public.customers;

CREATE POLICY "Users can SELECT their own customers" ON public.customers FOR SELECT TO authenticated USING (shop_id = auth.uid() AND public.has_shop_access(shop_id));
CREATE POLICY "Users can INSERT their own customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (shop_id = auth.uid() AND public.has_shop_access(shop_id));
CREATE POLICY "Users can UPDATE their own customers" ON public.customers FOR UPDATE TO authenticated USING (shop_id = auth.uid() AND public.has_shop_access(shop_id));
CREATE POLICY "Users can DELETE their own customers" ON public.customers FOR DELETE TO authenticated USING (shop_id = auth.uid() AND public.has_shop_access(shop_id));
