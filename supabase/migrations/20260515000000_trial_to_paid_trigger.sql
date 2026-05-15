-- ═══════════════════════════════════════════════════════════════════════════
-- EngazeUp — Trial-to-Paid Conversion Trigger
-- Fires: AFTER UPDATE ON manual_payments (when status → 'verified')
-- Logic: Auto-extend plan_expires_at safely (after trial end, not cutting it)
-- Caution 1: Trial মেয়াদ কাটে না — MAX(trial_end, NOW()) + 30 days
-- Caution 2: Duplicate billing এড়াতে processed_at idempotency check
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: Add subscription_type column to shops
-- 'trial'  → Starter plan, ট্রায়াল চলছে (default)
-- 'paid'   → যেকোনো paid subscription অ্যাক্টিভ
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS subscription_type TEXT NOT NULL DEFAULT 'trial'
    CHECK (subscription_type IN ('trial', 'paid'));

-- Backfill: যাদের plan != 'starter' বা plan_expires_at past হয়ে গেছে
-- তাদের 'paid' হিসেবে mark করুন যদি তারা verified payment করে থাকেন
UPDATE public.shops s
SET subscription_type = 'paid'
WHERE s.plan != 'starter'
   OR EXISTS (
     SELECT 1 FROM public.manual_payments mp
     WHERE mp.shop_id = s.id
       AND mp.purpose = 'plan_upgrade'
       AND mp.status = 'verified'
   );

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: Add processed_at to manual_payments for idempotency
-- (Duplicate billing এড়ানো — এই field থাকলে trigger আর কাজ করবে না)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.manual_payments
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ DEFAULT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: Create the trigger function
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_payment_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trial_end     TIMESTAMPTZ;
  v_new_start     TIMESTAMPTZ;
  v_new_expires   TIMESTAMPTZ;
BEGIN
  -- ── Idempotency Guard ──────────────────────────────────────────────────────
  -- যদি এই payment আগেই process হয়ে থাকে, তাহলে কিছু করব না
  IF NEW.processed_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- ── Only fire for 'plan_upgrade' payments being verified ──────────────────
  IF NEW.status = 'verified' AND OLD.status != 'verified' AND NEW.purpose = 'plan_upgrade' THEN

    -- Shop-এর বর্তমান trial end date fetch করুন
    SELECT plan_expires_at INTO v_trial_end
    FROM public.shops
    WHERE id = NEW.shop_id;

    -- ⚠️ Caution 1: Trial কাটা যাবে না
    -- যদি trial এখনো চলছে (ভবিষ্যতে), পেইড plan trial শেষ হওয়ার পরে শুরু হবে
    -- যদি trial শেষ হয়ে গেছে বা নেই, এখন থেকেই শুরু হবে
    v_new_start := GREATEST(COALESCE(v_trial_end, NOW()), NOW());

    -- পেইড subscription = নতুন শুরুর তারিখ থেকে ৩০ দিন
    v_new_expires := v_new_start + INTERVAL '30 days';

    -- Shop আপডেট করুন
    UPDATE public.shops
    SET
      plan_expires_at    = v_new_expires,
      subscription_type  = 'paid'
    WHERE id = NEW.shop_id;

    -- ⚠️ Caution 2: Duplicate billing এড়াতে processed_at সেট করুন
    NEW.processed_at := NOW();

    RAISE LOG '[EngazeUp] Payment % verified → shop % | trial_end=% | new_expires=%',
      NEW.id, NEW.shop_id, v_trial_end, v_new_expires;

  END IF;

  -- SMS recharge verification — শুধু credits যোগ করুন
  IF NEW.status = 'verified' AND OLD.status != 'verified' AND NEW.purpose = 'sms_recharge' THEN
    IF NEW.processed_at IS NULL THEN
      -- Credits amount থেকে ক্যালকুলেট করুন (প্রতি ১ টাকা = ১ ক্রেডিট)
      -- SMS প্যাকেজ: 100৳=100cr, 500৳=500cr, 980৳=1000cr, 4500৳=5000cr
      UPDATE public.shops
      SET sms_credits = sms_credits + (
        CASE NEW.amount
          WHEN 100  THEN 100
          WHEN 500  THEN 500
          WHEN 980  THEN 1000
          WHEN 4500 THEN 5000
          ELSE NEW.amount   -- fallback: ১ টাকা = ১ ক্রেডিট
        END
      )
      WHERE id = NEW.shop_id;

      NEW.processed_at := NOW();

      RAISE LOG '[EngazeUp] SMS Recharge % verified → shop % | amount=৳%',
        NEW.id, NEW.shop_id, NEW.amount;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: Attach trigger to manual_payments
-- ─────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS on_payment_verified ON public.manual_payments;

CREATE TRIGGER on_payment_verified
  BEFORE UPDATE ON public.manual_payments
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_payment_verified();

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5: Security — Admin-only policy for manual_payments updates
-- (শুধু authenticated admin users আপডেট করতে পারবেন)
-- ─────────────────────────────────────────────────────────────────────────────
-- Note: manual_payments update কে RLS দিয়ে restrict করুন যাতে
-- শুধু service_role বা super_admin করতে পারেন।
-- বর্তমান RLS setup অনুযায়ী users নিজের payments দেখতে পারেন (SELECT)
-- কিন্তু UPDATE শুধু admin করবেন (Supabase dashboard বা service_role key দিয়ে)
