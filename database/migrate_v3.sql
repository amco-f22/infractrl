-- ==========================================
-- Migration v3: Audit Log + Budget Config
-- Run this in Supabase SQL Editor
-- ==========================================

-- 1. Audit Logs table — tracks every action on every request
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES requests(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,         -- created, status_changed, extended, cloned, deleted
    actor VARCHAR(255) NOT NULL,         -- email of who performed the action
    details TEXT,                         -- human-readable description
    metadata JSONB DEFAULT '{}',         -- structured data (old_status, new_status, etc.)
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Index for fast lookups by request_id
CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id ON audit_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 3. Budget limit column on requests (tracks per-user budgets)
-- For MVP, budget limit is hardcoded in the backend. This column is for future use.

-- Verify:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
