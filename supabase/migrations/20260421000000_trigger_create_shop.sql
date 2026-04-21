-- ═══════════════════════════════════════════════════════════════════════════
-- EngazeUp — Auto Create Shop Trigger
-- Fires: AFTER INSERT ON auth.users
-- Logic: INSERT into public.shops (id, plan, sms_credits, name)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: Create the trigger function
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.shops (id, plan, sms_credits)
  VALUES (new.id, 'starter', 0)
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: Drop old trigger if exists (idempotent)
-- ─────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: Attach the trigger to auth.users
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: Retroactive Backfill for existing users in auth.users without a shop
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.shops (id, plan, sms_credits)
SELECT id, 'starter', 0
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.shops)
ON CONFLICT (id) DO NOTHING;
