// Canonical pure-server schema. API startup and SQL export consume this list.
// Additive upgrades retain data; v2/Express schemas need a separate audited conversion.
const statements = Object.freeze([
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('homeowner', 'contractor', 'admin')),
    full_name TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    profile JSONB NOT NULL DEFAULT '{}'::jsonb,
    wallet JSONB,
    is_verified BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_status TEXT NOT NULL DEFAULT 'legacy_unverified',
    verification_channel TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile JSONB NOT NULL DEFAULT '{}'::jsonb`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet JSONB`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT TRUE`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'legacy_unverified'`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_channel TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
  `CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email))`,
  `CREATE INDEX IF NOT EXISTS idx_users_role ON users (role)`,
  `CREATE TABLE IF NOT EXISTS wallet_challenges (
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
  )`,
  `CREATE INDEX IF NOT EXISTS idx_wallet_challenges_expiry ON wallet_challenges (expires_at)`,
  `DELETE FROM wallet_challenges WHERE expires_at <= NOW()`,
  `CREATE TABLE IF NOT EXISTS user_documents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    file_name TEXT NOT NULL DEFAULT '',
    mime_type TEXT NOT NULL DEFAULT '',
    file_data_url TEXT NOT NULL DEFAULT '',
    file_size INTEGER NOT NULL DEFAULT 0,
    file_sha256 TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected')),
    review_note TEXT NOT NULL DEFAULT '',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS file_data_url TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS file_size INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS file_sha256 TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0)`,
  `ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS review_note TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
  `ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ`,
  `ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS reviewed_by INTEGER`,
  `ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_user_documents_user_type ON user_documents (user_id, document_type)`,
  `CREATE INDEX IF NOT EXISTS idx_user_documents_status ON user_documents (status)`,
  `CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    homeowner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'general',
    budget_min INTEGER NOT NULL DEFAULT 0,
    budget_max INTEGER NOT NULL DEFAULT 0,
    location TEXT NOT NULL DEFAULT '',
    timeline_days INTEGER NOT NULL DEFAULT 30,
    status TEXT NOT NULL DEFAULT 'open',
    escrow_id INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS bids (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    contractor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    proposed_timeline_days INTEGER NOT NULL DEFAULT 30,
    message TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS escrow_contracts (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    homeowner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contractor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_amount INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS milestones (
    id SERIAL PRIMARY KEY,
    escrow_id INTEGER NOT NULL REFERENCES escrow_contracts(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    amount INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    verified_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS milestone_chain_txs (
    id SERIAL PRIMARY KEY,
    milestone_id INTEGER NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
    escrow_id INTEGER NOT NULL REFERENCES escrow_contracts(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('submitms', 'approvems', 'releasems', 'disputems')),
    tx_id TEXT UNIQUE NOT NULL,
    chain_id TEXT NOT NULL DEFAULT '',
    contract_account TEXT NOT NULL DEFAULT 'gcscrow1111',
    actor TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'broadcast',
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    verification_error TEXT
  )`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS escrow_id INTEGER`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
  `ALTER TABLE bids ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
  `ALTER TABLE escrow_contracts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
  `ALTER TABLE milestones ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
  `ALTER TABLE milestone_chain_txs ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'broadcast'`,
  `ALTER TABLE milestone_chain_txs ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ`,
  `ALTER TABLE milestone_chain_txs ADD COLUMN IF NOT EXISTS verification_error TEXT`,
  `ALTER TABLE milestone_chain_txs DROP CONSTRAINT IF EXISTS milestone_chain_txs_action_check`,
  `UPDATE milestone_chain_txs
  SET action = CASE action
    WHEN 'submitmilestone' THEN 'submitms'
    WHEN 'approvemilestone' THEN 'approvems'
    WHEN 'releasemilestone' THEN 'releasems'
    WHEN 'disputemilestone' THEN 'disputems'
    ELSE action
  END
  WHERE action IN ('submitmilestone', 'approvemilestone', 'releasemilestone', 'disputemilestone')`,
  `ALTER TABLE milestone_chain_txs
  ADD CONSTRAINT milestone_chain_txs_action_check
  CHECK (action IN ('submitms', 'approvems', 'releasems', 'disputems'))`,
  `CREATE INDEX IF NOT EXISTS idx_projects_homeowner ON projects (homeowner_id)`,
  `CREATE INDEX IF NOT EXISTS idx_projects_status ON projects (status)`,
  `CREATE INDEX IF NOT EXISTS idx_bids_project ON bids (project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bids_contractor ON bids (contractor_id)`,
  `CREATE INDEX IF NOT EXISTS idx_escrow_homeowner ON escrow_contracts (homeowner_id)`,
  `CREATE INDEX IF NOT EXISTS idx_escrow_contractor ON escrow_contracts (contractor_id)`,
  `CREATE INDEX IF NOT EXISTS idx_milestones_escrow ON milestones (escrow_id)`,
  `CREATE INDEX IF NOT EXISTS idx_milestone_chain_txs_milestone ON milestone_chain_txs (milestone_id)`,
  `CREATE INDEX IF NOT EXISTS idx_milestone_chain_txs_escrow ON milestone_chain_txs (escrow_id)`,
  `CREATE INDEX IF NOT EXISTS idx_milestone_chain_txs_status ON milestone_chain_txs (status)`,
  `CREATE TABLE IF NOT EXISTS payment_receipts (
    id SERIAL PRIMARY KEY,
    tx_hash TEXT UNIQUE NOT NULL,
    kind TEXT NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    from_account TEXT NOT NULL DEFAULT '',
    amount TEXT NOT NULL,
    block_num BIGINT,
    project_id INTEGER REFERENCES projects(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS lead_tokens (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    tx_hash TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS project_access_entitlements (
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    contractor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'refunded', 'revoked')),
    provider_payment_id TEXT NOT NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (project_id, contractor_id),
    CHECK (status <> 'paid' OR (provider_payment_id <> '' AND verified_at IS NOT NULL))
  )`,
  `CREATE TABLE IF NOT EXISTS project_access_purchases (
    id UUID PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    contractor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    request_key UUID NOT NULL,
    price_version TEXT NOT NULL CHECK (price_version ~ '^[a-zA-Z0-9_-]{1,64}$'),
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0 AND amount_cents <= 100000000),
    currency TEXT NOT NULL CHECK (currency = 'usd'),
    provider_mode TEXT NOT NULL CHECK (provider_mode = 'test'),
    provider_request_key TEXT UNIQUE NOT NULL,
    provider_checkout_id TEXT UNIQUE,
    checkout_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','expired','refunded','revoked','review_required')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (contractor_id, request_key),
    CHECK (expires_at > created_at),
    CHECK ((provider_checkout_id IS NULL) = (checkout_url IS NULL)),
    CHECK (provider_checkout_id IS NULL OR provider_checkout_id ~ '^cs_test_[a-zA-Z0-9]+$'),
    CHECK (provider_request_key = 'gcsc_lead_' || id::text)
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_project_access_active_purchase
    ON project_access_purchases (project_id, contractor_id) WHERE status IN ('pending','paid','review_required')`,
  `CREATE TABLE IF NOT EXISTS project_access_checkout_bindings (
    provider_checkout_id TEXT PRIMARY KEY CHECK (provider_checkout_id ~ '^cs_test_[a-zA-Z0-9]{1,247}$'),
    purchase_id UUID NOT NULL UNIQUE REFERENCES project_access_purchases(id) ON DELETE RESTRICT,
    payment_intent_id TEXT UNIQUE CHECK (payment_intent_id ~ '^pi_[a-zA-Z0-9]{1,252}$'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider_checkout_id,purchase_id)
  )`,
  `INSERT INTO project_access_checkout_bindings (provider_checkout_id,purchase_id)
    SELECT provider_checkout_id,id FROM project_access_purchases WHERE provider_checkout_id IS NOT NULL
    ON CONFLICT DO NOTHING`,
  `DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM project_access_purchases p
      WHERE p.provider_checkout_id IS NOT NULL AND NOT EXISTS
        (SELECT 1 FROM project_access_checkout_bindings b
          WHERE b.provider_checkout_id=p.provider_checkout_id AND b.purchase_id=p.id)) THEN
      RAISE EXCEPTION 'Conflicting stored Checkout bindings; migration stopped';
    END IF;
  END $$`,
  `CREATE TABLE IF NOT EXISTS project_access_refund_bindings (
    refund_id TEXT PRIMARY KEY CHECK (refund_id ~ '^re_[a-zA-Z0-9]{1,252}$'),
    purchase_id UUID NOT NULL REFERENCES project_access_purchases(id) ON DELETE RESTRICT,
    payment_intent_id TEXT NOT NULL CHECK (payment_intent_id ~ '^pi_[a-zA-Z0-9]{1,252}$'),
    charge_id TEXT NOT NULL CHECK (charge_id ~ '^ch_[a-zA-Z0-9]{1,252}$'),
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0 AND amount_cents <= 100000000),
    currency TEXT NOT NULL CHECK (currency='usd'),
    provider_created BIGINT NOT NULL CHECK (provider_created > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS project_access_dispute_bindings (
    dispute_id TEXT PRIMARY KEY CHECK (dispute_id ~ '^du_[a-zA-Z0-9]{1,252}$'),
    purchase_id UUID NOT NULL REFERENCES project_access_purchases(id) ON DELETE RESTRICT,
    payment_intent_id TEXT NOT NULL CHECK (payment_intent_id ~ '^pi_[a-zA-Z0-9]{1,252}$'),
    charge_id TEXT NOT NULL CHECK (charge_id ~ '^ch_[a-zA-Z0-9]{1,252}$'),
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0 AND amount_cents <= 100000000),
    currency TEXT NOT NULL CHECK (currency='usd'),
    provider_created BIGINT NOT NULL CHECK (provider_created > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS project_access_unbound_events (
    event_id TEXT PRIMARY KEY CHECK (event_id ~ '^evt_[a-zA-Z0-9]{1,251}$'),
    event_type TEXT NOT NULL CHECK (event_type IN ('refund.created','refund.updated',
      'charge.dispute.created','charge.dispute.updated','charge.dispute.closed')),
    provider_mode TEXT NOT NULL DEFAULT 'test' CHECK (provider_mode='test'),
    api_version TEXT NOT NULL,
    provider_created BIGINT NOT NULL CHECK (provider_created > 0),
    payload_sha256 TEXT NOT NULL CHECK (payload_sha256 ~ '^[a-f0-9]{64}$'),
    payment_intent_id TEXT NOT NULL CHECK (payment_intent_id ~ '^pi_[a-zA-Z0-9]{1,252}$'),
    object_id TEXT NOT NULL,
    charge_id TEXT NOT NULL CHECK (charge_id ~ '^ch_[a-zA-Z0-9]{1,252}$'),
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0 AND amount_cents <= 100000000),
    currency TEXT NOT NULL CHECK (currency='usd'),
    object_created BIGINT NOT NULL CHECK (object_created > 0 AND object_created <= provider_created),
    dispute_status TEXT,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK ((event_type IN ('refund.created','refund.updated')
        AND object_id ~ '^re_[a-zA-Z0-9]{1,252}$' AND dispute_status IS NULL)
      OR (event_type IN ('charge.dispute.created','charge.dispute.updated','charge.dispute.closed')
        AND object_id ~ '^du_[a-zA-Z0-9]{1,252}$' AND dispute_status IS NOT NULL
        AND dispute_status IN ('needs_response','under_review','won','lost','warning_needs_response','warning_under_review','warning_closed')
        AND (event_type <> 'charge.dispute.closed' OR dispute_status IN ('won','lost','warning_closed'))))
  )`,
  `CREATE INDEX IF NOT EXISTS project_access_unbound_events_intent
    ON project_access_unbound_events(payment_intent_id)`,
  `CREATE TABLE IF NOT EXISTS project_access_checkout_events (
    event_id TEXT PRIMARY KEY CHECK (event_id ~ '^evt_[a-zA-Z0-9]{1,251}$'),
    purchase_id UUID NOT NULL REFERENCES project_access_purchases(id) ON DELETE RESTRICT,
    provider_mode TEXT NOT NULL DEFAULT 'test' CHECK (provider_mode='test'),
    provider_checkout_id TEXT NOT NULL CHECK (provider_checkout_id ~ '^cs_test_[a-zA-Z0-9]{1,247}$'),
    event_type TEXT NOT NULL CHECK (event_type IN ('checkout.session.completed','checkout.session.expired')),
    api_version TEXT NOT NULL,
    provider_created BIGINT NOT NULL CHECK (provider_created > 0),
    payload_sha256 TEXT NOT NULL CHECK (payload_sha256 ~ '^[a-f0-9]{64}$'),
    payment_status TEXT NOT NULL CHECK (payment_status IN ('paid','unpaid')),
    payment_intent_id TEXT CHECK (payment_intent_id ~ '^pi_[a-zA-Z0-9]{1,252}$'),
    status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received','processed','review_required')),
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (provider_checkout_id,purchase_id)
      REFERENCES project_access_checkout_bindings (provider_checkout_id,purchase_id) ON DELETE RESTRICT,
    CHECK (payment_status <> 'paid' OR payment_intent_id IS NOT NULL),
    CHECK (event_type <> 'checkout.session.expired' OR payment_status='unpaid')
  )`,
  `CREATE INDEX IF NOT EXISTS idx_project_access_event_purchase
    ON project_access_checkout_events (purchase_id, provider_checkout_id)`,
  `ALTER TABLE project_access_checkout_events ADD COLUMN IF NOT EXISTS purchase_snapshot JSONB`,
  `ALTER TABLE project_access_checkout_events ADD COLUMN IF NOT EXISTS outcome TEXT`,
  `ALTER TABLE project_access_checkout_events ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ`,
  `ALTER TABLE project_access_checkout_events ADD COLUMN IF NOT EXISTS refund_id TEXT
    REFERENCES project_access_refund_bindings(refund_id) ON DELETE RESTRICT`,
  `ALTER TABLE project_access_checkout_events ADD COLUMN IF NOT EXISTS refund_amount_cents INTEGER
    CHECK (refund_amount_cents > 0 AND refund_amount_cents <= 100000000)`,
  `ALTER TABLE project_access_checkout_events ADD COLUMN IF NOT EXISTS dispute_id TEXT
    REFERENCES project_access_dispute_bindings(dispute_id) ON DELETE RESTRICT`,
  `ALTER TABLE project_access_checkout_events ADD COLUMN IF NOT EXISTS dispute_amount_cents INTEGER
    CHECK (dispute_amount_cents > 0 AND dispute_amount_cents <= 100000000)`,
  `ALTER TABLE project_access_checkout_events ADD COLUMN IF NOT EXISTS dispute_status TEXT
    CHECK (dispute_status IN ('needs_response','under_review','won','lost','warning_needs_response','warning_under_review','warning_closed'))`,
  `ALTER TABLE project_access_checkout_events DROP CONSTRAINT IF EXISTS project_access_checkout_events_event_type_check`,
  `ALTER TABLE project_access_checkout_events ADD CONSTRAINT project_access_checkout_events_event_type_check
    CHECK (event_type IN ('checkout.session.completed','checkout.session.expired','refund.created','refund.updated',
      'charge.dispute.created','charge.dispute.updated','charge.dispute.closed'))`,
  `ALTER TABLE project_access_checkout_events DROP CONSTRAINT IF EXISTS project_access_event_refund_shape`,
  `ALTER TABLE project_access_checkout_events ADD CONSTRAINT project_access_event_refund_shape CHECK (
    (event_type IN ('refund.created','refund.updated') AND refund_id IS NOT NULL
      AND refund_amount_cents IS NOT NULL AND payment_intent_id IS NOT NULL AND payment_status='unpaid')
    OR (event_type NOT IN ('refund.created','refund.updated') AND refund_id IS NULL AND refund_amount_cents IS NULL))`,
  `ALTER TABLE project_access_checkout_events DROP CONSTRAINT IF EXISTS project_access_event_dispute_shape`,
  `ALTER TABLE project_access_checkout_events ADD CONSTRAINT project_access_event_dispute_shape CHECK (
    (event_type IN ('charge.dispute.created','charge.dispute.updated','charge.dispute.closed') AND dispute_id IS NOT NULL
      AND dispute_amount_cents IS NOT NULL AND dispute_status IS NOT NULL AND payment_intent_id IS NOT NULL AND payment_status='unpaid'
      AND (event_type <> 'charge.dispute.closed' OR dispute_status IN ('won','lost','warning_closed')))
    OR (event_type NOT IN ('charge.dispute.created','charge.dispute.updated','charge.dispute.closed')
      AND dispute_id IS NULL AND dispute_amount_cents IS NULL AND dispute_status IS NULL))`,
  `CREATE TABLE IF NOT EXISTS job_posting_payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    tx_hash TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `ALTER TABLE payment_receipts ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'confirmed'`,
  `ALTER TABLE payment_receipts ADD COLUMN IF NOT EXISTS verify_error TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE payment_receipts ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ`,
  `CREATE INDEX IF NOT EXISTS idx_payment_receipts_verification ON payment_receipts (verification_status)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_receipts_tx_hash ON payment_receipts (tx_hash)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_tokens_tx_hash ON lead_tokens (tx_hash)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_job_posting_payments_tx_hash ON job_posting_payments (tx_hash)`,
  `CREATE INDEX IF NOT EXISTS idx_payment_receipts_user ON payment_receipts (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_job_posting_payments_project ON job_posting_payments (project_id)`,
  `CREATE TABLE IF NOT EXISTS stripe_payment_intents (
    id SERIAL PRIMARY KEY,
    project_id INTEGER,
    user_id INTEGER,
    payment_intent_id TEXT UNIQUE NOT NULL,
    amount_cents INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'usd',
    status TEXT NOT NULL DEFAULT 'requires_payment_method',
    stripe_mode TEXT NOT NULL DEFAULT 'test',
    client_secret TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `ALTER TABLE stripe_payment_intents ADD COLUMN IF NOT EXISTS project_id INTEGER`,
  `ALTER TABLE stripe_payment_intents ADD COLUMN IF NOT EXISTS user_id INTEGER`,
  `ALTER TABLE stripe_payment_intents ADD COLUMN IF NOT EXISTS amount_cents INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE stripe_payment_intents ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'usd'`,
  `ALTER TABLE stripe_payment_intents ADD COLUMN IF NOT EXISTS stripe_mode TEXT NOT NULL DEFAULT 'test'`,
  `ALTER TABLE stripe_payment_intents ADD COLUMN IF NOT EXISTS client_secret TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE stripe_payment_intents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
  `CREATE INDEX IF NOT EXISTS idx_stripe_payment_intents_project ON stripe_payment_intents (project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_stripe_payment_intents_user ON stripe_payment_intents (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_stripe_payment_intents_status ON stripe_payment_intents (status)`,
  `CREATE TABLE IF NOT EXISTS audit_events (
    id SERIAL PRIMARY KEY,
    actor_id INTEGER,
    target_user_id INTEGER,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL DEFAULT '',
    entity_id INTEGER,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address TEXT NOT NULL DEFAULT '',
    user_agent TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_audit_events_action ON audit_events (action)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON audit_events (actor_id)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_events_target ON audit_events (target_user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_events_created ON audit_events (created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS chat_threads (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    homeowner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contractor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_sequence INTEGER NOT NULL DEFAULT 0 CHECK (last_sequence >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (homeowner_id <> contractor_id),
    UNIQUE (project_id, homeowner_id, contractor_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_chat_threads_homeowner ON chat_threads (homeowner_id, id DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_chat_threads_contractor ON chat_threads (contractor_id, id DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_bids_chat_pair ON bids (project_id, contractor_id)`,
  `CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    thread_id INTEGER NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
    sequence INTEGER NOT NULL CHECK (sequence > 0),
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_message_id UUID NOT NULL,
    text TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 4000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (thread_id, sequence),
    UNIQUE (thread_id, sender_id, client_message_id)
  )`,
  `CREATE TABLE IF NOT EXISTS financing_prechecks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('homeowner', 'contractor', 'admin')),
    product_type TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT '',
    context JSONB NOT NULL DEFAULT '{}'::jsonb,
    safety_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'demo_precheck',
    admin_note TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `ALTER TABLE financing_prechecks ADD COLUMN IF NOT EXISTS state TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE financing_prechecks ADD COLUMN IF NOT EXISTS context JSONB NOT NULL DEFAULT '{}'::jsonb`,
  `ALTER TABLE financing_prechecks ADD COLUMN IF NOT EXISTS safety_acknowledged BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE financing_prechecks ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'demo_precheck'`,
  `ALTER TABLE financing_prechecks ADD COLUMN IF NOT EXISTS admin_note TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE financing_prechecks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
  `CREATE INDEX IF NOT EXISTS idx_financing_prechecks_user ON financing_prechecks (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_financing_prechecks_status ON financing_prechecks (status)`,
]);

module.exports = { statements };
