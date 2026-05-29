-- Tuần 19UU: TOTP 2FA
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS totp_secret      varchar(64),
  ADD COLUMN IF NOT EXISTS totp_enabled     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recovery_codes   jsonb;
