-- ============================================================================
-- GCSC Renovation Module — Database Migration
-- ============================================================================
-- Tables backing the AI Renovation Visualizer & Smart Scope Builder:
--   * renovation_project_drafts     — a homeowner's saved renovation plan
--   * renovation_visual_generations — before/after image generation attempts
--
-- The live server (v3/pure-server.js) also creates these idempotently at
-- startup via initStorage(); this file is the standalone migration for a
-- managed Postgres (mirrors database/*-migration.sql).
--
-- Run: psql "$DATABASE_URL" -f renovation-module-migration.sql
-- ============================================================================

-- 1. Renovation project drafts -----------------------------------------------
CREATE TABLE IF NOT EXISTS renovation_project_drafts (
    id                     SERIAL PRIMARY KEY,
    user_id                INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_type           TEXT NOT NULL DEFAULT '',
    address                TEXT NOT NULL DEFAULT '',
    zip_code               TEXT NOT NULL DEFAULT '',
    user_description       TEXT NOT NULL DEFAULT '',
    style_preference       TEXT NOT NULL DEFAULT '',
    budget_min             INTEGER NOT NULL DEFAULT 0,
    budget_max             INTEGER NOT NULL DEFAULT 0,
    original_image_urls    JSONB NOT NULL DEFAULT '[]'::jsonb,
    generated_image_urls   JSONB NOT NULL DEFAULT '[]'::jsonb,
    scope_of_work_json     JSONB NOT NULL DEFAULT '[]'::jsonb,
    material_categories_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    cost_estimate_json     JSONB NOT NULL DEFAULT '{}'::jsonb,
    timeline_json          JSONB NOT NULL DEFAULT '{}'::jsonb,
    permit_risk_json       JSONB NOT NULL DEFAULT '{}'::jsonb,
    milestones_json        JSONB NOT NULL DEFAULT '[]'::jsonb,
    status                 TEXT NOT NULL DEFAULT 'draft'
                             CHECK (status IN ('draft', 'analyzed', 'converted', 'archived')),
    converted_project_id   INTEGER,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Forward-compatible column adds (safe to re-run on an older table).
ALTER TABLE renovation_project_drafts ADD COLUMN IF NOT EXISTS converted_project_id INTEGER;
ALTER TABLE renovation_project_drafts ADD COLUMN IF NOT EXISTS generated_image_urls JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE renovation_project_drafts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_renovation_drafts_user_id
    ON renovation_project_drafts (user_id);
CREATE INDEX IF NOT EXISTS idx_renovation_drafts_status
    ON renovation_project_drafts (status);

-- 2. Visual generation attempts ----------------------------------------------
CREATE TABLE IF NOT EXISTS renovation_visual_generations (
    id                SERIAL PRIMARY KEY,
    project_draft_id  INTEGER REFERENCES renovation_project_drafts(id) ON DELETE CASCADE,
    provider          TEXT NOT NULL DEFAULT 'mock',
    input_image_url   TEXT NOT NULL DEFAULT '',
    output_image_url  TEXT NOT NULL DEFAULT '',
    prompt            TEXT NOT NULL DEFAULT '',
    status            TEXT NOT NULL DEFAULT 'completed'
                        CHECK (status IN ('pending', 'completed', 'failed')),
    error_message     TEXT NOT NULL DEFAULT '',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_renovation_visuals_draft_id
    ON renovation_visual_generations (project_draft_id);

-- ============================================================================
-- Done. Renovation module tables ready.
-- ============================================================================
