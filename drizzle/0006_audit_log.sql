-- Tuần 17OO: Admin audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id            serial PRIMARY KEY,
  actor_email   varchar(255),
  action        varchar(64) NOT NULL,
  target_type   varchar(64),
  target_id     varchar(128),
  metadata      jsonb,
  ip            varchar(64),
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_audit_actor   ON audit_log(actor_email);
CREATE INDEX IF NOT EXISTS ix_audit_action  ON audit_log(action);
CREATE INDEX IF NOT EXISTS ix_audit_created ON audit_log(created_at);
