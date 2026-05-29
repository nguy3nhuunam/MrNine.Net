-- Tuần 19VV: API key folders/grouping
ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS folder varchar(64);
CREATE INDEX IF NOT EXISTS ix_api_keys_folder ON api_keys(folder);
