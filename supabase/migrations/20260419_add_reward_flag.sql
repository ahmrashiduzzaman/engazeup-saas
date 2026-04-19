-- Migration: Add reward_customer_list_claimed column to shops table
-- Safe to run on existing data — uses IF NOT EXISTS pattern
-- Adding a nullable boolean with default FALSE so old rows are unaffected

ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS reward_customer_list_claimed BOOLEAN NOT NULL DEFAULT FALSE;

-- Index is NOT needed (single-row lookup by shop id is already PK-indexed)
-- No existing queries or Edge Functions touch this column, so zero breakage risk.
