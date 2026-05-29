-- Tuần 19WW: Spending limits per API key
ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS monthly_spend_limit_micro_usd  bigint,
  ADD COLUMN IF NOT EXISTS monthly_spend_used_micro_usd   bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS period_start                   timestamptz NOT NULL DEFAULT date_trunc('month', now());
