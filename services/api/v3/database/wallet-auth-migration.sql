BEGIN;

CREATE TABLE IF NOT EXISTS wallet_challenges (
  challenge_id TEXT PRIMARY KEY CHECK (challenge_id ~ '^[0-9a-f]{64}$'),
  purpose TEXT NOT NULL CHECK (purpose IN ('link', 'login')),
  audience TEXT NOT NULL,
  chain_id TEXT NOT NULL CHECK (chain_id ~ '^[0-9a-f]{64}$'),
  account_name TEXT NOT NULL,
  permission TEXT NOT NULL,
  session_binding TEXT NOT NULL CHECK (session_binding ~ '^[0-9a-f]{64}$'),
  issued_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  challenge_record JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (expires_at > issued_at)
);

CREATE INDEX IF NOT EXISTS idx_wallet_challenges_expiry
  ON wallet_challenges (expires_at);

DELETE FROM wallet_challenges WHERE expires_at <= NOW();

COMMIT;
