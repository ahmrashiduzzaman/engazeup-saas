-- ═══════════════════════════════════════════════════════════════════════════
-- EngazeUp — Auto Create Shop Trigger Update
-- Fires: AFTER INSERT ON auth.users
-- Logic: INSERT into public.shops with initialized plan_expires_at (14 days)
-- ═══════════════════════════════════════════════════════════════════════════

-- Ensure the column exists just in case it doesn't already
ALTER TABLE IF EXISTS public.shops
ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

-- Replace the existing trigger function to include plan_expires_at logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.shops (id, plan, sms_credits, plan_expires_at)
  VALUES (new.id, 'starter', 0, new.created_at + interval '14 days')
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;
