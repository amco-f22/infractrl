<p align="center">
  <img src="frontend/public/logo-dark.png" alt="InfraCtrl" height="48" />
</p>

<h3 align="center">Self-Serve Cloud Infrastructure for Dev Teams</h3>

<p align="center">
  Request cloud databases in <strong>5 minutes</strong>, not 5 days.<br/>
  Automated Terraform provisioning · Live cost tracking · Policy governance · Auto-teardown.
</p>

<p align="center">
  <a href="https://infractl.vercel.app">Live Demo</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/build-passing-brightgreen?style=flat-square" alt="Build" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/terraform-native-7B42BC?style=flat-square&logo=terraform&logoColor=white" alt="Terraform" />
  <img src="https://img.shields.io/badge/Next.js_16-black?style=flat-square&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/AWS-FF9900?style=flat-square&logo=amazonaws&logoColor=white" alt="AWS" />
</p>

---

## The Problem

In most engineering orgs, getting a dev or staging database looks like this:

```
Developer → Jira ticket → DevOps queue → 3–5 business days → finally gets credentials
```

InfraCtrl replaces that with a self-service portal:

```
Developer → InfraCtrl form → GitHub Actions + Terraform → database ready in ~5 minutes
```

No tickets. No waiting. No idle cloud waste.

---

## What InfraCtrl Does

| Capability | Description |
| :--- | :--- |
| **Self-Service Provisioning** | Developers request PostgreSQL, Redis, or S3 from a clean web form — no CLI, no Jira. |
| **Automated IaC Pipeline** | FastAPI triggers GitHub Actions → Terraform provisions real AWS resources with OIDC auth (zero stored keys). |
| **Live Cost Tracking** | Per-second cost meters on the dashboard. Per-user budget limits with 80%/100% alerts. |
| **Policy Engine** | Configurable governance rules — auto-approve dev requests, require approval for prod, deny oversized instances, enforce hard budget ceilings. |
| **Auto-Teardown** | Expired resources are automatically destroyed via scheduled workflows. 24-hour Slack warnings before deletion. |
| **Slack Integration** | Real-time notifications for provisioning success, failures, expiry warnings, and budget alerts. |
| **GitHub OAuth** | Sign in with GitHub. Role-based access — admins manage policies, developers self-serve. |

---

## Tech Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4 | App Router, Framer Motion animations, Recharts dashboards |
| **Backend** | FastAPI (Python 3.12) | Async REST API, Pydantic v2 validation, HMAC webhook auth |
| **Database** | PostgreSQL (Supabase) | Requests, policies, audit logs, provisioning logs |
| **Infrastructure** | Terraform + AWS Provider 5.x | RDS PostgreSQL, ElastiCache Redis, S3 buckets, security groups |
| **CI/CD** | GitHub Actions | OIDC keyless auth, per-request isolated Terraform state, concurrent provisioning |
| **Auth** | NextAuth.js v5 (Auth.js) | GitHub OAuth provider with session-based access control |
| **Deployment** | Vercel (frontend) + Railway (backend) | Zero-config auto-deploy on push, global edge CDN |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            DEVELOPER                                    │
│                    Signs in via GitHub OAuth                             │
│                    Submits resource request                              │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  FRONTEND (Next.js 16 on Vercel)                                        │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ Landing  │  │  Dashboard   │  │  Onboarding  │  │ Admin Policies │  │
│  │  Page    │  │  (Console)   │  │   Wizard     │  │    Engine      │  │
│  └──────────┘  └──────────────┘  └──────────────┘  └────────────────┘  │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │  API calls via /api/backend/[...path] proxy
                            ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  BACKEND (FastAPI on Railway)                                           │
│  ┌───────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Request  │  │   Policy     │  │  Cost/Budget │  │    Slack      │  │
│  │   CRUD    │  │   Engine v2  │  │   Tracking   │  │  Webhooks     │  │
│  └─────┬─────┘  └──────────────┘  └──────────────┘  └───────────────┘  │
│        │                                                                 │
│        │  Triggers workflow_dispatch                                     │
│        ▼                                                                 │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │  GitHub Actions (OIDC → AWS)                                     │    │
│  │  provision.yml → terraform init/apply → update_status.py         │    │
│  │  destroy.yml   → terraform destroy → status update               │    │
│  │  cleanup.yml   → cron: find expired → trigger destroy            │    │
│  └──────────────────────────────────────────────────────────────────┘    │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  AWS (Terraform-managed)                                                │
│  ┌────────────┐  ┌──────────────┐  ┌─────────┐  ┌──────────────────┐   │
│  │ RDS        │  │ ElastiCache  │  │   S3    │  │  Security Groups │   │
│  │ PostgreSQL │  │  Redis       │  │ Buckets │  │  (per-request)   │   │
│  └────────────┘  └──────────────┘  └─────────┘  └──────────────────┘   │
│                                                                          │
│  State: S3 bucket (per-request isolated .tfstate)                        │
│  Auth: OIDC federation (zero stored AWS keys)                            │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

### 🔐 Zero-Secret CI/CD
GitHub Actions authenticates to AWS via **OIDC federation** — no `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` stored anywhere. The trust policy restricts tokens to a specific repo and branch.

### 🧱 Per-Request Terraform Isolation
Each provisioning request gets its own Terraform state file (`state/{request_id}.tfstate`) in S3. This means concurrent provisions don't conflict and individual resources can be destroyed independently.

### ⚖️ Policy Engine v2
A priority-based rule engine (`backend/policy_engine_v2.py`) evaluates every request:
- **Auto-Approved**: Dev sandbox requests under budget → instant provisioning.
- **Pending Approval**: Production databases → requires admin sign-off.
- **Auto-Denied**: Oversized instances or requests exceeding budget ceilings.
- Supports `eq`, `ne`, `gt`, `lt`, `gte`, `lte`, `in`, `contains` operators across environment, instance size, resource type, estimated cost, and requester email.

### 💰 Real-Time Cost Tracking
- Per-second live cost meters on the dashboard (calculated from provisioning timestamps).
- Per-user monthly budget limits with configurable 80% warning and 100% hard-block thresholds.
- Slack alerts on budget threshold crossings.

### 🧹 Automatic Resource Lifecycle
- Every request gets a configurable `expiry_date` (default: 7 days).
- A scheduled GitHub Actions workflow (`cleanup.yml`) finds expired resources and triggers `destroy.yml`.
- Slack sends a 24-hour warning before teardown.
- Zero orphaned cloud costs.

---

## Quick Start

### Prerequisites

| Tool | Version | Purpose |
| :--- | :--- | :--- |
| Node.js | 18+ | Frontend runtime |
| Python | 3.11+ | Backend runtime |
| Docker | Latest | Local PostgreSQL (optional) |
| AWS CLI | v2 | One-time bootstrap (optional) |
| Terraform | 1.0+ | Infrastructure provisioning |

### 1. Clone

```bash
git clone https://github.com/amco-f22/infractrl.git
cd infractrl
```

### 2. Database

**Option A — Supabase (recommended for production)**
1. Create a project at [supabase.com](https://supabase.com).
2. Run `database/schema.sql` in the SQL Editor.
3. Copy the Transaction Mode connection string.

**Option B — Docker (local development)**
```bash
docker-compose up -d
# PostgreSQL ready at: postgresql://postgres:postgres@localhost:5432/infractl
# Schema auto-applied from database/schema.sql
```

### 3. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp env.example .env             # Edit .env with your DATABASE_URL
uvicorn main:app --reload       # API at http://localhost:8000
```

### 4. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local  # Edit with your values
npm run dev                       # App at http://localhost:3000
```

### 5. AWS Bootstrap (one-time)

If you want real provisioning (not just the UI):

```bash
# Requires AWS CLI configured with admin access
chmod +x scripts/bootstrap_aws.sh
./scripts/bootstrap_aws.sh
```

This creates:
- S3 bucket for Terraform state (versioned, encrypted)
- IAM OIDC provider for GitHub Actions
- IAM role with least-privilege permissions
- AWS Budget with email alerts

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `GITHUB_TOKEN` | Optional | GitHub PAT for triggering Actions workflows |
| `GITHUB_OWNER` | Optional | GitHub username/org |
| `GITHUB_REPO` | Optional | Repository name |
| `SLACK_WEBHOOK_URL` | Optional | Slack incoming webhook for notifications |
| `BUDGET_LIMIT_PER_USER` | Optional | Monthly USD limit per user (default: 200) |
| `INTERNAL_API_KEY` | Optional | API key for frontend → backend auth |
| `WEBHOOK_API_KEY` | Optional | API key for GitHub Actions → backend callbacks |
| `ADMIN_EMAILS` | Optional | Comma-separated admin email list |
| `FRONTEND_URLS` | Optional | Allowed CORS origins |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | ✅ | Backend API URL |
| `NEXTAUTH_URL` | ✅ | App URL (e.g., `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | ✅ | Random 32+ char secret for session encryption |
| `GITHUB_CLIENT_ID` | ✅ | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | ✅ | GitHub OAuth App client secret |
| `INTERNAL_API_KEY` | ✅ | Must match the backend's `INTERNAL_API_KEY` |

---

## Deployment

### Frontend → Vercel

1. Import your GitHub repo at [vercel.com](https://vercel.com).
2. Set root directory to `frontend`.
3. Add all frontend environment variables.
4. Deploy. Vercel auto-deploys on every push to `main`.

### Backend → Railway

1. Import your GitHub repo at [railway.app](https://railway.app).
2. Set root directory to `backend`.
3. Add all backend environment variables.
4. Railway auto-deploys your FastAPI app.

### Cost

| Service | Tier | Cost |
| :--- | :--- | :--- |
| Vercel | Hobby | Free |
| Railway | Starter | Free (500 hrs/month) |
| Supabase | Free | Free (500MB) |
| **Total** | | **$0/month** within free tiers |

> **Note**: AWS resources provisioned by Terraform (RDS, ElastiCache, S3) incur standard AWS charges. Auto-teardown minimizes idle costs.

---

## Project Structure

```
infractl/
├── .github/
│   ├── workflows/
│   │   ├── provision.yml          # Terraform apply (triggered by API)
│   │   ├── destroy.yml            # Terraform destroy (per-resource)
│   │   ├── cleanup.yml            # Cron: auto-destroy expired resources
│   │   └── update-sg.yml          # Dynamic security group rule updates
│   └── scripts/
│       └── update_status.py       # Post-provision status sync to DB
│
├── backend/
│   ├── main.py                    # FastAPI app (1600+ lines, 30+ endpoints)
│   ├── policy_engine_v2.py        # Priority-based governance rule engine
│   ├── seed_policies.py           # Default policy bootstrapper
│   ├── env.example                # Environment variable template
│   └── requirements.txt           # Python dependencies
│
├── frontend/
│   ├── app/
│   │   ├── page.js                # Landing page (7 sections)
│   │   ├── dashboard/page.js      # Console dashboard (live metrics)
│   │   ├── onboarding/page.js     # Clone setup wizard
│   │   ├── admin/policies/page.js # Admin policy management UI
│   │   └── api/                   # NextAuth + backend proxy routes
│   ├── components/
│   │   ├── landing/               # 13 landing page components
│   │   ├── ui/                    # Reusable UI primitives
│   │   ├── AppHeader.js           # Dashboard navigation bar
│   │   ├── BrandLogo.js           # Logo component
│   │   └── ProvisioningTerminal.js # Live terminal animation
│   ├── auth.js                    # NextAuth v5 configuration
│   └── .env.local.example         # Frontend env template
│
├── terraform/
│   ├── main.tf                    # AWS resources (RDS, Redis, S3, SGs)
│   └── terraform.tfvars.example   # Variable template
│
├── database/
│   ├── schema.sql                 # Core schema (requests, policies, audit logs)
│   ├── migrate_v2.sql             # Migration: add resource tracking columns
│   └── migrate_v3.sql             # Migration: add provisioning logs
│
├── scripts/
│   ├── bootstrap_aws.sh           # One-time AWS infra setup (S3, IAM, OIDC)
│   ├── check_budgets.py           # Budget threshold checker
│   ├── cleanup.py                 # Expired resource cleanup logic
│   └── notify_expiry.py           # 24-hour Slack expiry warnings
│
├── docker-compose.yml             # Local PostgreSQL + Redis
├── permissions-policy.json        # IAM policy reference (least-privilege)
├── budget.json                    # AWS Budget definition
└── LICENSE                        # MIT License
```

---

## CI/CD Workflows

### `provision.yml` — Resource Provisioning
- **Trigger**: `workflow_dispatch` from FastAPI backend.
- **Flow**: Checkout → OIDC auth → `terraform init` (isolated state per request) → `terraform apply` → `update_status.py` syncs connection string back to DB → Slack notification.
- **Concurrency**: Locked per `request_id` to prevent duplicate provisions.

### `destroy.yml` — Resource Destruction
- **Trigger**: `workflow_dispatch` (manual or from cleanup).
- **Flow**: OIDC auth → `terraform destroy` with the request's state file → DB status update → Slack notification.

### `cleanup.yml` — Automated Expiry
- **Trigger**: Scheduled cron (`0 0 * * *` — daily at midnight UTC).
- **Flow**: Query backend for expired resources → trigger `destroy.yml` for each → 24-hour advance Slack warnings via `notify_expiry.py`.

### `update-sg.yml` — Dynamic Security Groups
- Updates security group ingress rules when a developer's IP changes, without full re-provisioning.

---

## Landing Page

The landing page at [infractl.vercel.app](https://infractl.vercel.app) features:

- **Hero**: Gradient headline with live interactive terminal preview showing real provisioning output.
- **Features Bento Grid**: Animated cards showcasing Terraform provisioning, cost tracking, and Slack integration.
- **Policy Engine Showcase**: Interactive 3-scenario simulator (Auto-Approved, Pending Review, Auto-Denied) with real-time evaluation animation.
- **Dashboard Preview**: Embedded dashboard mockup with live cost meters and resource status cards.
- **How It Works**: 4-step visual flow (Request → Policy Check → Terraform Apply → Live Dashboard).
- **Tech Stack Marquee**: Continuous sliding carousel of official technology logos.
- **Liquid Glass Navbar**: Apple visionOS-inspired frosted glass effect on scroll with `backdrop-blur-2xl` and `backdrop-saturate-200`.

**Design System**: Dark mode, minimalist glassmorphic icons (`border-white/10 bg-white/[0.04]`), emerald/cyan/teal accent palette, spotlight hover cards, Framer Motion animations throughout.

---

## Issues Solved & Lessons Learned

<details>
<summary><strong>Pydantic V1 → V2 Migration</strong></summary>

Pydantic v2 replaced `@validator` with `@field_validator` and changed the decorator syntax. All backend models were migrated:
```python
# Before (Pydantic v1 — broken)
@validator('environment')
def validate_env(cls, v): ...

# After (Pydantic v2 — working)
@field_validator('environment')
@classmethod
def validate_env(cls, v): ...
```
</details>

<details>
<summary><strong>Tailwind CSS v3 → v4 Migration</strong></summary>

Tailwind v4 removed the `tailwind.config.js` file and introduced CSS-first configuration. Migrated `@import` ordering (Google Fonts must come before Tailwind directives), replaced `@apply` patterns with direct utility classes, and switched to the `@utility` directive for custom utilities in `globals.css`.
</details>

<details>
<summary><strong>Terraform State Conflicts with Concurrent Provisions</strong></summary>

Multiple simultaneous provisions caused state file corruption. Fixed by giving each request its own isolated state key: `state/{request_id}.tfstate` in S3, passed via `-backend-config="key=state/${REQUEST_ID}.tfstate"` at `terraform init`.
</details>

<details>
<summary><strong>OIDC Keyless Auth Setup</strong></summary>

Eliminated stored AWS credentials from GitHub Secrets entirely. Created an IAM OIDC provider for `token.actions.githubusercontent.com`, bound to the specific repo via condition keys. The trust policy restricts assume-role to `repo:amco-f22/infractrl:ref:refs/heads/main`.
</details>

<details>
<summary><strong>Next.js App Router API Proxy</strong></summary>

The frontend proxies all API calls through `/api/backend/[...path]` to avoid CORS issues and keep the backend URL private. The proxy injects `x-internal-api-key` and `x-user-email` headers server-side.
</details>

<details>
<summary><strong>Mobile Navbar Smooth Scroll</strong></summary>

Anchor links in the mobile hamburger menu weren't scrolling to sections because `document.body.style.overflow = "hidden"` (scroll lock for the drawer) blocked the scroll event. Fixed by programmatically closing the drawer and unlocking scroll before triggering `window.scrollTo()` with a 50ms delay for the DOM to settle.
</details>

---

## Roadmap

- [x] Self-service request form and dashboard
- [x] Automated provisioning via GitHub Actions + Terraform
- [x] Multiple resource types (PostgreSQL, Redis, S3)
- [x] Real-time per-second cost tracking with budget alerts
- [x] Policy engine with auto-approve/deny/review rules
- [x] Slack notifications (provision, expiry, budget)
- [x] Auto-cleanup of expired resources
- [x] GitHub OAuth with role-based access
- [x] Premium landing page with interactive demos
- [ ] Multi-cloud support (GCP, Azure)
- [ ] Team/org-level resource grouping
- [ ] Approval workflow UI with Slack interactive buttons
- [ ] Grafana/CloudWatch metrics integration
- [ ] Custom Terraform module support

---

## Contributing

Contributions are welcome! To get started:

1. **Fork** the repository.
2. **Create** a feature branch: `git checkout -b feature/your-feature`
3. **Commit** your changes: `git commit -m 'feat: add your feature'`
4. **Push** to the branch: `git push origin feature/your-feature`
5. **Open** a Pull Request.

Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

---

## License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

## Author

**Aman Nikhare** — DevOps & Cloud Engineer

[![GitHub](https://img.shields.io/badge/GitHub-amco--f22-181717?style=flat-square&logo=github)](https://github.com/amco-f22)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Aman_Nikhare-0A66C2?style=flat-square&logo=linkedin)](https://linkedin.com/in/amco-f22)

---

<p align="center">
  <sub>Built with ☕ and Terraform. If this helped you, consider giving it a ⭐</sub>
</p>
