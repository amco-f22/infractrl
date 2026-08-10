# InfraCtrl - Detailed Implementation Log 🛠️

This document is a technical breakdown of everything implemented in the InfraCtrl project, phase-by-phase. It serves as an under-the-hood reference for contributors and reviewers.

---

## 🏗️ Phase 0–2: Foundation & Core Application
**Goal**: Build a self-service web portal that can accept and store infrastructure requests.

### Backend (FastAPI)
- **Database Connection**: Implemented PostgreSQL connections using `psycopg2` with `RealDictCursor` for JSON-serializable responses.
- **Data Validation (Pydantic V2)**: Created strict `CreateRequest` model using `@field_validator` (migrated from deprecated Pydantic V1 `@validator`). Validates:
  - `environment` → must be `dev`, `staging`, or `prod`
  - `instance_size` → must be `small`, `medium`, or `large`
  - `resource_type` → must be `postgres`, `redis`, or `s3`
- **Core API Endpoints**:
  - `POST /api/requests` — inserts a new request, calculates 7-day `expiry_date`, sets status to `provisioning`
  - `GET /api/requests` — retrieves all requests ordered by creation date
  - `POST /api/requests/{id}/status` — updates status, `connection_string`, `aws_resource_id`, and `failed_reason` after provisioning

### Database Schema (`database/schema.sql`)
- `requests` table — single source of truth for the entire lifecycle: `id`, `requester_name`, `requester_email`, `resource_type`, `environment`, `instance_size`, `status`, `failed_reason`, `created_at`, `expiry_date`, `aws_resource_id`, `connection_string`, `db_name`
- `audit_logs` table — tracks every action for compliance (created, status_changed, deleted)
- ~~`resources` table~~ — **Removed**. Was never read or written by any workflow. Everything lives in `requests` to avoid dead schema confusion.
- **Migration Script** (`database/migrate_v2.sql`): Adds `aws_resource_id` and `failed_reason` columns to existing Supabase deployments without dropping tables.

### Frontend (Next.js 14 App Router)
- **Tailwind CSS v4**: Migrated from v3 syntax to v4 `@utility` directive in `globals.css`. Fixed `@import` ordering issues (Google Fonts moved from CSS to `next/font/google`).
- **Request Form** (`app/page.js`): Client-side form capturing user requirements and POSTing to FastAPI.
- **Dashboard** (`app/dashboard/page.js`): Fetches all requests and renders a data table with status badges.

---

## 🤖 Phase 5: GitHub Actions Automation
**Goal**: Eliminate manual Terraform execution by bridging the backend to GitHub CI/CD.

- **FastAPI Background Tasks**: Used `BackgroundTasks` so the API immediately returns to the user without blocking on the GitHub API call.
- **GitHub API Trigger (`trigger_github_workflow`)**: Async function using `httpx` that dispatches `provision.yml` via the GitHub REST API, passing `request_id`, `resource_type`, `instance_size`, `email`, and `environment` as workflow inputs.
- **Provisioning Workflow** (`.github/workflows/provision.yml`):
  - Triggered by `workflow_dispatch`
  - **OIDC Keyless Auth**: Uses `aws-actions/configure-aws-credentials@v4` with `role-to-assume` — no long-lived AWS access keys stored as secrets. Short-lived tokens are scoped per run only.
  - Runs `terraform init` with a **per-request S3 state key** (`state/<request_id>.tfstate`) to isolate concurrent runs.
  - Runs `terraform apply -auto-approve` with all request variables.
  - On success: captures `terraform output -raw connection_string` and `terraform output -raw aws_resource_id`, runs `.github/scripts/update_status.py`.
  - On failure: a separate step runs `update_status.py` with `FAILED=true` to mark the request as `failed` so the dashboard reflects it.

---

## 🔄 Phase 6: Post-Terraform Status Sync
**Goal**: Automatically update the dashboard once AWS finishes creating the resource.

- **Status Webhook** (`POST /api/requests/{id}/status`): Accepts `status`, `connection_string`, `aws_resource_id`, and `failed_reason`. Updates all fields atomically. Triggers a Slack notification if status is `ready`.
- **CI/CD Sync Script** (`.github/scripts/update_status.py`): Final step in GitHub Actions. Reads Terraform outputs from environment variables and POSTs to the webhook. Also handles the `FAILED=true` case to update failed requests.

---

## 🏗️ Terraform Infrastructure (`terraform/main.tf`)

### Remote State Management (Critical Fix)
- **S3 Backend**: All Terraform state stored remotely in `s3://infractl-terraform-state`.
- **Per-Request State Isolation**: The state key is `state/<request_id>.tfstate` — each request has its own independent state file. Concurrent provisioning runs **cannot corrupt each other**.
- **DynamoDB Locking**: `infractl-terraform-locks` table prevents two runs from writing the same state file simultaneously.
- **Encrypted**: State files are encrypted at rest in S3.

### Networking (Default VPC)
- **DB Subnet Group**: RDS requires a subnet group spanning at least 2 AZs. Without it, `terraform apply` fails immediately with `InvalidParameterValue: No subnet group found`.
- Uses `data.aws_vpc.default` and `data.aws_subnets.default` to discover the account's default VPC — no custom VPC management required.
- The `aws_db_subnet_group.infractl` resource is created per-request and attached via `db_subnet_group_name`.
- Security group is explicitly attached to the default VPC via `vpc_id = data.aws_vpc.default.id`.

### Multi-Resource Type Support (Conditional Modules)
- Added `resource_type` variable to Terraform.
- Uses `count = var.resource_type == "postgres" ? 1 : 0` pattern so only the relevant resource is created.
- Stubbed modules for Redis (ElastiCache) and S3 are commented and ready to activate in a future phase.

### Security Group & IP Lockdown
- `allowed_ip` variable is intentionally **not** plumbed through the UI/API/workflow. It's hardcoded in Terraform for first-run testing.
- When set (e.g. `203.0.113.5/32`), creates an `aws_security_group` locked to that IP only.
- When empty (default), RDS is created with `publicly_accessible = false` — private, VPC-only access.

### Outputs
- `connection_string` (sensitive) — full PostgreSQL URI
- `aws_resource_id` — the RDS instance identifier used by the cleanup script to precisely target the correct resource for destruction

---

## 🧹 Phase 7: Auto Cleanup (Ephemeral Environments)
**Goal**: Save cloud costs by automatically destroying databases that have lived past their 7-day lifespan.

### `scripts/cleanup.py` (Rewrote from `lambda/cleanup.py`)
- Renamed folder from `lambda/` → `scripts/` to eliminate confusion (these are cron scripts, not AWS Lambda functions).
- **DB Query**: Fetches all requests where `expiry_date <= CURRENT_DATE` and `status != 'deleted'`.
- **Graceful Handling**: If `aws_resource_id` is null (request was never provisioned), it marks the record `deleted` without attempting a Terraform destroy.
- **Per-Request State Init**: Before each destroy, runs `terraform init -reconfigure` with the specific `bucket`, `key`, `region`, and `dynamodb_table` for that request's isolated state file. This is what makes concurrent cleanups safe.
- **Precise Targeting**: Runs `terraform destroy` with all original request variables — `request_id`, `resource_type`, `instance_size`, `requester_email`, `environment`.
- **Failure Isolation**: If one destroy fails, it logs and sends a Slack alert but continues to the next expired resource rather than aborting.

---

## 🔔 Phase 8: Slack Notifications
**Goal**: Provide production-level alerts for the engineering team.

- **Webhook Pattern**: Uses a `SLACK_WEBHOOK_URL` environment variable — no complex Slack SDK or Bot Token required.
- **Creation Alert**: Backend fires a Slack message with the connection string the moment a resource is marked `ready`.
- **24h Expiry Warning** (`scripts/notify_expiry.py`): Queries for requests where `expiry_date = CURRENT_DATE + 1` and status is not `deleted` or `failed`. Sends a proactive warning to Slack.
- **Deletion Confirmation** (`scripts/cleanup.py`): Fires a Slack confirmation with the `aws_resource_id` after successful destruction, or a failure alert requiring manual intervention.

### Scheduled Automation (`.github/workflows/cleanup.yml`)
- Runs daily at 2 AM UTC via GitHub Actions cron (`0 2 * * *`).
- Two jobs in sequence: `expiry-warnings` (notify_expiry.py) → `cleanup` (cleanup.py).
- Uses the same OIDC auth as the provisioning workflow — no stored AWS credentials.
- Can also be triggered manually via `workflow_dispatch` for testing.

---

## ✨ Final Polish: UI Redesign, Animations & Cost Tracking

### Design System Overhaul
- **Dark Glassmorphism Theme**: Full dark background (`#0a0f1e`) with animated radial gradient mesh (`rgba(59,130,246,0.15)` blue and `rgba(139,92,246,0.1)` purple) fixed to the viewport.
- **Glassmorphism Cards**: Two card variants — `glass-card` (translucent, backdrop-blur) and `glass-card-solid` (darker, for forms).
- **Custom Status Badges**: `badge-ready`, `badge-provisioning` (with pulsing glow animation), `badge-pending`, `badge-failed`, `badge-deleted` — each with color-matched background, text, and border.

### Request Form (`app/page.js`)
- **Animated Resource Type Selector**: Three card-buttons (PostgreSQL / Redis / S3) with per-type color-coded glow on selection, icons from `lucide-react`.
- **Live Cost Estimator**: Updates the `$` value in real-time as the user changes resource type or size. Labeled with "*Based on AWS list price" disclaimer.
- **Framer Motion**: Page slides in on load; cost number animates with scale + color transition on change.
- **Trust Signals**: "Encrypted at rest" and "Auto-expires in 7 days" badges below the submit button.
- **Success State**: Shows request ID, expiry date, and a direct link to the dashboard — not just a plain string.

### Dashboard (`app/dashboard/page.js`)
- **Metrics Bar**: Three glowing KPI cards — Active Resources, Estimated Monthly Cost (with disclaimer), Expiring in < 48h.
- **Copy-to-Clipboard**: Connection strings show a copy icon that switches to a green checkmark for 2 seconds on click.
- **Refresh Button**: Manual refresh with a spinning icon animation while loading.
- **Staggered Animations**: Metrics cards and table rows animate in sequentially using Framer Motion `staggerChildren`.
- **Resource Type Icons**: Each row shows the appropriate `lucide-react` icon (Database / HardDrive / Archive) for the resource type.
- **Footer Stats**: Shows total requests vs. active count.

### Bug Fixes (Frontend)
- **Tailwind v4 `@utility` Syntax**: Pseudo-class blocks (`@utility btn-primary:hover`) are invalid in Tailwind v4. Fixed by converting to plain CSS selectors (`.btn-primary:hover`).
- **`@import` Ordering**: Google Fonts `@import url(...)` cannot follow `@import "tailwindcss"` after PostCSS expansion. Fixed by removing the CSS import and switching to `next/font/google` with a CSS variable (`--font-inter`).
- **Server Component Event Handlers**: `onMouseEnter`/`onMouseLeave` in `layout.js` (a Server Component) caused a runtime error. Fixed by replacing with a `.nav-link` CSS class with `:hover` styles.

---

## 🔐 Security Improvements

| Area | Before | After |
|---|---|---|
| AWS credentials | `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` stored as GitHub Secrets (long-lived) | OIDC keyless auth — short-lived token per run, no stored keys |
| Terraform state | Local `terraform.tfstate` — corrupts under concurrent runs | S3 remote state with per-request key + DynamoDB locking |
| Resource targeting | Generic destroy, no resource-specific tracking | `aws_resource_id` saved in DB; cleanup uses exact state key per request |
| Failed requests | No status update on GitHub Actions failure | Failure step marks request as `failed` with `failed_reason` |

---

## 📁 Final Project Structure

```text
infractl-simple/
├── .github/
│   ├── scripts/
│   │   └── update_status.py        # POSTs Terraform outputs to backend after provisioning
│   └── workflows/
│       ├── provision.yml           # Triggered by backend → runs terraform apply
│       └── cleanup.yml             # Scheduled daily cron → runs cleanup + expiry alerts
├── backend/
│   ├── main.py                     # FastAPI app with all endpoints
│   ├── requirements.txt
│   ├── .env                        # Local config (never committed)
│   └── env.example                 # Template for all required env vars
├── frontend/
│   └── app/
│       ├── globals.css             # Dark theme, glassmorphism utilities, badge styles
│       ├── layout.js               # Nav bar, next/font/google, metadata
│       ├── page.js                 # Request form with animated resource selector
│       └── dashboard/
│           └── page.js             # KPI metrics, data table, copy-to-clipboard
├── terraform/
│   └── main.tf                     # S3 backend, conditional resource modules, outputs
├── database/
│   ├── schema.sql                  # Full table definitions
│   └── migrate_v2.sql              # ALTER TABLE migration for existing DBs
├── scripts/
│   ├── cleanup.py                  # Destroy expired resources via Terraform
│   ├── notify_expiry.py            # Send 24h Slack warnings for expiring resources
│   └── bootstrap_aws.sh            # One-time AWS setup (S3, DynamoDB, OIDC, IAM)
└── README.md
```

---

## ⚙️ AWS Prerequisites (Must Exist Before First Run)

Terraform's S3 backend does **not** create its own infrastructure. The following must exist in your AWS account before the first `terraform init`:

| Resource | Purpose | How to Create |
|---|---|---|
| **S3 Bucket** (`infractl-terraform-state`) | Stores per-request `.tfstate` files | `scripts/bootstrap_aws.sh` or manual |
| **DynamoDB Table** (`infractl-terraform-locks`) | Prevents concurrent state writes | `scripts/bootstrap_aws.sh` or manual |
| **GitHub OIDC Provider** | Allows GitHub Actions to assume an IAM role without stored keys | `scripts/bootstrap_aws.sh` or manual |
| **IAM Role** (`InfraCtrlGitHubActionsRole`) | Scoped role for Terraform to manage RDS + SGs | `scripts/bootstrap_aws.sh` or manual |

### Bootstrap Script
All four are created by running `scripts/bootstrap_aws.sh` once with AWS CLI configured:
```bash
chmod +x scripts/bootstrap_aws.sh
./scripts/bootstrap_aws.sh
```
The script outputs the IAM Role ARN — add it to GitHub Secrets as `GH_ACTIONS_ROLE_ARN`.

### OIDC Trust Policy Scope
The IAM role's trust policy is scoped to `repo:amco-f22/infractl-simple:*` — **not** a wildcard. This means only this specific repository's GitHub Actions runs can assume the role. Change the org/repo in the bootstrap script if your repo name differs.

### IAM Permissions (Minimal Policy)
The role uses `InfraCtrlMinimalPolicy` — **not** `AdministratorAccess`. Three RDS/EC2 statements + two state statements:
- **`RDSInstanceManagement`**: `rds:Create/Delete/Describe/ModifyDBInstance`, tagging — scoped to `arn:aws:rds:*:*:db:infractl-*`
- **`RDSSubnetGroupManagement`**: `rds:Create/Delete/DescribeDBSubnetGroups`, tagging — scoped to `arn:aws:rds:*:*:subgrp:infractl-*`
- **`EC2NetworkAndSecurityGroup`**: SG CRUD + `ec2:DescribeVpcs`, `ec2:DescribeSubnets`, `ec2:DescribeAvailabilityZones` — `Resource: "*"` (AWS requires account-wide scope for Describe calls)
- **`TerraformStateAccess`**: `s3:Get/Put/Delete` scoped to the state bucket only
- **`TerraformStateLocking`**: `dynamodb:Get/Put/DeleteItem` scoped to the lock table only

---

## 🛡️ Production Hardening Applied

### Network Security
- **Security Group**: Added `aws_security_group.rds_access` to Terraform. When `allowed_ip` is set (e.g. `203.0.113.5/32`), ingress is locked to that single IP on port 5432 only.
- **`publicly_accessible`**: Now conditional — only `true` if `allowed_ip` is provided (so the SG can restrict access). If `allowed_ip` is empty, it defaults to `false` (private, VPC-only).

### Workflow Safety
- **Job timeout**: `timeout-minutes: 20` on the provision job. RDS takes 5–10 minutes; the old default of 360 minutes would waste runner minutes on stuck jobs.
- **Concurrency guard**: `concurrency.group: provision-<request_id>` prevents two provisions for the same request from running simultaneously. `cancel-in-progress: false` ensures a running provision isn't killed if retriggered.
- **Failure handling**: If Terraform fails mid-apply, a separate `if: failure()` step updates the request status to `failed` via the webhook. This prevents the dashboard from showing "Provisioning" forever on a dead request.

### Cost Safety Net (Manual)
- **AWS Budget Alert**: Not automatable via Terraform. Must be set manually at [AWS Budgets Console](https://console.aws.amazon.com/billing/home#/budgets) before the first real test. Recommended threshold: **$10/month**.
- **Orphan detection**: If `terraform apply` fails halfway (e.g. RDS created but tagging fails), the resource may exist in AWS without a matching `aws_resource_id` in the DB. After any failed run, manually check the [RDS Console](https://console.aws.amazon.com/rds/) for instances with `infractl-` prefix.

---

## ⚠️ Known Gaps & Production Considerations

### RDS Provisioning Time
AWS RDS PostgreSQL takes **5–10 minutes** to become available, not seconds. The UI shows "Provisioning" during this time. The Slack notification only fires when the status changes to `ready`, which happens after Terraform's apply completes (not after the GitHub Actions job starts). No timeout issue exists because the job timeout is set to 20 minutes.

### Destroy Correctness
The cleanup script (`scripts/cleanup.py`) reconstructs all `-var` values from the **database row** (not hardcoded). It inits Terraform with `key=state/<request_id>.tfstate` to target the exact state file. This has been verified by code review but should be tested with at least 2 concurrent state files in the S3 bucket before trusting it in production.

### Half-Provisioned Resource Recovery
If `terraform apply` fails after creating the RDS instance but before the status update webhook runs:
1. The `if: failure()` step marks the request as `failed` in the dashboard.
2. The RDS instance **may still exist** in AWS, incurring costs.
3. **Manual cleanup required**: check the RDS console for orphans with `infractl-` prefix.
4. Future improvement: add a `scripts/orphan_scan.py` that lists RDS instances tagged `ManagedBy=infractl` and compares against the DB.

### Cost Tracking Accuracy
The dashboard shows **estimated** costs based on hardcoded AWS list prices (`small=$15, medium=$28, large=$56`). These are not pulled from AWS Cost Explorer. The UI now shows `*Based on AWS list prices` to make this clear. Actual costs may vary based on storage, data transfer, and regional pricing.

---

## 🧪 First Real Test Checklist

Before your first real AWS test, confirm every item:

```
[ ] 1. Run scripts/bootstrap_aws.sh (creates S3 bucket, DynamoDB, OIDC, IAM role)
[ ] 2. Add GH_ACTIONS_ROLE_ARN to GitHub Secrets
[ ] 3. Add PROD_API_URL to GitHub Secrets (your deployed backend URL)
[ ] 4. Add DATABASE_URL to GitHub Secrets (for cleanup workflow)
[ ] 5. Set AWS Budget alert at $10/month threshold
[ ] 6. Find your IP: curl https://checkip.amazonaws.com
[ ] 7. Push code to GitHub (main branch)
[ ] 8. Submit ONE request: small / dev / postgres
[ ] 9. Watch GitHub Actions run — verify terraform apply succeeds
[ ] 10. Check dashboard — status should change to "Ready" with connection string
[ ] 11. Test the connection string with psql or your app
[ ] 12. Check AWS Console — verify RDS instance exists with correct tags
[ ] 13. Manually trigger cleanup workflow — verify terraform destroy succeeds
[ ] 14. Check dashboard — status should change to "Deleted"
[ ] 15. Check AWS Console — verify RDS instance is gone
```

