-- Tuần 17QQ: Referral system
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS referral_code           varchar(16) UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by             uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_bonus_granted  boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS ix_users_referred_by ON users(referred_by);
