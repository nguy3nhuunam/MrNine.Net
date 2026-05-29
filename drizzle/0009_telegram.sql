-- Tuần 18TT: Telegram bot link
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS telegram_chat_id  bigint UNIQUE;

CREATE INDEX IF NOT EXISTS ix_users_telegram_chat ON users(telegram_chat_id);

CREATE TABLE IF NOT EXISTS telegram_link_tokens (
  token       varchar(64) PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_tg_link_user ON telegram_link_tokens(user_id);
