import os
import json
from datetime import datetime, timedelta
from typing import List, Optional

import psycopg2
import httpx
from psycopg2.extras import RealDictCursor
from fastapi import FastAPI, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field, field_validator
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="InfraCtrl API")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL")

# Cost estimation map (matches frontend PRICING)
PRICING = {
    "postgres": {"small": 15, "medium": 28, "large": 56},
    "redis":    {"small": 10, "medium": 20, "large": 40},
    "s3":       {"small": 5,  "medium": 15, "large": 30},
}
BUDGET_LIMIT_PER_USER = int(os.getenv("BUDGET_LIMIT_PER_USER", "200"))

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
async def trigger_github_workflow(request_id: str, resource_type: str, instance_size: str, email: str, environment: str):
    """Triggers the GitHub Actions provisioning workflow."""
    token = os.getenv("GITHUB_TOKEN")
    owner = os.getenv("GITHUB_OWNER")
    repo = os.getenv("GITHUB_REPO")
    
    if not all([token, owner, repo]):
        print("GitHub configuration missing, skipping workflow trigger.")
        return

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
            "environment": environment
        }
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            print(f"Triggered GitHub Action for request {request_id}")
        except Exception as e:
            print(f"Failed to trigger GitHub Action: {e}")

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
        # Budget check (warn but don't block)
        cur.execute("""
            SELECT resource_type, instance_size FROM requests
            WHERE requester_email = %s AND status IN ('ready', 'provisioning')
              AND expiry_date > CURRENT_DATE
        """, (request_data.requester_email,))
        active = cur.fetchall()
        current_spend = sum(estimate_cost(r["resource_type"], r["instance_size"]) for r in active)
        new_cost = estimate_cost(request_data.resource_type, request_data.instance_size)
        budget_warning = None
        if current_spend + new_cost > BUDGET_LIMIT_PER_USER:
            budget_warning = f"This will put you at ${current_spend + new_cost}/${BUDGET_LIMIT_PER_USER} monthly budget."
        
        # Insert the request
        query = """
            INSERT INTO requests (
                requester_name, requester_email, resource_type,
                environment, instance_size, expiry_date, status
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, status, expiry_date;
        """
        cur.execute(query, (
            request_data.requester_name,
            request_data.requester_email,
            request_data.resource_type,
            request_data.environment,
            request_data.instance_size,
            expiry_date,
            "provisioning"
        ))
        
        result = cur.fetchone()
        req_id = str(result["id"])
        
        # Audit log
        log_audit(conn, req_id, "created", request_data.requester_email,
                  f"Created {request_data.resource_type}/{request_data.environment}/{request_data.instance_size}",
                  {"resource_type": request_data.resource_type, "environment": request_data.environment,
                   "instance_size": request_data.instance_size, "estimated_cost": new_cost})
        
        conn.commit()
        
        # Trigger GitHub Action in the background
        background_tasks.add_task(
            trigger_github_workflow, 
            req_id, 
            request_data.resource_type,
            request_data.instance_size, 
            request_data.requester_email, 
            request_data.environment
        )
        
        response = {
            "id": req_id,
            "status": result["status"],
            "message": "Request created! Provisioning workflow triggered.",
            "expiry_date": str(result["expiry_date"]),
            "estimated_cost": new_cost,
        }
        if budget_warning:
            response["budget_warning"] = budget_warning
        
        return response
        
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
async def update_request_status(request_id: str, update_data: StatusUpdateRequest, background_tasks: BackgroundTasks):
    """
    Updates the status and connection string of a request after provisioning.
    Triggers Slack notification if status is 'ready'.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
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
            message = f"🚀 *Database is ready!*\nYour request `{request_id}` has been provisioned.\nConnection string: `{update_data.connection_string}`"
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
                expiry_date, connection_string 
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
                "connection_string": req["connection_string"]
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
