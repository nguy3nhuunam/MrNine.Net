-- Tuần 10S: Webhook delivery retry queue
CREATE TYPE webhook_delivery_status AS ENUM ('pending', 'succeeded', 'failed');

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id              serial PRIMARY KEY,
  webhook_id      uuid NOT NULL REFERENCES user_webhooks(id) ON DELETE CASCADE,
  event           varchar(64) NOT NULL,
  payload         jsonb NOT NULL,
  status          webhook_delivery_status NOT NULL DEFAULT 'pending',
  attempts        integer NOT NULL DEFAULT 0,
  next_retry_at   timestamptz NOT NULL DEFAULT now(),
  last_status     integer,
  last_error      text,
  created_at      timestamptz DEFAULT now(),
  completed_at    timestamptz
);
CREATE INDEX IF NOT EXISTS ix_webhook_deliveries_pending ON webhook_deliveries(status, next_retry_at);
CREATE INDEX IF NOT EXISTS ix_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
