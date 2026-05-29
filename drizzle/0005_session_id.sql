-- Tuần 16Z: Session-based usage view
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS session_id varchar(128);
CREATE INDEX IF NOT EXISTS ix_requests_session ON requests(session_id);
