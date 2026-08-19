import os
import re
import json
from datetime import datetime, timedelta
from typing import List, Optional

import psycopg2
import httpx
from psycopg2.extras import RealDictCursor
from fastapi import FastAPI, HTTPException, status, BackgroundTasks, Header, Query, Request, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field, field_validator
from dotenv import load_dotenv

from policy_engine import evaluate_request, RequestContext, ApprovalDecision

# Load environment variables
load_dotenv()

app = FastAPI(title="InfraCtrl API")

# CORS Configuration
FRONTEND_URLS = [url.strip() for url in os.getenv("FRONTEND_URLS", "http://localhost:3000").split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_URLS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def require_internal_api_key(request: Request, call_next):
    # Skip webhook endpoint
    if request.url.path.endswith("/progress"):
        return await call_next(request)
        
    # Protect all other /api routes
    if request.url.path.startswith("/api/"):
        api_key = request.headers.get("x-internal-api-key")
        expected_key = os.getenv("INTERNAL_API_KEY", "dev-internal-key-123")
        if not api_key or api_key != expected_key:
            return JSONResponse(status_code=403, content={"detail": "Invalid internal API key"})
            
    return await call_next(request)

def get_current_user_email(x_user_email: str = Header(...)):
    return x_user_email.strip().lower()

def is_admin(email: str = Depends(get_current_user_email)):
    admin_emails = [e.strip().lower() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip()]
    if email not in admin_emails:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return email

# Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL")

# Cost estimation map (matches frontend PRICING)
PRICING = {
    "postgres": {"small": 15, "medium": 28, "large": 56},
    "redis":    {"small": 10, "medium": 20, "large": 40},
    "s3":       {"small": 5,  "medium": 15, "large": 30},
}
BUDGET_LIMIT_PER_USER = int(os.getenv("BUDGET_LIMIT_PER_USER", "200"))
WEBHOOK_API_KEY = os.getenv("WEBHOOK_API_KEY", "dev-webhook-key")

def mask_connection_string(conn_str):
    """Mask the password in a connection string for safe display."""
    if not conn_str:
        return None
    return re.sub(r'://([^:]+):([^@]+)@', r'://\1:***@', conn_str)

def get_db_connection():
    """
    Establishes a connection to the PostgreSQL database.
    Returns:
        psycopg2 connection object
    """
    try:
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection failed"
        )

def log_audit(conn, request_id, action, actor, details, metadata=None):
    """Write an entry to the audit_logs table."""
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO audit_logs (request_id, action, actor, details, metadata)
           VALUES (%s, %s, %s, %s, %s)""",
        (request_id, action, actor, details, json.dumps(metadata or {}))
    )

def estimate_cost(resource_type, instance_size):
    """Return estimated monthly cost for a resource config."""
    return PRICING.get(resource_type, {}).get(instance_size, 0)

# ========================
# Pydantic Models
# ========================
class CreateRequest(BaseModel):
    requester_name: str = Field(..., min_length=1, max_length=255)
    requester_email: EmailStr
    resource_type: str = "postgres"
    environment: str
    instance_size: str

    @field_validator("environment")
    @classmethod
    def validate_environment(cls, v):
        if v not in ["dev", "staging", "prod"]:
            raise ValueError("Environment must be dev, staging, or prod")
        return v
        
    @field_validator("resource_type")
    @classmethod
    def validate_resource_type(cls, v):
        if v not in ["postgres", "redis", "s3"]:
            raise ValueError("Resource type must be postgres, redis, or s3")
        return v

    @field_validator("instance_size")
    @classmethod
    def validate_instance_size(cls, v):
        if v not in ["small", "medium", "large"]:
            raise ValueError("Instance size must be small, medium, or large")
        return v
        
    allowed_ip: str

    @field_validator('allowed_ip')
    @classmethod
    def validate_ip(cls, v):
        if not v:
            raise ValueError('IP address is required for security')
        # Strip /32 if user included it, we'll add it in Terraform
        return v.replace('/32', '').strip()

class StatusUpdateRequest(BaseModel):
    status: str
    connection_string: Optional[str] = None
    aws_resource_id: Optional[str] = None
    failed_reason: Optional[str] = None

class CloneRequest(BaseModel):
    source_email: EmailStr
    target_name: str = Field(..., min_length=1, max_length=255)
    target_email: EmailStr

# ========================
# GitHub Integration
# ========================
async def trigger_github_workflow(request_id: str, resource_type: str, instance_size: str, email: str, environment: str, allowed_ip: str):
    """Triggers the GitHub Actions provisioning workflow."""
    token = os.getenv("GITHUB_TOKEN")
    owner = os.getenv("GITHUB_OWNER")
    repo = os.getenv("GITHUB_REPO")
    
    if not all([token, owner, repo]):
        print("GitHub configuration missing, skipping workflow trigger.")
        return False

    url = f"https://api.github.com/repos/{owner}/{repo}/actions/workflows/provision.yml/dispatches"
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": "2022-11-28"
    }
    payload = {
        "ref": "main",
        "inputs": {
            "request_id": request_id,
            "resource_type": resource_type,
            "instance_size": instance_size,
            "email": email,
            "environment": environment,
            "allowed_ip": f"{allowed_ip}/32"
        }
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            print(f"Triggered GitHub Action for request {request_id}")
            return True
        except Exception as e:
            print(f"Failed to trigger GitHub Action: {e}")
            return False

# =======================================================
# LOCAL DEMO SIMULATION (Runs in background)
# =======================================================
async def simulate_pipeline(request_id: str):
    import asyncio
    import json
    
    def push_log(step, status, msg, details=None):
        c = get_db_connection()
        try:
            with c.cursor() as cur:
                cur.execute("""
                    INSERT INTO provisioning_logs (request_id, step, status, message, details)
                    VALUES (%s, %s, %s, %s, %s)
                """, (request_id, step, status, msg, json.dumps(details) if details else None))
                c.commit()
        except Exception as e:
            print(f"Failed to push log: {e}")
        finally:
            c.close()
    
    await asyncio.sleep(1)
    push_log("workflow_start", "running", "🚀 GitHub Actions workflow started", {"run_url": "http://github.com/..."})
    
    await asyncio.sleep(2)
    push_log("checkout", "success", "✅ Repository checked out")
    
    await asyncio.sleep(2)
    push_log("terraform_setup", "success", "✅ Terraform CLI installed")
    
    await asyncio.sleep(3)
    push_log("aws_auth", "success", "✅ AWS credentials configured via OIDC")
    
    await asyncio.sleep(4)
    push_log("terraform_init", "success", "📦 Terraform backend initialized")
    
    await asyncio.sleep(3)
    push_log("terraform_plan", "success", "📋 Terraform plan generated")
    
    await asyncio.sleep(5)
    endpoint = f"db-{request_id[:6]}.us-east-1.rds.amazonaws.com"
    push_log("terraform_apply", "success", "🏗️ AWS resources created", {"endpoint": endpoint})
    
    await asyncio.sleep(4)
    push_log("complete", "success", "🎉 Provisioning complete! Your resource is ready.")
    
    # Finally, update the request status to ready
    c = get_db_connection()
    try:
        with c.cursor() as cur:
            cur.execute(
                "UPDATE requests SET status = 'ready', connection_string = %s WHERE id = %s", 
                (f"postgres://admin:********@{endpoint}:5432/main", request_id)
            )
            c.commit()
    finally:
        c.close()

# ========================
# Slack Integration
# ========================
async def send_slack_notification(message: str):
    """Sends a message to a Slack channel via Webhook."""
    webhook_url = os.getenv("SLACK_WEBHOOK_URL")
    if not webhook_url:
        print("Slack Webhook URL not configured. Skipping notification.")
        return
        
    payload = {"text": message}
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(webhook_url, json=payload)
            response.raise_for_status()
            print("Successfully sent Slack notification.")
        except Exception as e:
            print(f"Failed to send Slack notification: {e}")

# ================================================================
# API ENDPOINTS
# ================================================================

@app.get("/")
async def health_check():
    """Simple health check endpoint."""
    return {"status": "healthy", "app": "InfraCtrl API"}

# ---------------------------------------------------------------
# Feature: Duplicate Prevention (Phase 9)
# ---------------------------------------------------------------
@app.post("/api/requests/check-duplicates")
async def check_duplicates(request_data: CreateRequest):
    """
    Check for similar active resources before creating.
    Returns suggestions to reuse existing resources instead.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT id, requester_name, requester_email, resource_type, 
                   instance_size, environment, connection_string, created_at
            FROM requests
            WHERE resource_type = %s
              AND environment = %s
              AND status IN ('ready', 'provisioning')
              AND expiry_date > CURRENT_DATE
            ORDER BY created_at DESC
            LIMIT 5
        """, (request_data.resource_type, request_data.environment))
        
        similar = cur.fetchall()
        formatted = []
        for r in similar:
            formatted.append({
                "id": str(r["id"]),
                "requester_name": r["requester_name"],
                "requester_email": r["requester_email"],
                "resource_type": r["resource_type"],
                "instance_size": r["instance_size"],
                "environment": r["environment"],
                "connection_string": r["connection_string"],
                "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            })
        
        cost = estimate_cost(request_data.resource_type, request_data.instance_size)
        
        return {
            "found_similar": len(formatted) > 0,
            "suggestions": formatted,
            "estimated_savings": len(formatted) * cost,
        }
    finally:
        cur.close()
        conn.close()

# ---------------------------------------------------------------
# Feature: Budget Check
# ---------------------------------------------------------------
@app.get("/api/budget/{email}")
async def get_user_budget(email: str):
    """
    Get a user's current spend vs their budget limit.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT resource_type, instance_size
            FROM requests
            WHERE requester_email = %s
              AND status IN ('ready', 'provisioning')
              AND expiry_date > CURRENT_DATE
        """, (email,))
        
        active = cur.fetchall()
        current_spend = sum(estimate_cost(r["resource_type"], r["instance_size"]) for r in active)
        
        return {
            "email": email,
            "current_spend": current_spend,
            "budget_limit": BUDGET_LIMIT_PER_USER,
            "remaining": max(0, BUDGET_LIMIT_PER_USER - current_spend),
            "over_budget": current_spend > BUDGET_LIMIT_PER_USER,
            "utilization_pct": round((current_spend / BUDGET_LIMIT_PER_USER) * 100, 1) if BUDGET_LIMIT_PER_USER > 0 else 0,
            "active_resources": len(active),
        }
    finally:
        cur.close()
        conn.close()

# ---------------------------------------------------------------
# Feature: Policy Preview
# ---------------------------------------------------------------
@app.post("/api/policies/preview")
async def preview_policy(preview_data: PolicyPreviewRequest):
    """
    Evaluates a proposed request against the policy engine without creating it.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT resource_type, instance_size FROM requests
            WHERE requester_email = %s AND status IN ('ready', 'provisioning')
              AND expiry_date > CURRENT_DATE
        """, (preview_data.requester_email,))
        active = cur.fetchall()
        current_spend = sum(estimate_cost(r["resource_type"], r["instance_size"]) for r in active)
        new_cost = estimate_cost(preview_data.resource_type, preview_data.instance_size)
        user_budget_remaining = BUDGET_LIMIT_PER_USER - current_spend
        
        req_ctx = RequestContext(
            resource_type=preview_data.resource_type,
            environment=preview_data.environment,
            instance_size=preview_data.instance_size,
            estimated_cost=new_cost
        )
        decision, reason = evaluate_request(req_ctx, user_budget_remaining)
        
        return {
            "decision": decision.value,
            "reason": reason
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

# ---------------------------------------------------------------
# Core: Create Request (with audit log + budget warning)
# ---------------------------------------------------------------
@app.post("/api/requests", status_code=status.HTTP_201_CREATED)
async def create_request(request_data: CreateRequest, background_tasks: BackgroundTasks):
    """
    Creates a new infrastructure request.
    Calculates expiry date (7 days from now) and inserts into database.
    Triggers GitHub Actions workflow in background.
    Logs the action to audit_logs.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    expiry_date = (datetime.now() + timedelta(days=7)).date()
    
    try:
        # Budget and cost calculations
        cur.execute("""
            SELECT resource_type, instance_size FROM requests
            WHERE requester_email = %s AND status IN ('ready', 'provisioning')
              AND expiry_date > CURRENT_DATE
        """, (request_data.requester_email,))
        active = cur.fetchall()
        current_spend = sum(estimate_cost(r["resource_type"], r["instance_size"]) for r in active)
        new_cost = estimate_cost(request_data.resource_type, request_data.instance_size)
        user_budget_remaining = BUDGET_LIMIT_PER_USER - current_spend
        
        # Policy Engine Evaluation
        req_ctx = RequestContext(
            resource_type=request_data.resource_type,
            environment=request_data.environment,
            instance_size=request_data.instance_size,
            estimated_cost=new_cost
        )
        decision, reason = evaluate_request(req_ctx, user_budget_remaining)
        
        if decision == ApprovalDecision.AUTO_DENIED:
            raise HTTPException(status_code=400, detail=reason)
            
        initial_status = "provisioning" if decision == ApprovalDecision.AUTO_APPROVED else "pending_approval"
        
        # Insert the request
        query = """
            INSERT INTO requests (
                requester_name, requester_email, resource_type,
                environment, instance_size, expiry_date, status, allowed_ip
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, status, expiry_date;
        """
        cur.execute(query, (
            request_data.requester_name,
            request_data.requester_email,
            request_data.resource_type,
            request_data.environment,
            request_data.instance_size,
            expiry_date,
            initial_status,
            request_data.allowed_ip
        ))
        
        result = cur.fetchone()
        req_id = str(result["id"])
        
        # Audit log
        log_audit(conn, req_id, "created", request_data.requester_email,
                  f"Created {request_data.resource_type}/{request_data.environment}/{request_data.instance_size} ({decision.value})",
                  {"resource_type": request_data.resource_type, "environment": request_data.environment,
                   "instance_size": request_data.instance_size, "estimated_cost": new_cost,
                   "decision": decision.value, "reason": reason})
        
        conn.commit()
        
        # Actions based on decision
        if decision == ApprovalDecision.AUTO_APPROVED:
            # Try to trigger real GitHub Action
            async def trigger_or_simulate():
                success = await trigger_github_workflow(
                    req_id, request_data.resource_type, request_data.instance_size, 
                    request_data.requester_email, request_data.environment, request_data.allowed_ip
                )
                if not success:
                    print("Falling back to local simulation mode...")
                    await simulate_pipeline(req_id)

            background_tasks.add_task(trigger_or_simulate)
            # Slack message
            slack_msg = f"✅ *Auto-approved*: {request_data.requester_name} requested {request_data.resource_type} ({request_data.instance_size}, {request_data.environment})\nEstimated cost: ${new_cost}/mo\nProvisioning now... (no human needed)"
            background_tasks.add_task(send_slack_notification, slack_msg)
        else:
            # Pending approval Slack message
            slack_msg = f"⏳ *Approval needed*: {request_data.requester_name} requested {request_data.resource_type} ({request_data.instance_size}, {request_data.environment})\nEstimated cost: ${new_cost}/mo\nReason: {reason}\nGo to dashboard to approve or deny."
            background_tasks.add_task(send_slack_notification, slack_msg)
        
        return {
            "id": req_id,
            "status": result["status"],
            "message": "Request created! " + ("Provisioning workflow triggered." if decision == ApprovalDecision.AUTO_APPROVED else "Pending manual approval."),
            "expiry_date": str(result["expiry_date"]),
            "estimated_cost": new_cost,
            "decision": decision.value,
            "reason": reason
        }
        
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"Database error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create request: {str(e)}"
        )
    finally:
        cur.close()
        conn.close()

# ---------------------------------------------------------------
# Core: Update Status (with audit log)
# ---------------------------------------------------------------
@app.post("/api/requests/{request_id}/status")
async def update_request_status(request_id: str, update_data: StatusUpdateRequest, background_tasks: BackgroundTasks, x_api_key: str = Header(None)):
    """
    Updates the status and connection string of a request after provisioning.
    Triggers Slack notification if status is 'ready'.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Verify webhook API key
        if x_api_key != WEBHOOK_API_KEY:
            raise HTTPException(status_code=401, detail="Invalid API key")

        cur.execute("SELECT id, status, environment FROM requests WHERE id = %s", (request_id,))
        existing = cur.fetchone()
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
        
        old_status = existing["status"]
            
        query = """
            UPDATE requests 
            SET status = %s, connection_string = %s, aws_resource_id = %s, failed_reason = %s
            WHERE id = %s
            RETURNING id;
        """
        cur.execute(query, (update_data.status, update_data.connection_string, update_data.aws_resource_id, update_data.failed_reason, request_id))
        
        # Audit log
        log_audit(conn, request_id, "status_changed", "system",
                  f"Status changed from {old_status} to {update_data.status}",
                  {"old_status": old_status, "new_status": update_data.status})
        
        conn.commit()
        
        if update_data.status == "ready" and update_data.connection_string:
            message = f"🚀 *Database is ready!*\nYour request `{request_id}` has been provisioned.\nView your secure credentials on the dashboard."
            background_tasks.add_task(send_slack_notification, message)
            
        return {"message": "Status updated successfully", "status": update_data.status}
        
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"Database error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update status: {str(e)}"
        )
    finally:
        cur.close()
        conn.close()

# ---------------------------------------------------------------
# Feature: Manual Approval / Denial
# ---------------------------------------------------------------
@app.post("/api/requests/{request_id}/approve")
async def approve_request(request_id: str, background_tasks: BackgroundTasks):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM requests WHERE id = %s", (request_id,))
        req = cur.fetchone()
        if not req:
            raise HTTPException(status_code=404, detail="Request not found")
        if req["status"] != "pending_approval":
            raise HTTPException(status_code=400, detail="Request is not pending approval")
            
        cur.execute("UPDATE requests SET status = 'provisioning' WHERE id = %s", (request_id,))
        log_audit(conn, request_id, "approved", "admin", "Request manually approved")
        conn.commit()
        
        background_tasks.add_task(
            trigger_github_workflow, 
            request_id, req["resource_type"], req["instance_size"], 
            req["requester_email"], req["environment"], req["allowed_ip"]
        )
        
        slack_msg = f"👍 *Approved*: Request `{request_id}` is now provisioning."
        background_tasks.add_task(send_slack_notification, slack_msg)
        
        return {"message": "Request approved and provisioning started."}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

@app.post("/api/requests/{request_id}/deny")
async def deny_request(request_id: str, background_tasks: BackgroundTasks):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM requests WHERE id = %s", (request_id,))
        req = cur.fetchone()
        if not req:
            raise HTTPException(status_code=404, detail="Request not found")
        if req["status"] != "pending_approval":
            raise HTTPException(status_code=400, detail="Request is not pending approval")
            
        cur.execute("UPDATE requests SET status = 'failed', failed_reason = 'Manually denied' WHERE id = %s", (request_id,))
        log_audit(conn, request_id, "denied", "admin", "Request manually denied")
        conn.commit()
        
        slack_msg = f"👎 *Denied*: Request `{request_id}` was denied."
        background_tasks.add_task(send_slack_notification, slack_msg)
        
        return {"message": "Request denied."}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

# ---------------------------------------------------------------
# Feature: Manual Approval / Denial
# ---------------------------------------------------------------
@app.post("/api/requests/{request_id}/approve")
async def approve_request(request_id: str, background_tasks: BackgroundTasks):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM requests WHERE id = %s", (request_id,))
        req = cur.fetchone()
        if not req:
            raise HTTPException(status_code=404, detail="Request not found")
        if req["status"] != "pending_approval":
            raise HTTPException(status_code=400, detail="Request is not pending approval")
            
        cur.execute("UPDATE requests SET status = 'provisioning' WHERE id = %s", (request_id,))
        log_audit(conn, request_id, "approved", "admin", "Request manually approved")
        conn.commit()
        
        background_tasks.add_task(
            trigger_github_workflow, 
            request_id, req["resource_type"], req["instance_size"], 
            req["requester_email"], req["environment"], req["allowed_ip"]
        )
        
        slack_msg = f"👍 *Approved*: Request `{request_id}` is now provisioning."
        background_tasks.add_task(send_slack_notification, slack_msg)
        
        return {"message": "Request approved and provisioning started."}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

@app.post("/api/requests/{request_id}/deny")
async def deny_request(request_id: str, background_tasks: BackgroundTasks):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM requests WHERE id = %s", (request_id,))
        req = cur.fetchone()
        if not req:
            raise HTTPException(status_code=404, detail="Request not found")
        if req["status"] != "pending_approval":
            raise HTTPException(status_code=400, detail="Request is not pending approval")
            
        cur.execute("UPDATE requests SET status = 'failed', failed_reason = 'Manually denied' WHERE id = %s", (request_id,))
        log_audit(conn, request_id, "denied", "admin", "Request manually denied")
        conn.commit()
        
        slack_msg = f"👎 *Denied*: Request `{request_id}` was denied."
        background_tasks.add_task(send_slack_notification, slack_msg)
        
        return {"message": "Request denied."}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

# ---------------------------------------------------------------
# Feature: Self-Service Expiry Extension
# ---------------------------------------------------------------
@app.post("/api/requests/{request_id}/extend")
async def extend_request(request_id: str):
    """
    Extend a request's expiry date by 7 days.
    Only works for active (non-deleted, non-failed) requests.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT id, requester_email, expiry_date, status FROM requests WHERE id = %s
        """, (request_id,))
        req = cur.fetchone()
        
        if not req:
            raise HTTPException(status_code=404, detail="Request not found")
        if req["status"] in ("deleted", "failed"):
            raise HTTPException(status_code=400, detail=f"Cannot extend a {req['status']} resource")
        
        old_expiry = req["expiry_date"]
        new_expiry = old_expiry + timedelta(days=7)
        
        cur.execute("UPDATE requests SET expiry_date = %s WHERE id = %s", (new_expiry, request_id))
        
        log_audit(conn, request_id, "extended", req["requester_email"],
                  f"Expiry extended from {old_expiry} to {new_expiry}",
                  {"old_expiry": str(old_expiry), "new_expiry": str(new_expiry)})
        
        conn.commit()
        
        return {
            "message": "Expiry extended by 7 days",
            "old_expiry": str(old_expiry),
            "new_expiry": str(new_expiry),
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

# ---------------------------------------------------------------
# Feature: Clone Teammate Setup (Phase 11)
# ---------------------------------------------------------------
@app.get("/api/users/{email}/active-resources")
async def get_user_resources(email: str):
    """Get all active resources for a user (for clone UI)."""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT resource_type, instance_size, environment
            FROM requests
            WHERE requester_email = %s
              AND status IN ('ready', 'provisioning')
              AND expiry_date > CURRENT_DATE
        """, (email,))
        
        resources = cur.fetchall()
        total_cost = sum(estimate_cost(r["resource_type"], r["instance_size"]) for r in resources)
        
        return {
            "email": email,
            "resources": [dict(r) for r in resources],
            "total_monthly_cost": total_cost,
        }
    finally:
        cur.close()
        conn.close()

@app.get("/api/team/members-with-resources")
async def get_team_members():
    """List all team members who have active resources (for clone/onboarding UI)."""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT 
                requester_name, requester_email,
                array_agg(DISTINCT resource_type) as resource_types,
                COUNT(*) as resource_count
            FROM requests
            WHERE status IN ('ready', 'provisioning')
              AND expiry_date > CURRENT_DATE
            GROUP BY requester_name, requester_email
            ORDER BY resource_count DESC
        """)
        
        members = []
        for row in cur.fetchall():
            # Calculate total cost for this member
            cur.execute("""
                SELECT resource_type, instance_size FROM requests
                WHERE requester_email = %s AND status IN ('ready', 'provisioning')
                  AND expiry_date > CURRENT_DATE
            """, (row["requester_email"],))
            user_resources = cur.fetchall()
            total_cost = sum(estimate_cost(r["resource_type"], r["instance_size"]) for r in user_resources)
            
            members.append({
                "name": row["requester_name"],
                "email": row["requester_email"],
                "resource_types": row["resource_types"],
                "resource_count": row["resource_count"],
                "resources": [dict(r) for r in user_resources],
                "total_cost": total_cost,
            })
        
        return {"members": members}
    finally:
        cur.close()
        conn.close()

@app.post("/api/requests/clone-setup")
async def clone_user_setup(clone_data: CloneRequest, background_tasks: BackgroundTasks):
    """Clone all active resources from one user to another (onboarding)."""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Get source user's active resources
        cur.execute("""
            SELECT resource_type, instance_size, environment
            FROM requests
            WHERE requester_email = %s
              AND status IN ('ready', 'provisioning')
              AND expiry_date > CURRENT_DATE
        """, (clone_data.source_email,))
        
        source_resources = cur.fetchall()
        
        if not source_resources:
            raise HTTPException(status_code=404, detail=f"No active resources found for {clone_data.source_email}")
        
        expiry_date = (datetime.now() + timedelta(days=7)).date()
        cloned_ids = []
        total_cost = 0
        
        for res in source_resources:
            cur.execute("""
                INSERT INTO requests (
                    requester_name, requester_email, resource_type,
                    environment, instance_size, expiry_date, status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id;
            """, (
                clone_data.target_name,
                clone_data.target_email,
                res["resource_type"],
                res["environment"],
                res["instance_size"],
                expiry_date,
                "provisioning"
            ))
            
            new_id = str(cur.fetchone()["id"])
            cloned_ids.append(new_id)
            cost = estimate_cost(res["resource_type"], res["instance_size"])
            total_cost += cost
            
            log_audit(conn, new_id, "cloned", clone_data.target_email,
                      f"Cloned from {clone_data.source_email}: {res['resource_type']}/{res['environment']}",
                      {"source_email": clone_data.source_email, "resource_type": res["resource_type"]})
            
            # Trigger provisioning for each cloned resource
            background_tasks.add_task(
                trigger_github_workflow,
                new_id, res["resource_type"], res["instance_size"],
                clone_data.target_email, res["environment"]
            )
        
        conn.commit()
        
        return {
            "cloned_count": len(cloned_ids),
            "request_ids": cloned_ids,
            "estimated_cost": total_cost,
            "source_email": clone_data.source_email,
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

# ---------------------------------------------------------------
# Feature: Audit Log
# ---------------------------------------------------------------
@app.get("/api/audit-logs")
async def get_audit_logs(request_id: Optional[str] = None, limit: int = 50):
    """Retrieve audit logs, optionally filtered by request_id."""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        if request_id:
            cur.execute("""
                SELECT id, request_id, action, actor, details, metadata, created_at
                FROM audit_logs WHERE request_id = %s
                ORDER BY created_at DESC LIMIT %s
            """, (request_id, limit))
        else:
            cur.execute("""
                SELECT id, request_id, action, actor, details, metadata, created_at
                FROM audit_logs ORDER BY created_at DESC LIMIT %s
            """, (limit,))
        
        logs = []
        for row in cur.fetchall():
            logs.append({
                "id": str(row["id"]),
                "request_id": str(row["request_id"]) if row["request_id"] else None,
                "action": row["action"],
                "actor": row["actor"],
                "details": row["details"],
                "metadata": row["metadata"],
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            })
        
        return {"logs": logs}
    finally:
        cur.close()
        conn.close()

# ---------------------------------------------------------------
# Core: List All Requests
# ---------------------------------------------------------------
@app.get("/api/requests")
async def list_requests():
    """Retrieves all infrastructure requests ordered by creation date."""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        query = """
            SELECT 
                id, requester_name, requester_email, resource_type,
                environment, instance_size, status, created_at, 
                expiry_date, connection_string, allowed_ip
            FROM requests 
            ORDER BY created_at DESC;
        """
        cur.execute(query)
        requests = cur.fetchall()
        
        formatted_requests = []
        for req in requests:
            formatted_requests.append({
                "id": str(req["id"]),
                "requester_name": req["requester_name"],
                "requester_email": req["requester_email"],
                "resource_type": req["resource_type"],
                "environment": req["environment"],
                "instance_size": req["instance_size"],
                "status": req["status"],
                "created_at": req["created_at"].isoformat() if req["created_at"] else None,
                "expiry_date": str(req["expiry_date"]) if req["expiry_date"] else None,
                "connection_string": mask_connection_string(req["connection_string"]),
                "allowed_ip": req["allowed_ip"]
            })
            
        return {"requests": formatted_requests}
        
    except Exception as e:
        print(f"Database error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch requests: {str(e)}"
        )
    finally:
        cur.close()
        conn.close()

# ---------------------------------------------------------------
# Feature: Owner-Only Connection String Reveal
# ---------------------------------------------------------------
@app.get("/api/requests/{request_id}/connection-string")
async def reveal_connection_string(request_id: str, email: str = Query(...)):
    """
    Returns the full unmasked connection string only if the
    requesting email matches the resource owner.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute(
            "SELECT connection_string, requester_email FROM requests WHERE id = %s",
            (request_id,)
        )
        req = cur.fetchone()
        
        if not req:
            raise HTTPException(status_code=404, detail="Request not found")
        
        if req["requester_email"] != email:
            raise HTTPException(status_code=403, detail="You can only view your own connection strings")
        
        if not req["connection_string"]:
            raise HTTPException(status_code=404, detail="No connection string available yet")
        
        return {"connection_string": req["connection_string"]}
    finally:
        cur.close()
        conn.close()

# ---------------------------------------------------------------
# Feature: IP Update (Zero Cost Security)
# ---------------------------------------------------------------
class UpdateIpRequest(BaseModel):
    new_allowed_ip: str
    
    @field_validator('new_allowed_ip')
    @classmethod
    def validate_ip(cls, v):
        if not v:
            raise ValueError('IP address is required')
        return v.replace('/32', '').strip()

@app.post("/api/requests/{request_id}/update-ip")
async def update_request_ip(request_id: str, ip_data: UpdateIpRequest):
    """
    Updates the allowed IP for an active resource and triggers the SG update workflow.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id, status, requester_email, resource_type, instance_size, environment FROM requests WHERE id = %s", (request_id,))
        req = cur.fetchone()
        if not req:
            raise HTTPException(status_code=404, detail="Request not found")
            
        cur.execute("UPDATE requests SET allowed_ip = %s WHERE id = %s", (ip_data.new_allowed_ip, request_id))
        
        log_audit(conn, request_id, "ip_updated", req["requester_email"],
                  f"Allowed IP updated to {ip_data.new_allowed_ip}",
                  {"new_ip": ip_data.new_allowed_ip})
        conn.commit()
        
        # Trigger GitHub workflow
        token = os.getenv("GITHUB_TOKEN")
        owner = os.getenv("GITHUB_OWNER")
        repo = os.getenv("GITHUB_REPO")
        
        if all([token, owner, repo]):
            url = f"https://api.github.com/repos/{owner}/{repo}/actions/workflows/update-sg.yml/dispatches"
            headers = {
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {token}",
                "X-GitHub-Api-Version": "2022-11-28"
            }
            payload = {
                "ref": "main",
                "inputs": {
                    "request_id": request_id,
                    "new_allowed_ip": ip_data.new_allowed_ip,
                    "resource_type": req["resource_type"],
                    "instance_size": req["instance_size"],
                    "email": req["requester_email"],
                    "environment": req["environment"]
                }
            }
            async with httpx.AsyncClient() as client:
                try:
                    response = await client.post(url, headers=headers, json=payload)
                    response.raise_for_status()
                except Exception as e:
                    print(f"Failed to trigger SG update workflow: {e}")
                    
        return {"message": "IP updated and SG update triggered", "allowed_ip": ip_data.new_allowed_ip}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

# ---------------------------------------------------------------
# Feature: Admin Policies
# ---------------------------------------------------------------
@app.get("/api/admin/policies")
async def get_policies(_: str = Depends(is_admin)):
    # Currently policies are hardcoded in policy_engine.py
    # Returning a mock format that the frontend expects
    return [
        {
            "id": "policy-1",
            "name": "Auto-Approve Dev Resources",
            "description": "Automatically approve small dev resources",
            "priority": 10,
            "action_type": "auto_approved",
            "conditions": [
                {"field": "environment", "operator": "eq", "value": "dev"},
                {"field": "instance_size", "operator": "eq", "value": "small"}
            ]
        },
        {
            "id": "policy-2",
            "name": "Cost Ceiling",
            "description": "Deny anything over $100",
            "priority": 1,
            "action_type": "auto_denied",
            "conditions": [
                {"field": "estimated_cost", "operator": "gt", "value": "100"}
            ]
        }
    ]

@app.post("/api/admin/policies")
async def create_policy(policy_data: dict, _: str = Depends(is_admin)):
    # Mock endpoint
    return {"message": "Policy created successfully", "id": "policy-new"}

@app.delete("/api/admin/policies/{policy_id}")
async def delete_policy(policy_id: str, _: str = Depends(is_admin)):
    # Mock endpoint
    return {"message": "Policy deleted successfully"}

# ---------------------------------------------------------------
# Feature: Live Provisioning Terminal Logs & Webhook
# ---------------------------------------------------------------
class ProgressUpdateRequest(BaseModel):
    step: str
    status: str
    message: str
    details: Optional[dict] = None

@app.get("/api/requests/{request_id}/logs")
async def get_provisioning_logs(request_id: str, x_user_email: Optional[str] = Header(None)):
    """
    Returns step-by-step provisioning logs for the requested resource.
    Protected: User must be the requester (or admin).
    """
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id, requester_email, status, workflow_run_url FROM requests WHERE id = %s", (request_id,))
        req = cur.fetchone()
        if not req:
            raise HTTPException(status_code=404, detail="Request not found")
        
        # Check ownership if email header is provided
        if x_user_email and req["requester_email"].strip().lower() != x_user_email.strip().lower():
            # Check if admin
            admin_emails = [e.strip().lower() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip()]
            if x_user_email.strip().lower() not in admin_emails:
                raise HTTPException(status_code=403, detail="Access denied: You can only view logs for your own requests")
            
        cur.execute("""
            SELECT step, status, message, details, created_at
            FROM provisioning_logs
            WHERE request_id = %s
            ORDER BY created_at ASC
        """, (request_id,))
        rows = cur.fetchall()
        
        logs = []
        for r in rows:
            logs.append({
                "step": r["step"],
                "status": r["status"],
                "message": r["message"],
                "details": r["details"] if isinstance(r["details"], dict) else json.loads(r["details"]) if r["details"] else {},
                "created_at": r["created_at"].isoformat() if r["created_at"] else None
            })
            
        return {
            "request_id": request_id,
            "request_status": req["status"],
            "workflow_run_url": req.get("workflow_run_url"),
            "logs": logs
        }
    finally:
        cur.close()
        conn.close()

@app.post("/api/requests/{request_id}/progress")
async def update_provisioning_progress(
    request_id: str, 
    progress: ProgressUpdateRequest, 
    x_api_key: Optional[str] = Header(None)
):
    """
    Webhook endpoint called by GitHub Actions workflow to report progress.
    """
    if x_api_key != WEBHOOK_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
        
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id, status FROM requests WHERE id = %s", (request_id,))
        req = cur.fetchone()
        if not req:
            raise HTTPException(status_code=404, detail="Request not found")
            
        # Insert log
        cur.execute("""
            INSERT INTO provisioning_logs (request_id, step, status, message, details)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            request_id, 
            progress.step, 
            progress.status, 
            progress.message, 
            json.dumps(progress.details) if progress.details else None
        ))
        
        # If details has run_url / run_id, update request record
        if progress.details:
            run_id = progress.details.get("run_id")
            run_url = progress.details.get("run_url")
            if run_id or run_url:
                cur.execute("""
                    UPDATE requests 
                    SET workflow_run_id = COALESCE(%s, workflow_run_id),
                        workflow_run_url = COALESCE(%s, workflow_run_url)
                    WHERE id = %s
                """, (run_id, run_url, request_id))
                
        # If step is complete, update request status to ready
        if progress.step == "complete" and progress.status == "success":
            cur.execute("UPDATE requests SET status = 'ready' WHERE id = %s", (request_id,))
        elif progress.status == "failed":
            cur.execute("UPDATE requests SET status = 'failed' WHERE id = %s", (request_id,))
            
        conn.commit()
        return {"status": "success", "message": "Progress recorded"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
