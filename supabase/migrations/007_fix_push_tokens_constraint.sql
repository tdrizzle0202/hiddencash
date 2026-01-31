-- Migration 007: Fix push_tokens unique constraint
-- Change from (user_id, token) to (device_id, token)
-- Users can change (anonymous sessions), but devices don't

-- Drop the old constraint
ALTER TABLE push_tokens DROP CONSTRAINT IF EXISTS push_tokens_user_id_token_key;

-- Create new unique index on device_id + token
CREATE UNIQUE INDEX IF NOT EXISTS push_tokens_device_token_unique
ON push_tokens (device_id, token);

-- Also add an index for looking up by token alone (useful for deduplication)
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(token);
