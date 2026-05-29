-- Tuần 9M: User webhooks
CREATE TABLE IF NOT EXISTS user_webhooks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url             text NOT NULL,
  secret          varchar(128) NOT NULL,
  events          jsonb NOT NULL DEFAULT '[]'::jsonb,
  enabled         boolean NOT NULL DEFAULT true,
  last_fired_at   timestamptz,
  last_status     integer,
  last_error      text,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_user_webhooks_user ON user_webhooks(user_id);
