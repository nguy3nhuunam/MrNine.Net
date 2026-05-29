-- Tuần 6A: Resend low-balance alert tracking
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS low_balance_notified_at timestamptz;
