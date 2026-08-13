#!/bin/bash
# ==============================================================================
# bootstrap_aws.sh — One-time AWS setup for InfraCtrl
#
# Run this ONCE before your first terraform apply or GitHub Actions run.
# Requires: AWS CLI configured with admin-level access
# ==============================================================================

set -e

REGION="us-east-1"
STATE_BUCKET="infractl-terraform-state"
LOCK_TABLE="infractl-terraform-locks"
GITHUB_ORG="amco-f22"           # <-- CHANGE to your GitHub username/org
GITHUB_REPO="infractl-simple"   # <-- CHANGE to your repo name
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "=== InfraCtrl AWS Bootstrap ==="
echo "Account: $ACCOUNT_ID"
echo "Region:  $REGION"
echo ""

# --------------------------------------------------------------------------
# 1. Create S3 bucket for Terraform state
# --------------------------------------------------------------------------
echo "[1/4] Creating S3 state bucket: $STATE_BUCKET..."
aws s3api create-bucket \
  --bucket "$STATE_BUCKET" \
  --region "$REGION" \
  2>/dev/null || echo "  Bucket already exists — OK"

aws s3api put-bucket-versioning \
  --bucket "$STATE_BUCKET" \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket "$STATE_BUCKET" \
  --server-side-encryption-configuration '{
    "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
  }'

echo "  ✅ S3 bucket ready (versioned + encrypted)"

# --------------------------------------------------------------------------
# 2. (Removed) DynamoDB lock table is no longer needed (using S3 use_lockfile)
# --------------------------------------------------------------------------
# 3. Create GitHub OIDC provider (if not exists)
# --------------------------------------------------------------------------
echo "[3/4] Creating GitHub OIDC identity provider..."
aws iam create-open-id-connect-provider \
  --url "https://token.actions.githubusercontent.com" \
  --client-id-list "sts.amazonaws.com" \
  --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1" \
  2>/dev/null || echo "  OIDC provider already exists — OK"

echo "  ✅ GitHub OIDC provider registered"

# --------------------------------------------------------------------------
# 4. Create IAM Role with minimal policy (scoped to this repo only)
# --------------------------------------------------------------------------
ROLE_NAME="InfraCtrlGitHubActionsRole"

echo "[4/4] Creating IAM role: $ROLE_NAME..."

# Trust policy: ONLY this specific GitHub repo can assume this role
TRUST_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
      },
      "StringLike": {
        "token.actions.githubusercontent.com:sub": "repo:${GITHUB_ORG}/${GITHUB_REPO}:*"
      }
    }
  }]
}
EOF
)

aws iam create-role \
  --role-name "$ROLE_NAME" \
  --assume-role-policy-document "$TRUST_POLICY" \
  2>/dev/null || echo "  Role already exists — OK"

# Minimal permissions policy — NOT AdministratorAccess
PERMISSIONS_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RDSInstanceManagement",
      "Effect": "Allow",
      "Action": [
        "rds:CreateDBInstance",
        "rds:DeleteDBInstance",
        "rds:DescribeDBInstances",
        "rds:ModifyDBInstance",
        "rds:ListTagsForResource",
        "rds:AddTagsToResource",
        "rds:RemoveTagsFromResource"
      ],
      "Resource": "arn:aws:rds:${REGION}:${ACCOUNT_ID}:db:infractl-*"
    },
    {
      "Sid": "RDSSubnetGroupManagement",
      "Effect": "Allow",
      "Action": [
        "rds:CreateDBSubnetGroup",
        "rds:DeleteDBSubnetGroup",
        "rds:DescribeDBSubnetGroups",
        "rds:AddTagsToResource",
        "rds:RemoveTagsFromResource"
      ],
      "Resource": "arn:aws:rds:${REGION}:${ACCOUNT_ID}:subgrp:infractl-*"
    },
    {
      "Sid": "EC2NetworkAndSecurityGroup",
      "Effect": "Allow",
      "Action": [
        "ec2:CreateSecurityGroup",
        "ec2:DeleteSecurityGroup",
        "ec2:AuthorizeSecurityGroupIngress",
        "ec2:AuthorizeSecurityGroupEgress",
        "ec2:RevokeSecurityGroupIngress",
        "ec2:RevokeSecurityGroupEgress",
        "ec2:DescribeSecurityGroups",
        "ec2:DescribeVpcs",
        "ec2:DescribeSubnets",
        "ec2:DescribeAvailabilityZones",
        "ec2:CreateTags",
        "ec2:DeleteTags"
      ],
      "Resource": "*"
    },
    {
      "Sid": "TerraformStateAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::${STATE_BUCKET}",
        "arn:aws:s3:::${STATE_BUCKET}/*"
      ]
    }
  ]
}
EOF
)

POLICY_ARN="arn:aws:iam::${ACCOUNT_ID}:policy/InfraCtrlMinimalPolicy"

aws iam create-policy \
  --policy-name "InfraCtrlMinimalPolicy" \
  --policy-document "$PERMISSIONS_POLICY" \
  2>/dev/null || echo "  Policy already exists — OK"

aws iam attach-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-arn "$POLICY_ARN" \
  2>/dev/null || echo "  Policy already attached — OK"

ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query Role.Arn --output text)

echo "  ✅ IAM role ready"
echo ""
echo "=== SETUP COMPLETE ==="
echo ""
echo "Next steps:"
echo "  1. Add this to GitHub Secrets as GH_ACTIONS_ROLE_ARN:"
echo "     $ROLE_ARN"
echo ""
echo "  2. Set an AWS Budget alert (recommended: \$10 threshold):"
echo "     https://console.aws.amazon.com/billing/home#/budgets"
echo ""
echo "  3. Find your current IP for the allowed_ip Terraform variable:"
echo "     curl -s https://checkip.amazonaws.com"
echo ""
