# InfraCtrl — Testing Guide 🧪

A step-by-step guide to set up and test every feature of InfraCtrl locally.

---

## Prerequisites

Before you begin, make sure you have:

| Tool | Version | Check Command |
|---|---|---|
| **Node.js** | 18+ | `node -v` |
| **Python** | 3.11+ | `python --version` |
| **pip** | Latest | `pip --version` |
| **Git** | Any | `git --version` |
| **Supabase Account** | Free tier | [supabase.com](https://supabase.com) |

> **Alternative:** If you have Docker installed, you can skip Supabase entirely and use the local database via `docker-compose up -d`. Then set `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/infractl` in your `.env`.

---

## Step 1: Clone & Install

```bash
# 1. Clone the repository
git clone https://github.com/amco-f22/infractl-simple.git
cd infractl-simple

# 2. Install backend dependencies
cd backend
python -m venv venv

# Windows:
venv\Scripts\activate
# macOS/Linux:
# source venv/bin/activate

pip install -r requirements.txt

# 3. Install frontend dependencies
cd ../frontend
npm install
```

---

## Step 2: Set Up the Database (Supabase)

### 2.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **"New Project"**.
3. Name it `infractl` and set a database password.
4. Wait for the project to finish provisioning (~30 seconds).

### 2.2 Run the Schema

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar).
2. Click **"New Query"**.
3. Copy the **entire contents** of `database/schema.sql` and paste it into the editor.
4. Click **"Run"** (or press `Ctrl+Enter`).
5. You should see: `Success. No rows returned`.

### 2.3 Run the Migrations

Run these in the **same SQL Editor**, one at a time:

**Migration v2** — Adds `aws_resource_id` and `failed_reason` columns:
```sql
-- Copy contents of database/migrate_v2.sql
ALTER TABLE requests ADD COLUMN IF NOT EXISTS aws_resource_id VARCHAR(255);
ALTER TABLE requests ADD COLUMN IF NOT EXISTS failed_reason TEXT;
```

**Migration v3** — Adds the Audit Log table:
```sql
-- Copy contents of database/migrate_v3.sql
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
```

### 2.4 Get Your Connection String

1. In Supabase, go to **Settings → Database**.
2. Under **Connection string**, select **URI**.
3. Choose **Transaction Mode** (port `6543`).
4. Copy the URI — it looks like:
   ```
   postgresql://postgres.xxxx:YOUR_PASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with the database password you set when creating the project.

---

## Step 3: Configure Environment Variables

### 3.1 Backend `.env`

```bash
cd backend
cp env.example .env
```

Edit `backend/.env` and fill in:
```env
DATABASE_URL=postgresql://postgres.xxxx:YOUR_PASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres

# Optional: GitHub Actions integration (leave blank to skip CI/CD testing)
GITHUB_TOKEN=
GITHUB_OWNER=
GITHUB_REPO=

# Optional: Slack notifications (leave blank to skip Slack testing)
SLACK_WEBHOOK_URL=

# Budget limit per user (in USD/month)
BUDGET_LIMIT_PER_USER=200
```

> **Note:** For basic testing, only `DATABASE_URL` is required. GitHub and Slack are optional.

### 3.2 Frontend `.env.local`

```bash
cd ../frontend
```

Create a file called `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Step 4: Start the Servers

Open **two separate terminals**:

**Terminal 1 — Backend:**
```bash
cd backend
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
python main.py
```
Expected output:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```
Expected output:
```
▲ Next.js 16.x (Turbopack)
- Local: http://localhost:3000
✓ Ready in ~800ms
```

---

## Step 5: Test Each Feature

### ✅ Test 1: Health Check

Open your browser and go to:
```
http://localhost:8000
```

**Expected response:**
```json
{"status": "healthy", "app": "InfraCtrl API"}
```

---

### ✅ Test 2: Create a Resource Request

1. Open `http://localhost:3000` in your browser.
2. Fill in the form:
   - **Name:** `Test User`
   - **Email:** `test@example.com`
   - **Resource Type:** Click `PostgreSQL` (should glow blue)
   - **Environment:** `Development`
   - **Instance Size:** `Small — Starter`
3. Click **"⚡ Provision Now"**.
4. **Expected:** A green success message appears with a Request ID and expiry date.

---

### ✅ Test 3: View the Dashboard

1. Click **"Track on dashboard →"** in the success message, or navigate to `http://localhost:3000/dashboard`.
2. **Expected:**
   - The **Metrics Bar** shows: `1 Active Resource`, `$15 Est. Monthly Cost`.
   - The **Resources table** shows your request with status `provisioning`.
   - A green **"+7d"** extend button appears on the row.

---

### ✅ Test 4: Test Duplicate Prevention

1. Go back to `http://localhost:3000`.
2. Fill in the **exact same form** (same resource type + environment):
   - **Name:** `Another User`
   - **Email:** `another@example.com`
   - **Resource Type:** `PostgreSQL`
   - **Environment:** `Development`
3. Click **"⚡ Provision Now"**.
4. **Expected:** A **yellow warning modal** appears saying:
   - *"Similar Resources Exist"*
   - Shows the existing resource from Test User
   - Displays estimated savings (e.g., "$15/mo")
   - Has a **"Use This Instead"** button (copies connection string)
   - Has a **"Create Anyway"** button (red)
5. Click **"Create Anyway"** to proceed, or **"Cancel"** to abort.

---

### ✅ Test 5: Self-Service Expiry Extension

1. Go to `http://localhost:3000/dashboard`.
2. Find your resource in the table.
3. Note the current **Expires** date.
4. Click the green **"+7d"** button on that row.
5. **Expected:**
   - The page refreshes.
   - The **Expires** date has moved forward by 7 days.
   - The Audit Log (Tab 2) shows: `📅 Expiry extended from ... to ...`

---

### ✅ Test 6: Audit Log

1. On the Dashboard, click the **"Audit Log"** tab.
2. **Expected:** You see a feed of all actions:
   - `🆕 Created postgres/dev/small` — from Test 2
   - `📅 Expiry extended from ... to ...` — from Test 5
   - Each entry shows the actor (email) and timestamp.

---

### ✅ Test 7: Budget Warning

1. Create **multiple resources** for the same email (e.g., 5+ medium instances for `test@example.com`).
2. When the total estimated cost exceeds `$200/mo` (the default budget), the success message will include:
   - ⚠️ *"This will put you at $XXX/$200 monthly budget."*
3. **To test via API directly:**
   ```bash
   curl http://localhost:8000/api/budget/test@example.com
   ```
   **Expected response:**
   ```json
   {
     "email": "test@example.com",
     "current_spend": 43,
     "budget_limit": 200,
     "remaining": 157,
     "over_budget": false,
     "utilization_pct": 21.5,
     "active_resources": 3
   }
   ```

---

### ✅ Test 8: Clone Teammate's Setup

1. Make sure you have at least **one active resource** (from Test 2).
2. Navigate to `http://localhost:3000/onboarding`.
3. **Expected:** You see:
   - A **"Your Details"** form (Name + Email)
   - A card for each team member who has active resources
   - Their resource badges (e.g., `postgres`) and total cost
4. Fill in your details:
   - **Name:** `New Developer`
   - **Email:** `newdev@example.com`
5. Click **"Clone This Setup"** on a teammate's card.
6. **Expected:**
   - A green success screen: *"Setup Cloned! X resource(s) are now provisioning."*
   - Click "View Dashboard" to see the newly cloned resources.
7. Go to `http://localhost:3000/dashboard`.
   - **Expected:** You now see the original + cloned resources in the table.

---

### ✅ Test 9: Multiple Resource Types

1. Go to `http://localhost:3000`.
2. Create resources with **different types**:
   - `PostgreSQL / dev / small` → Cost preview shows **$15**
   - `Redis / staging / medium` → Cost preview shows **$20**
   - `S3 / prod / large` → Cost preview shows **$30**
3. **Expected:** The preview card on the right changes:
   - Different icon and glow color for each type
   - Cost updates in real-time as you switch

---

### ✅ Test 10: Status Update (Simulating Terraform Completion)

Since you may not have AWS configured, you can **manually simulate** a Terraform success:

```bash
curl -X POST http://localhost:8000/api/requests/YOUR_REQUEST_ID/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ready",
    "connection_string": "postgresql://admin:secret123@infractl-demo.us-east-1.rds.amazonaws.com:5432/postgres",
    "aws_resource_id": "infractl-demo-instance"
  }'
```

> **Where to find `YOUR_REQUEST_ID`:**
>
> It's a UUID like `e3b0c442-98fc-1c14-b39f-12345678abcd`. You can find it in **3 places:**
>
> 1. **Success message** — When you create a request on the form page, the green success box shows: `ID: e3b0c442-...`
> 2. **Dashboard table** — Not visible as a column, but you can open browser DevTools (`F12` → Network tab), refresh the dashboard, click the `requests` API call, and see the full `id` field in the JSON response.
> 3. **API directly** — Run this in your terminal:
>    ```powershell
>    # Windows PowerShell
>    Invoke-RestMethod http://localhost:8000/api/requests | ConvertTo-Json
>    ```
>    ```bash
>    # macOS / Linux
>    curl http://localhost:8000/api/requests | python -m json.tool
>    ```
>    Look for the `"id"` field in any request object.

**After running this:**
1. Refresh the dashboard.
2. **Expected:**
   - Status badge changes from `Provisioning` (blue pulse) → `Ready` (green).
   - A **connection string** appears with a copy button.

---

### ✅ Test 11: Simulate a Failure

Test the failure handling by marking a request as `failed`:

**PowerShell (Windows):**
```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:8000/api/requests/YOUR_REQUEST_ID/status" `
  -ContentType "application/json" `
  -Body '{"status": "failed", "failed_reason": "RDS instance creation timed out"}'
```

**Bash (macOS/Linux):**
```bash
curl -X POST http://localhost:8000/api/requests/YOUR_REQUEST_ID/status \
  -H "Content-Type: application/json" \
  -d '{"status": "failed", "failed_reason": "RDS instance creation timed out"}'
```

**Expected on dashboard:**
- Status badge changes to `Failed` (red).
- Connection string column shows "Failed".
- The "+7d" extend button **disappears** (can't extend a failed resource).
- Audit Log shows: `🔄 Status changed from provisioning to failed`.

---

## Alternative: Docker Compose Setup

If you prefer a local PostgreSQL database instead of Supabase:

### Start the local database
```bash
docker-compose up -d
```

This spins up:
- **PostgreSQL** on `localhost:5432` (auto-loads `database/schema.sql`)
- **Redis** on `localhost:6379` (for future features)

### Set your `.env`
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/infractl
```

### Run the migrations manually
```bash
# Connect to the local database and run migrations
docker exec -i infractl-postgres psql -U postgres -d infractl < database/migrate_v2.sql
docker exec -i infractl-postgres psql -U postgres -d infractl < database/migrate_v3.sql
```

### Verify tables exist
```bash
docker exec -it infractl-postgres psql -U postgres -d infractl -c "\dt"
```

**Expected:**
```
          List of relations
 Schema |    Name     | Type  |  Owner
--------+-------------+-------+----------
 public | audit_logs  | table | postgres
 public | requests    | table | postgres
 public | resources   | table | postgres
```

---

## Step 6: Test the Scripts (Optional)

These scripts run in CI/CD via GitHub Actions, but you can test them locally:

### Budget Check
```bash
cd scripts
python check_budgets.py
```
**Expected output:**
```
=== InfraCtrl Budget Check — 2026-05-12 ===
OK: test@example.com — $43/$200 (21.5%)
Budget check complete. 0 alert(s) sent.
```

### Expiry Notifications
```bash
python notify_expiry.py
```
**Expected:** Lists any resources expiring within 24 hours (probably none during testing).

---

## Step 7: Test the API Directly (Optional)

All endpoints can be explored via FastAPI's built-in docs:

```
http://localhost:8000/docs
```

This opens an interactive Swagger UI where you can test every endpoint.

### Key Endpoints Reference

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/api/requests` | Create a new resource request |
| `GET` | `/api/requests` | List all requests |
| `POST` | `/api/requests/check-duplicates` | Check for similar active resources |
| `POST` | `/api/requests/{id}/status` | Update request status (webhook) |
| `POST` | `/api/requests/{id}/extend` | Extend expiry by 7 days |
| `POST` | `/api/requests/clone-setup` | Clone a user's setup |
| `GET` | `/api/budget/{email}` | Get user's budget status |
| `GET` | `/api/team/members-with-resources` | List team members for cloning |
| `GET` | `/api/users/{email}/active-resources` | Get a user's active resources |
| `GET` | `/api/audit-logs` | View audit trail |

---

## Troubleshooting

### "Database connection failed"
- Double-check your `DATABASE_URL` in `backend/.env`.
- Make sure you selected **Transaction Mode** (port `6543`) from Supabase.
- Ensure you replaced `[YOUR-PASSWORD]` with your actual password.

### "relation 'audit_logs' does not exist"
- You forgot to run `database/migrate_v3.sql` in the Supabase SQL Editor.

### "relation 'requests' does not exist"
- You forgot to run `database/schema.sql` in the Supabase SQL Editor.

### Hydration errors in browser console
- Open the page in **Incognito Mode** (browser extensions like Bitdefender can inject HTML that breaks React hydration).

### Frontend shows a blank page
- Check Terminal 2 for errors.
- Make sure `frontend/.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:8000`.
- Try stopping and restarting: `Ctrl+C` then `npm run dev`.

### CORS errors in browser console
- The backend allows all origins (`*`) by default. If you still see CORS errors, restart the backend.

---

## What You've Tested

After completing all steps above, you've verified:

- [x] Database connectivity (Supabase or Docker)
- [x] Resource provisioning (form → API → database)
- [x] Dashboard with live metrics (active count, cost, expiry warnings)
- [x] Duplicate prevention (warning modal with savings estimate)
- [x] Self-service expiry extension (+7 days button)
- [x] Complete audit trail (who did what, when)
- [x] Budget tracking and warnings
- [x] One-click teammate clone (onboarding flow)
- [x] Multi-resource type support (PostgreSQL, Redis, S3)
- [x] Status webhook simulation (provisioning → ready)
- [x] Failure handling (provisioning → failed with reason)
- [x] Cost estimation (real-time preview + dashboard aggregation)
- [x] Scripts: budget check + expiry notifications
- [x] Interactive API documentation (Swagger UI at /docs)

---
---

# Part 2: Push to GitHub (First Time) 🚀

If you've never pushed this project to GitHub, follow these steps exactly.

## Step 1: Create a GitHub Repository

1. Go to [github.com/new](https://github.com/new).
2. Fill in:
   - **Repository name:** `infractl-simple`
   - **Description:** `Self-service infrastructure provisioning portal with Terraform automation`
   - **Visibility:** `Public` (for open source / portfolio)
   - ❌ **Do NOT** check "Add a README" (we already have one)
   - ❌ **Do NOT** check "Add .gitignore" (we already have one)
   - **License:** Skip (we already added MIT)
3. Click **"Create repository"**.
4. GitHub will show you a page with setup instructions — **don't close this tab**, you'll need the URL.

## Step 2: Initialize Git Locally

Open a terminal in the project root (`infractl-simple/`):

```powershell
# Initialize git
git init

# Verify .gitignore protects secrets (should already exist)
cat .gitignore | Select-String ".env"
# Should show: .env, .env.local, etc.

# Stage all files
git add .

# Verify no secrets are staged (IMPORTANT!)
git status
```

**🚨 STOP AND CHECK:** Look at the `git status` output. Make sure you do NOT see:
- `backend/.env` (your real database password)
- `frontend/.env.local`
- Any `.tfstate` files
- Any `.pem` or `.key` files

If any of those appear, run `git reset HEAD <filename>` before continuing.

## Step 3: First Commit & Push

```powershell
# Create your first commit
git commit -m "feat: InfraCtrl — self-service infrastructure portal with Terraform automation"

# Set the main branch
git branch -M main

# Add your GitHub repo as remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/infractl-simple.git

# Push!
git push -u origin main
```

> **If prompted for credentials:**
> - **Username:** your GitHub username
> - **Password:** use a **Personal Access Token** (not your GitHub password)
>   - Create one at: [github.com/settings/tokens](https://github.com/settings/tokens/new)
>   - Select scopes: `repo` (full control)
>   - Copy the token and paste it as the password

## Step 4: Verify on GitHub

1. Refresh your GitHub repository page.
2. You should see all your files: `backend/`, `frontend/`, `terraform/`, `scripts/`, etc.
3. Confirm `backend/.env` is **NOT** visible (protected by `.gitignore`).

## Step 5: Clean Up Old `lambda/` Folder (Optional)

The old `lambda/` folder is superseded by `scripts/`. Remove it:

```powershell
Remove-Item -Recurse -Force lambda
git add -A
git commit -m "chore: remove deprecated lambda/ folder (moved to scripts/)"
git push
```

---
---

# Part 3: Test with a Real AWS Account ☁️

This section walks you through end-to-end testing where InfraCtrl actually provisions a real RDS database on AWS via GitHub Actions.

> **⚠️ Cost Warning:** This will create real AWS resources. An RDS `db.t3.micro` instance costs ~$0.02/hour (~$15/month). Delete resources after testing to avoid charges. The free tier covers 750 hours/month of `db.t3.micro`.

## Prerequisites

| Tool | How to Get It |
|---|---|
| **AWS Account** | [aws.amazon.com](https://aws.amazon.com/) — free tier eligible |
| **AWS CLI** | `winget install Amazon.AWSCLI` (Windows) or [docs](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) |
| **GitHub Repo** | Complete Part 2 above first |
| **Level 1 passing** | Your local app must be working (backend + frontend + Supabase) |

---

## Step 1: Configure AWS CLI

```powershell
aws configure
```

Enter:
- **Access Key ID:** from your IAM user (or root account for testing)
- **Secret Access Key:** from your IAM user
- **Default region:** `us-east-1`
- **Output format:** `json`

Verify it works:
```powershell
aws sts get-caller-identity
```
Should return your account ID and ARN. **Save the Account ID** — you'll need it in Step 3.

---

## Step 2: Create the Terraform State Infrastructure

These resources store Terraform's state files so concurrent runs don't conflict.

### 2.1 Create the S3 Bucket

```powershell
aws s3 mb s3://infractl-terraform-state --region us-east-1
```

Enable versioning + encryption:
```powershell
aws s3api put-bucket-versioning `
  --bucket infractl-terraform-state `
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption `
  --bucket infractl-terraform-state `
  --server-side-encryption-configuration '{\"Rules\":[{\"ApplyServerSideEncryptionByDefault\":{\"SSEAlgorithm\":\"AES256\"}}]}'
```

### 2.2 Create the DynamoDB Lock Table

```powershell
aws dynamodb create-table `
  --table-name infractl-terraform-locks `
  --attribute-definitions AttributeName=LockID,AttributeType=S `
  --key-schema AttributeName=LockID,KeyType=HASH `
  --billing-mode PAY_PER_REQUEST `
  --region us-east-1
```

### 2.3 Verify Both Exist

```powershell
aws s3 ls | Select-String "infractl"
aws dynamodb describe-table --table-name infractl-terraform-locks --query "Table.TableStatus"
```

Expected: Bucket listed, table status = `"ACTIVE"`.

---

## Step 3: Set Up GitHub OIDC Authentication

This lets GitHub Actions authenticate to AWS **without storing long-lived access keys**.

### 3.1 Create the OIDC Identity Provider

```powershell
aws iam create-open-id-connect-provider `
  --url "https://token.actions.githubusercontent.com" `
  --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1" `
  --client-id-list "sts.amazonaws.com"
```

> **Note:** If you get "EntityAlreadyExists", the OIDC provider already exists — that's fine, move on.

### 3.2 Create the Trust Policy

Create a file called `trust-policy.json` in your project root:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_USERNAME/infractl-simple:*"
        }
      }
    }
  ]
}
```

**⚠️ Replace before saving:**
- `YOUR_ACCOUNT_ID` → your 12-digit AWS account ID (from `aws sts get-caller-identity`)
- `YOUR_USERNAME` → your GitHub username

### 3.3 Create the IAM Role

```powershell
aws iam create-role `
  --role-name InfraCtrlGitHubActionsRole `
  --assume-role-policy-document file://trust-policy.json
```

### 3.4 Create & Attach the Minimal Permissions Policy

> **⚠️ IMPORTANT:** Do NOT attach `AmazonRDSFullAccess` or `AmazonEC2FullAccess`. We use a minimal custom policy scoped only to `infractl-*` resources.

Create a file called `permissions-policy.json`:

```json
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
      "Resource": "arn:aws:rds:us-east-1:YOUR_ACCOUNT_ID:db:infractl-*"
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
      "Resource": "arn:aws:rds:us-east-1:YOUR_ACCOUNT_ID:subgrp:infractl-*"
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
        "arn:aws:s3:::infractl-terraform-state",
        "arn:aws:s3:::infractl-terraform-state/*"
      ]
    },
    {
      "Sid": "TerraformStateLocking",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:YOUR_ACCOUNT_ID:table/infractl-terraform-locks"
    }
  ]
}
```

**⚠️ Replace `YOUR_ACCOUNT_ID`** in 3 places in this file.

Now create and attach the policy:

```powershell
# Create the policy
aws iam create-policy `
  --policy-name InfraCtrlMinimalPolicy `
  --policy-document file://permissions-policy.json

# Attach it to the role
aws iam attach-role-policy `
  --role-name InfraCtrlGitHubActionsRole `
  --policy-arn "arn:aws:iam::YOUR_ACCOUNT_ID:policy/InfraCtrlMinimalPolicy"
```

### 3.5 Get the Role ARN

```powershell
aws iam get-role --role-name InfraCtrlGitHubActionsRole --query "Role.Arn" --output text
```

Returns something like: `arn:aws:iam::123456789012:role/InfraCtrlGitHubActionsRole`

**Save this ARN** — you'll add it as a GitHub secret next.

---

## Step 4: Set an AWS Budget Alert

> **⚠️ Do this BEFORE provisioning. Not after.**

1. Go to [AWS Budgets Console](https://console.aws.amazon.com/billing/home#/budgets)
2. Click **"Create budget"**
3. Select **"Cost budget"**
4. Set:
   - Budget name: `InfraCtrl Testing`
   - Amount: **$10.00** per month
   - Email alert: your email at **80%** and **100%** thresholds
5. Click **"Create"**

This ensures you get emailed if a forgotten RDS instance runs up a bill.

---

## Step 5: Add GitHub Secrets

Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

Add these one by one:

| Secret Name | Value | Where to Find |
|---|---|---|
| `GH_ACTIONS_ROLE_ARN` | `arn:aws:iam::123456789012:role/InfraCtrlGitHubActionsRole` | Step 3.5 output |
| `PROD_API_URL` | `http://your-backend-url:8000` | Your deployed backend URL |
| `DATABASE_URL` | `postgresql://postgres.xxxx:...` | Your Supabase connection string (from `backend/.env`) |
| `SLACK_WEBHOOK_URL` | `https://hooks.slack.com/services/...` | *(Optional — skip if no Slack)* |

Also make sure `backend/.env` has these for the local trigger:
```env
GITHUB_TOKEN=ghp_your_personal_access_token
GITHUB_OWNER=your_github_username
GITHUB_REPO=infractl-simple
```

> **Getting a GitHub Token:**
> 1. Go to [github.com/settings/tokens](https://github.com/settings/tokens/new)
> 2. Select scopes: `repo` (full control) + `workflow`
> 3. Generate and copy the token

---

## Step 6: Push Code to GitHub

Make sure all your latest changes are pushed:

```powershell
cd d:\DevOps\Projects\infractl-simple
git add -A
git commit -m "Production hardening: VPC, IAM, subnet groups, timeout, security"
git push origin main
```

---

## Step 7: Test End-to-End Provisioning

### 7.1 Start the Backend Locally

```powershell
cd backend
python main.py
```

### 7.2 Start the Frontend Locally

```powershell
cd frontend
npm run dev
```

### 7.3 Submit a Test Request

1. Open `http://localhost:3000`
2. Fill in:
   - Name: `Test User`
   - Email: your real email
   - Resource: **PostgreSQL**
   - Environment: **dev**
   - Size: **small** (cheapest — `db.t3.micro`)
3. Click **"Provision Now"**

### 7.4 Watch GitHub Actions

1. Go to your GitHub repo → **Actions** tab
2. You should see: **"Provision Infrastructure"** running
3. Click on it to watch live logs

**Expected timeline:**
```
0:00  — Checkout + OIDC auth (~15 seconds)
0:15  — Terraform init (~10 seconds)
0:30  — Terraform apply starts
0:30  — "Creating aws_db_subnet_group..." (~5 seconds)
0:35  — "Creating aws_db_instance..." (THIS TAKES 5-10 MINUTES)
6:00  — "Apply complete!"
6:10  — update_status.py runs → dashboard updated
```

> **⚠️ RDS takes 5-10 minutes.** This is normal AWS behavior. Don't cancel the workflow early!

**Architecture flow:**
```
┌─────────┐    ┌──────────┐    ┌─────────────────┐    ┌─────┐
│ Browser │───▶│ FastAPI  │───▶│ GitHub Actions   │───▶│ AWS │
│ (form)  │    │ (backend)│    │ (provision.yml)  │    │(RDS)│
└─────────┘    └──────────┘    └─────────────────┘    └─────┘
     ▲                              │                     │
     │              ┌───────────────┘                     │
     │              ▼                                     │
     │         update_status.py ◄── terraform output ◄────┘
     │              │
     │              ▼
     └─── Dashboard shows "Ready" + connection string
```

### 7.5 Verify on AWS Console

After the GitHub Action completes:

```powershell
# List all InfraCtrl RDS instances
aws rds describe-db-instances `
  --query "DBInstances[?starts_with(DBInstanceIdentifier, 'infractl')].{ID:DBInstanceIdentifier,Status:DBInstanceStatus,Endpoint:Endpoint.Address}" `
  --output table
```

Expected: 1 instance with status `available`.

### 7.6 Verify on Dashboard

1. Refresh `http://localhost:3000/dashboard`
2. Your request should show:
   - Status: **Ready** (green glowing badge)
   - A **connection string** with a copy button
3. Click the copy icon — paste it into a terminal to test the connection:

```powershell
# If you have psql installed:
psql "postgresql://admin:PASSWORD@infractl-UUID.xxxx.us-east-1.rds.amazonaws.com:5432/postgres"
```

### 7.7 If It Failed

1. Check GitHub Actions logs for the error
2. Dashboard should show **Failed** (red badge)
3. Common failures:
   - `AccessDenied` → IAM policy missing permissions (check Step 3.4)
   - `No subnet group found` → VPC issue (should be fixed in our code)
   - `timeout` → RDS took too long (increase `timeout-minutes` in provision.yml)
4. **Check AWS Console for orphans** after any failure:
   ```powershell
   aws rds describe-db-instances --query "DBInstances[?starts_with(DBInstanceIdentifier, 'infractl')].DBInstanceIdentifier" --output text
   ```

---

## Step 8: Test Cleanup (Destroy the Resource)

⚠️ **Don't leave resources running!** Each `db.t3.micro` costs ~$15/month.

### Option A: Manual Cleanup via Script

```powershell
cd scripts
python cleanup.py
```

This finds all expired resources and destroys them via Terraform. If your resource hasn't expired yet (7-day TTL), you can either:
- Update the `expiry_date` in Supabase SQL Editor to today:
  ```sql
  UPDATE requests SET expiry_date = CURRENT_DATE WHERE status = 'ready';
  ```
- Then run `python cleanup.py` again

### Option B: Trigger the Cleanup Workflow

Go to GitHub → Actions → **"Cleanup Expired Resources"** → **"Run workflow"** → Click **"Run workflow"**.

### Option C: Force Destroy via AWS CLI

If the scripts fail, manually delete the RDS instance:

```powershell
# Find the instance identifier
aws rds describe-db-instances `
  --query "DBInstances[?starts_with(DBInstanceIdentifier, 'infractl')].DBInstanceIdentifier" `
  --output text

# Delete it (replace with actual identifier)
aws rds delete-db-instance `
  --db-instance-identifier infractl-YOUR_REQUEST_ID `
  --skip-final-snapshot
```

### Verify Cleanup Worked

```powershell
# Should return empty
aws rds describe-db-instances `
  --query "DBInstances[?starts_with(DBInstanceIdentifier, 'infractl')]" `
  --output text

# Also check for leftover security groups
aws ec2 describe-security-groups `
  --filters "Name=group-name,Values=infractl-*" `
  --query "SecurityGroups[].{Name:GroupName,ID:GroupId}" `
  --output table

# And subnet groups
aws rds describe-db-subnet-groups `
  --query "DBSubnetGroups[?starts_with(DBSubnetGroupName, 'infractl')].DBSubnetGroupName" `
  --output text
```

All three should return empty.

---

## Step 9: Cleanup AWS Infrastructure (After Done Testing)

When you're completely done testing, remove all AWS infrastructure to avoid charges:

```powershell
# 1. Detach and delete the custom IAM policy
$ACCOUNT_ID = (aws sts get-caller-identity --query Account --output text)
aws iam detach-role-policy `
  --role-name InfraCtrlGitHubActionsRole `
  --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/InfraCtrlMinimalPolicy"
aws iam delete-policy `
  --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/InfraCtrlMinimalPolicy"

# 2. Delete the IAM Role
aws iam delete-role --role-name InfraCtrlGitHubActionsRole

# 3. Delete the OIDC Provider
aws iam delete-open-id-connect-provider `
  --open-id-connect-provider-arn "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"

# 4. Delete the S3 State Bucket
aws s3 rb s3://infractl-terraform-state --force

# 5. Delete the DynamoDB Lock Table
aws dynamodb delete-table --table-name infractl-terraform-locks
```

---

## Quick Reference: All GitHub Secrets

| Secret | Required | Purpose |
|---|---|---|
| `GH_ACTIONS_ROLE_ARN` | ✅ For AWS testing | IAM role ARN for OIDC auth |
| `PROD_API_URL` | ✅ For status sync | Backend URL (status webhook) |
| `DATABASE_URL` | ✅ For cleanup workflow | Supabase connection string |
| `SLACK_WEBHOOK_URL` | ❌ Optional | Slack notifications |

---

## Complete Test Checklist

After completing all steps:

```
[ ] Level 1 — Local
    [ ] Backend starts without errors
    [ ] Frontend loads at localhost:3000
    [ ] Form submits successfully
    [ ] Dashboard shows request with "Pending" status
    [ ] Supabase has migrate_v2.sql applied

[ ] Level 2 — AWS
    [ ] AWS CLI configured and verified
    [ ] S3 state bucket created (versioned + encrypted)
    [ ] DynamoDB lock table created
    [ ] OIDC provider registered
    [ ] IAM role created with minimal custom policy
    [ ] AWS Budget alert set ($10 threshold)
    [ ] GitHub secrets added (GH_ACTIONS_ROLE_ARN, PROD_API_URL, DATABASE_URL)
    [ ] Code pushed to GitHub
    [ ] Test request submitted → GitHub Actions triggered
    [ ] Terraform apply completed (~5-10 min for RDS)
    [ ] Dashboard shows "Ready" with connection string
    [ ] Connection string works (psql test)
    [ ] AWS Console confirms RDS instance exists
    [ ] Cleanup run → RDS instance destroyed
    [ ] Dashboard shows "Deleted"
    [ ] AWS Console confirms no orphaned resources
    [ ] AWS infrastructure cleaned up (Step 9)
```

