# InfraCtrl - Simple Self-Service Infrastructure 🚀

**Request cloud databases in 5 minutes instead of 5 days**

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

## What It Does
InfraCtrl eliminates the bottleneck of manual infrastructure provisioning. Developers can now self-serve their development and staging databases without waiting for DevOps.

- **Self-Service Form**: Request PostgreSQL, Redis, or S3 environments in seconds.
- **Automated CI/CD Provisioning**: Databases are created automatically in AWS via GitHub Actions & Terraform.
- **Real-Time Cost Tracking**: See estimated monthly run rates before and after provisioning.
- **Instant Access & Sync**: The backend automatically syncs connection strings from Terraform directly to your dashboard.
- **Slack Notifications**: Get instant alerts when resources are ready, expiring, or deleted.
- **Cost Efficiency**: Auto-cleanup scripts destroy expired resources automatically to prevent orphaned cloud costs.

## Demo
[Add screenshot of Request Form here]
[Add screenshot of Dashboard here]

[Add demo video showing the full flow from request to connection here]

## Tech Stack
| Component | Technology | Why |
| :--- | :--- | :--- |
| **Frontend** | Next.js 14 | Fast, modern, great DX with App Router and Tailwind CSS |
| **Backend** | FastAPI (Python) | Easy to learn, high performance, and excellent async support |
| **Database** | PostgreSQL (Supabase) | Industry-standard relational DB with a generous free tier |
| **Infrastructure**| Terraform + AWS | Industry-standard IaC for reliable and repeatable deployments |
| **Deployment** | Vercel + Railway | Free tiers, zero-config, and automatic GitHub deployments |

## Prerequisites
Before you begin, ensure you have the following installed:
- **Node.js 18+**
- **Python 3.11+**
- **Docker & Docker Compose** (for local development)
- **AWS Account** (for provisioning RDS instances)
- **Supabase Account** (for the application database)

## Setup (Local Development)

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/infractl-simple
cd infractl-simple
```

### 2. Database Setup (Supabase)
1. Sign up at [supabase.com](https://supabase.com).
2. Create a new project named `infractl`.
3. Go to the SQL Editor and run the content of `database/schema.sql`.
4. Copy your project's **Transaction Connection String** from Settings > Database.

### 3. Local Database Alternative (Docker)
If you prefer to run PostgreSQL locally:
```bash
docker-compose up -d
# Database will be ready at: postgresql://postgres:postgres@localhost:5432/infractl
```

### 4. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env and set your DATABASE_URL (from Supabase or Local Docker)
uvicorn main:app --reload
# API will be running at http://localhost:8000
```

### 5. Frontend Setup
```bash
cd frontend
npm install
cp .env.local.example .env.local
# Ensure NEXT_PUBLIC_API_URL is set to http://localhost:8000
npm run dev
# Application will be running at http://localhost:3000
```

## Deployment

### Backend (Railway)
1. Go to [railway.app](https://railway.app).
2. Import your GitHub repository.
3. Add the environment variable: `DATABASE_URL`.
4. Railway will deploy your FastAPI app automatically.

### Frontend (Vercel)
1. Go to [vercel.com](https://vercel.com).
2. Import your GitHub repository.
3. Set the root directory to `frontend`.
4. Add the environment variable: `NEXT_PUBLIC_API_URL` (pointing to your Railway URL).
5. Vercel will deploy your Next.js app automatically.

### Cost Breakdown
- **Railway**: Free tier (500 hours/month)
- **Vercel**: Free for personal projects
- **Supabase**: Free tier (500MB storage)
- **Total**: **$0/month** (within free tier limits)

## How to Use
1. **Open the web app**: Navigate to your deployed Vercel URL.
2. **Fill the form**: Enter your details and choose an environment/size.
3. **Submit**: Click "Provision Resource" and wait for the process to start.
4. **Dashboard**: Go to the Dashboard to track your request.
5. **Connect**: Once status is "Ready", copy the connection string and start building!

## Automation Workflows
Full automation via CI/CD is implemented using GitHub Actions.

1. **Provisioning**: When a request is submitted, FastAPI triggers `.github/workflows/provision.yml`, which runs `terraform apply`.
2. **Status Sync**: A post-deploy script (`.github/scripts/update_status.py`) automatically updates the database dashboard with the new connection string and turns the status green.
3. **Auto-Cleanup**: The `lambda/cleanup.py` script automatically runs `terraform destroy` on resources where the expiry date has passed.
4. **Notifications**: The `lambda/notify_expiry.py` script sends 24-hour Slack warnings before databases are purged.

## Project Structure
```text
infractl-simple/
├── .github/          # CI/CD Workflows & Sync Scripts
├── backend/          # FastAPI backend
├── frontend/         # Next.js frontend
├── terraform/        # Infrastructure as Code
├── lambda/           # Automation & Cleanup Scripts
├── database/         # SQL schema
└── docker-compose.yml
```

## Roadmap
- **Phase 1**: ✅ Basic request form & dashboard
- **Phase 2**: ✅ Auto-provisioning via GitHub Actions
- **Phase 3**: ✅ Slack/Email notifications
- **Phase 4**: ✅ Auto-cleanup of expired resources
- **Phase 5**: ✅ Real-time cost tracking
- **Phase 6**: ✅ Multiple resource types (Redis, S3, etc.)

## Contributing
Contributions are welcome! If you'd like to improve InfraCtrl, please:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

## License
Distributed under the **MIT License**. See `LICENSE` for more information.

## Author
**Aman Nikhare**
- DevOps & Cloud Engineer
- **GitHub**: [@amco-f22](https://github.com/amco-f22)
- **LinkedIn**: [linkedin.com/in/amco-f22](https://linkedin.com/in/amco-f22)
