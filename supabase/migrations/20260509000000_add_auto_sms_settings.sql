-- Migration: Add automated SMS toggle settings
-- Description: Adds boolean fields for controlling automated SMS triggers for shops.

ALTER TABLE public.shops
ADD COLUMN IF NOT EXISTS auto_sms_order_confirmed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS auto_sms_dispatched BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS auto_sms_returned BOOLEAN DEFAULT FALSE;
