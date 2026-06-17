CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  type VARCHAR(32) NOT NULL,
  provider VARCHAR(64) NOT NULL,
  provider_account_id VARCHAR(191) NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT
);

CREATE UNIQUE INDEX accounts_provider_provider_account_id_key
  ON accounts(provider, provider_account_id);

CREATE INDEX accounts_user_id_idx ON accounts(user_id);
