terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  # ==============================================================================
  # REMOTE STATE: S3 Backend with DynamoDB Locking
  # Prevents concurrent runs from corrupting state.
  # Each request gets its own isolated state file via the key.
  # 
  # SETUP REQUIRED (run once):
  #   aws s3 mb s3://infractl-terraform-state --region us-east-1
  #   aws dynamodb create-table \
  #     --table-name infractl-terraform-locks \
  #     --attribute-definitions AttributeName=LockID,AttributeType=S \
  #     --key-schema AttributeName=LockID,KeyType=HASH \
  #     --billing-mode PAY_PER_REQUEST
  # ==============================================================================
  backend "s3" {
    bucket       = "infractl-terraform-state"
    key          = "state/placeholder.tfstate" # Overridden at runtime via -backend-config
    region       = "us-east-1"
    use_lockfile = true
    encrypt      = true
  }
}

# ------------------------------------------------------------------------------
# Provider Configuration
# ------------------------------------------------------------------------------
provider "aws" {
  region = var.aws_region
}

# ------------------------------------------------------------------------------
# Input Variables
# ------------------------------------------------------------------------------
variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "AWS region"
}

variable "request_id" {
  type        = string
  description = "Request ID from database (UUID) - used as unique state key"
}

variable "resource_type" {
  type        = string
  default     = "postgres"
  description = "Resource type: postgres, redis, or s3"
}

variable "instance_size" {
  type        = string
  description = "Size: small, medium, or large"
}

variable "requester_email" {
  type        = string
  description = "Email of person who requested this"
}

variable "environment" {
  type        = string
  description = "Environment: dev, staging, or prod"
}

# ------------------------------------------------------------------------------
# Local Values
# ------------------------------------------------------------------------------
locals {
  # Mapping user-friendly sizes to AWS RDS instance classes
  rds_instance_class_map = {
    small  = "db.t3.micro"
    medium = "db.t3.small"
    large  = "db.t3.medium"
  }
  rds_instance_class = lookup(local.rds_instance_class_map, var.instance_size, "db.t3.micro")

  common_tags = {
    RequestID   = var.request_id
    Owner       = var.requester_email
    Environment = var.environment
    ManagedBy   = "infractl"
    ExpiryDate  = timeadd(timestamp(), "168h") # 7 days
  }
}

# ==============================================================================
# NETWORKING: Use the default VPC and its subnets
# RDS requires a DB subnet group spanning at least 2 AZs.
# Without this, terraform apply fails: "No subnet group found"
# ==============================================================================
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

resource "aws_db_subnet_group" "infractl" {
  count      = var.resource_type == "postgres" ? 1 : 0
  name       = "infractl-${var.request_id}"
  subnet_ids = data.aws_subnets.default.ids

  tags = merge(local.common_tags, {
    Name = "infractl-subnet-${var.request_id}"
  })
}

variable "allowed_ip" {
  type        = string
  default     = ""
  description = "Your IP address for security group ingress (e.g. 203.0.113.5/32). Leave empty to skip SG creation."
}

# ==============================================================================
# SECURITY GROUP: Locks down RDS to a specific IP, not the entire internet
# ==============================================================================
resource "aws_security_group" "rds_access" {
  count       = var.resource_type == "postgres" && var.allowed_ip != "" ? 1 : 0
  name        = "infractl-rds-${var.request_id}"
  description = "Restrict RDS access to deployer IP only"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "PostgreSQL from allowed IP"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ip]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "infractl-rds-${var.request_id}"
  })
}

# ==============================================================================
# POSTGRES MODULE (conditional: only runs when resource_type = "postgres")
# ==============================================================================
resource "random_password" "db_password" {
  count            = var.resource_type == "postgres" ? 1 : 0
  length           = 16
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_db_instance" "postgres" {
  count = var.resource_type == "postgres" ? 1 : 0

  identifier              = "infractl-${var.request_id}"
  engine                  = "postgres"
  engine_version          = "16.14"
  instance_class          = local.rds_instance_class
  allocated_storage       = 20
  max_allocated_storage   = 100
  storage_type            = "gp3"
  db_name                 = "postgres"
  username                = "infraadmin"
  password                = random_password.db_password[0].result
  publicly_accessible     = var.allowed_ip != "" ? true : false
  vpc_security_group_ids  = var.allowed_ip != "" ? [aws_security_group.rds_access[0].id] : []
  db_subnet_group_name    = aws_db_subnet_group.infractl[0].name
  storage_encrypted       = true
  skip_final_snapshot     = true
  backup_retention_period = 7
  deletion_protection     = false

  tags = merge(local.common_tags, {
    Name         = "infractl-${var.request_id}"
    ResourceType = "postgres"
  })
}

# ==============================================================================
# REDIS MODULE (conditional: only runs when resource_type = "redis")
# TODO: Add ElastiCache configuration here in a future phase
# ==============================================================================
# resource "aws_elasticache_cluster" "redis" {
#   count            = var.resource_type == "redis" ? 1 : 0
#   cluster_id       = "infractl-${substr(var.request_id, 0, 16)}"
#   engine           = "redis"
#   node_type        = "cache.t3.micro"
#   num_cache_nodes  = 1
#   tags = merge(local.common_tags, { ResourceType = "redis" })
# }

# ==============================================================================
# S3 MODULE (conditional: only runs when resource_type = "s3")
# TODO: Add S3 bucket configuration here in a future phase
# ==============================================================================
# resource "aws_s3_bucket" "storage" {
#   count  = var.resource_type == "s3" ? 1 : 0
#   bucket = "infractl-${var.request_id}"
#   tags   = merge(local.common_tags, { ResourceType = "s3" })
# }

# ------------------------------------------------------------------------------
# Outputs (null-safe for non-postgres types)
# ------------------------------------------------------------------------------
output "endpoint" {
  description = "Resource endpoint"
  value       = var.resource_type == "postgres" ? aws_db_instance.postgres[0].endpoint : "N/A - configure module for ${var.resource_type}"
}

output "connection_string" {
  description = "Full connection string (postgres only)"
  value       = var.resource_type == "postgres" ? "postgresql://infraadmin:${random_password.db_password[0].result}@${aws_db_instance.postgres[0].endpoint}/postgres" : "N/A"
  sensitive   = true
}

output "aws_resource_id" {
  description = "AWS resource identifier for cleanup targeting"
  value       = var.resource_type == "postgres" ? aws_db_instance.postgres[0].id : "N/A"
}
