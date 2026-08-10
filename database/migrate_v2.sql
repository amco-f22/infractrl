-- ==========================================
-- Migration v2: Run against your EXISTING Supabase database
-- Safe to run multiple times (uses IF EXISTS / IF NOT EXISTS)
-- ==========================================

-- 1. Add new columns to requests table
ALTER TABLE requests ADD COLUMN IF NOT EXISTS aws_resource_id VARCHAR(255);
ALTER TABLE requests ADD COLUMN IF NOT EXISTS failed_reason TEXT;

-- 2. Drop the dead 'resources' table (was never used by any workflow)
DROP TABLE IF EXISTS resources;

-- 3. Create audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES requests(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    actor VARCHAR(255) NOT NULL,
    details TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id ON audit_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Verify:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'requests';
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
