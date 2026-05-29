-- Tuần 7D: Coupons
CREATE TYPE coupon_kind AS ENUM ('fixed_micro_usd', 'fixed_vnd');

CREATE TABLE IF NOT EXISTS coupons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            varchar(64) NOT NULL UNIQUE,
  kind            coupon_kind NOT NULL,
  value_micro_usd bigint      NOT NULL,
  max_redemptions integer     NOT NULL DEFAULT 1,
  redeemed_count  integer     NOT NULL DEFAULT 0,
  expires_at      timestamptz,
  note            text,
  created_by      uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_coupons_code ON coupons(code);

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id                  serial PRIMARY KEY,
  coupon_id           uuid NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  credited_micro_usd  bigint NOT NULL,
  redeemed_at         timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_coupon_redemptions_user ON coupon_redemptions(coupon_id, user_id);
CREATE INDEX IF NOT EXISTS ix_coupon_redemptions_coupon ON coupon_redemptions(coupon_id);
