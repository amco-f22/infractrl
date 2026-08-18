-- ============================================================
-- Migration: Add Live Provisioning Logs Support
-- Safe to run on live Supabase DB (all additive, no drops)
-- Run once in Supabase SQL Editor
-- ============================================================

-- 1. Add workflow tracking columns to requests table
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS workflow_run_id TEXT,
  ADD COLUMN IF NOT EXISTS workflow_run_url TEXT;

-- 2. Create provisioning_logs table
CREATE TABLE IF NOT EXISTS provisioning_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
    step TEXT NOT NULL,       -- e.g., "terraform_init", "workflow_start"
    status TEXT NOT NULL,     -- "running", "success", "failed"
    message TEXT NOT NULL,    -- Human-readable log line shown in terminal
    details JSONB DEFAULT '{}', -- Extra data: run_id, run_url, endpoint, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes for fast polling (frontend polls every 2s)
CREATE INDEX IF NOT EXISTS idx_provisioning_logs_request_id
  ON provisioning_logs(request_id);

CREATE INDEX IF NOT EXISTS idx_provisioning_logs_created_at
  ON provisioning_logs(created_at ASC);

-- Done. Verify with:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'requests';
-- SELECT COUNT(*) FROM provisioning_logs;
