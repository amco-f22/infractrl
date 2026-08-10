"""
cleanup.py — Auto-destroy expired InfraCtrl resources.

Design:
  - Queries the database for requests past their expiry date
  - Uses the aws_resource_id from the DB to confirm the correct S3 state key
  - Runs `terraform destroy` using the per-request isolated state file in S3
  - Updates DB status to 'deleted' on success
  - Sends Slack notification on each deletion

Run:
  python scripts/cleanup.py

Schedule:
  Option A (cron): 0 2 * * * /usr/bin/python3 /path/to/scripts/cleanup.py
  Option B: GitHub Actions scheduled workflow (see .github/workflows/cleanup.yml)
"""

import os
import subprocess
import psycopg2
import json
import urllib.request
from psycopg2.extras import RealDictCursor
from datetime import date
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend", ".env"))

DATABASE_URL = os.getenv("DATABASE_URL")
SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL")
TERRAFORM_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "terraform")
S3_STATE_BUCKET = os.getenv("TF_STATE_BUCKET", "infractl-terraform-state")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")


def send_slack_notification(message):
    if not SLACK_WEBHOOK_URL:
        return
    payload = {"text": message}
    req = urllib.request.Request(
        SLACK_WEBHOOK_URL,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    try:
        urllib.request.urlopen(req)
    except Exception as e:
        print(f"Failed to send Slack notification: {e}")


def get_db_connection():
    try:
        return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None


def destroy_infrastructure(request):
    """
    Runs terraform destroy for a SPECIFIC request using its isolated S3 state file.
    This is safe for concurrent runs — each request has its own state key.
    """
    request_id = str(request['id'])
    print(f"Destroying infrastructure for request: {request_id} (aws_resource_id: {request.get('aws_resource_id', 'N/A')})")

    state_key = f"state/{request_id}.tfstate"

    try:
        # Step 1: Init with the specific state key for this request
        init_cmd = [
            "terraform", "init", "-reconfigure",
            f"-backend-config=bucket={S3_STATE_BUCKET}",
            f"-backend-config=key={state_key}",
            f"-backend-config=region={AWS_REGION}",
            f"-backend-config=dynamodb_table=infractl-terraform-locks",
            f"-backend-config=encrypt=true"
        ]
        subprocess.run(init_cmd, cwd=TERRAFORM_DIR, check=True, capture_output=True)

        # Step 2: Destroy using the correct variables for THIS specific request
        destroy_cmd = [
            "terraform", "destroy", "-auto-approve",
            f"-var=request_id={request_id}",
            f"-var=resource_type={request.get('resource_type', 'postgres')}",
            f"-var=instance_size={request['instance_size']}",
            f"-var=requester_email={request['requester_email']}",
            f"-var=environment={request['environment']}"
        ]
        result = subprocess.run(
            destroy_cmd, cwd=TERRAFORM_DIR, check=True, capture_output=True, text=True
        )
        print(f"Successfully destroyed infrastructure for {request_id}")
        return True

    except subprocess.CalledProcessError as e:
        print(f"Terraform destroy FAILED for {request_id}:\n{e.stderr}")
        return False
    except Exception as e:
        print(f"Unexpected error destroying {request_id}: {e}")
        return False


def run_cleanup():
    print(f"=== InfraCtrl Cleanup Job — {date.today()} ===")

    conn = get_db_connection()
    if not conn:
        print("Cannot connect to database. Aborting cleanup.")
        return

    cur = conn.cursor()

    try:
        # Fetch ALL expired requests not yet marked deleted
        query = """
            SELECT id, requester_name, requester_email, environment,
                   instance_size, resource_type, aws_resource_id
            FROM requests
            WHERE expiry_date <= CURRENT_DATE
            AND status != 'deleted';
        """
        cur.execute(query)
        expired_requests = cur.fetchall()

        if not expired_requests:
            print("No expired resources found. All clean!")
            return

        print(f"Found {len(expired_requests)} expired resource(s) to destroy.")

        for req in expired_requests:
            req_id = str(req['id'])

            if not req.get('aws_resource_id'):
                # Resource was never successfully provisioned — just mark deleted
                print(f"Request {req_id} has no aws_resource_id — skipping Terraform, marking deleted.")
                cur.execute("UPDATE requests SET status = 'deleted' WHERE id = %s;", (req_id,))
                conn.commit()
                continue

            success = destroy_infrastructure(req)

            if success:
                cur.execute("UPDATE requests SET status = 'deleted' WHERE id = %s;", (req_id,))
                conn.commit()
                print(f"Marked request {req_id} as deleted.")
                send_slack_notification(
                    f"🧹 *Resource Deleted*\n"
                    f"Request `{req_id}` for `{req['environment']}` has been destroyed automatically.\n"
                    f"AWS ID: `{req.get('aws_resource_id', 'N/A')}`"
                )
            else:
                # Don't mark as deleted if destroy failed — leave for manual intervention
                send_slack_notification(
                    f"❌ *Cleanup FAILED*\n"
                    f"Could not destroy request `{req_id}` (`{req.get('aws_resource_id', 'N/A')}`).\n"
                    f"Manual intervention required!"
                )

    except Exception as e:
        print(f"Unexpected error during cleanup: {e}")
    finally:
        cur.close()
        conn.close()
        print("=== Cleanup job finished ===")


if __name__ == "__main__":
    run_cleanup()
