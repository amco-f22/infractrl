-- ==========================================
-- InfraCtrl Database Schema
-- Purpose: Developer Self-Service Portal
-- Database: PostgreSQL
-- ==========================================

-- Clean up existing tables (ordered to respect FK constraints)
DROP TABLE IF EXISTS provisioning_logs;
DROP TABLE IF EXISTS requests;

-- ==========================================
-- 1. REQUESTS TABLE (single source of truth)
-- Purpose: Store infrastructure requests from users
-- Status flow: pending -> provisioning -> ready -> failed/deleted
-- Note: aws_resource_id and connection_string are populated by
--       .github/scripts/update_status.py after Terraform succeeds.
-- ==========================================
CREATE TABLE requests (
    -- Unique identifier for the request
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User information
    requester_name VARCHAR(255) NOT NULL,
    requester_email VARCHAR(255) NOT NULL,
    
    -- Request details
    resource_type VARCHAR(50) DEFAULT 'postgres', -- Type: postgres, redis, s3
    environment VARCHAR(50) NOT NULL,            -- Env: dev, staging, prod
    instance_size VARCHAR(50) NOT NULL,          -- Size: small, medium, large
    allowed_ip VARCHAR(50),                      -- IP address for dynamic security group rules
    
    -- Lifecycle management
    status VARCHAR(50) DEFAULT 'pending',         -- pending, provisioning, ready, failed, deleted
    failed_reason TEXT,                           -- Populated if status = 'failed'
    created_at TIMESTAMP DEFAULT NOW(),
    expiry_date DATE,                             -- Auto-deletion target date
    
    -- Provisioning outputs (filled by update_status.py after Terraform succeeds)
    aws_resource_id VARCHAR(255),                 -- e.g., infractl-<uuid> (RDS identifier for precise destroy)
    connection_string TEXT,                       -- Database access string
    db_name VARCHAR(100),                         -- Actual database name created

    -- Live provisioning tracking (populated by GitHub Actions callbacks)
    workflow_run_id TEXT,                         -- GitHub Actions run ID
    workflow_run_url TEXT                         -- Direct link to the Actions run
);

-- ==========================================
-- HELPER QUERIES (Examples)
-- ==========================================

-- List all active requests with their connection strings
-- SELECT requester_name, environment, status, connection_string FROM requests WHERE status = 'ready';

-- Get total estimated monthly cost (uses app-level pricing constants, not a DB column)
-- See frontend PRICING map in page.js and dashboard/page.js

-- Find resources expiring in the next 24 hours
-- SELECT * FROM requests WHERE expiry_date <= CURRENT_DATE + INTERVAL '1 day';

-- ==========================================
-- 3. AUDIT LOGS TABLE
-- Purpose: Track every action for compliance & governance
-- Actions: created, status_changed, extended, cloned, deleted
-- ==========================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Link to the request (nullable — request may be deleted)
    request_id UUID REFERENCES requests(id) ON DELETE SET NULL,
    
    -- Action details
    action VARCHAR(50) NOT NULL,              -- created, status_changed, extended, cloned, deleted
    actor VARCHAR(255) NOT NULL,              -- email of who performed the action
    details TEXT,                              -- human-readable description
    metadata JSONB DEFAULT '{}',              -- structured data (old_status, new_status, etc.)
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast audit queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id ON audit_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ==========================================
-- 4. PROVISIONING LOGS TABLE
-- Purpose: Stream step-by-step progress from GitHub Actions to the frontend
-- Populated by: POST /api/requests/{id}/progress (called from GitHub Actions)
-- Read by:      GET  /api/requests/{id}/logs     (polled by frontend every 2s)
-- ==========================================
CREATE TABLE IF NOT EXISTS provisioning_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Link to the parent request
    request_id UUID REFERENCES requests(id) ON DELETE CASCADE,

    -- Step identity
    step TEXT NOT NULL,         -- e.g., "workflow_start", "terraform_init", "complete"
    status TEXT NOT NULL,       -- "running", "success", "failed"
    message TEXT NOT NULL,      -- Human-readable line shown in terminal
    details JSONB DEFAULT '{}', -- Extra data: run_id, run_url, endpoint, bastion_ip, etc.

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast polling (frontend polls every 2s)
CREATE INDEX IF NOT EXISTS idx_provisioning_logs_request_id ON provisioning_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_provisioning_logs_created_at ON provisioning_logs(created_at ASC);
