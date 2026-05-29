-- Tuần 18SS: Daily digest opt-out
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS digest_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_digest_at timestamptz;
