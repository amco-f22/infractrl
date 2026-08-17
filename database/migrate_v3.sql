-- ==========================================
-- Migration V3: Add allowed_ip for Dynamic Security Groups
-- ==========================================

-- Add allowed_ip column to store the user's public IP address
-- This is passed to Terraform to restrict the RDS Security Group
ALTER TABLE requests ADD COLUMN IF NOT EXISTS allowed_ip VARCHAR(50);
