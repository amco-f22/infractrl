import os
import subprocess
import psycopg2
import json
import urllib.request
from psycopg2.extras import RealDictCursor
from datetime import date
from dotenv import load_dotenv

# Load environment variables (from backend/.env if running locally)
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
TERRAFORM_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "terraform")
SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL")

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
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None

def destroy_infrastructure(request):
    """
    Runs terraform destroy for a specific request.
    """
    print(f"Destroying infrastructure for request: {request['id']}")
    
    # Construct terraform command
    cmd = [
        "terraform", "destroy", "-auto-approve",
        f"-var=request_id={request['id']}",
        f"-var=instance_size={request['instance_size']}",
        f"-var=requester_email={request['requester_email']}",
        f"-var=environment={request['environment']}"
    ]
    
    try:
        # Run terraform init just in case
        subprocess.run(["terraform", "init"], cwd=TERRAFORM_DIR, check=True, capture_output=True)
        
        # Run terraform destroy
        result = subprocess.run(cmd, cwd=TERRAFORM_DIR, check=True, capture_output=True, text=True)
        print(f"Successfully destroyed infrastructure for {request['id']}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Failed to destroy infrastructure for {request['id']}. Error:\n{e.stderr}")
        return False
    except Exception as e:
        print(f"Unexpected error destroying infrastructure: {e}")
        return False

def run_cleanup():
    print(f"Starting cleanup job at {date.today()}...")
    
    conn = get_db_connection()
    if not conn:
        return
        
    cur = conn.cursor()
    
    try:
        # Fetch expired requests that haven't been deleted yet
        query = """
            SELECT id, requester_name, requester_email, environment, instance_size
            FROM requests
            WHERE expiry_date <= CURRENT_DATE
            AND status != 'deleted';
        """
        cur.execute(query)
        expired_requests = cur.fetchall()
        
        if not expired_requests:
            print("No expired resources found. Cleanup complete.")
            return
            
        print(f"Found {len(expired_requests)} expired resources to clean up.")
        
        for req in expired_requests:
            success = destroy_infrastructure(req)
            
            if success:
                # Update status to deleted
                update_query = "UPDATE requests SET status = 'deleted' WHERE id = %s;"
                cur.execute(update_query, (req['id'],))
                conn.commit()
                print(f"Marked request {req['id']} as deleted in database.")
                
                # Phase 8: Slack Notification
                send_slack_notification(f"🧹 *Database Deleted*\nExpired request `{req['id']}` for {req['environment']} has been destroyed.")
                
    except Exception as e:
        print(f"Error during cleanup execution: {e}")
    finally:
        cur.close()
        conn.close()
        print("Cleanup job finished.")

if __name__ == "__main__":
    run_cleanup()
