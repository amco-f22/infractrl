import os
import psycopg2
import json
import urllib.request
from psycopg2.extras import RealDictCursor
from datetime import date
from dotenv import load_dotenv

# Load environment variables (from backend/.env if running locally)
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL")

def send_slack_notification(message):
    if not SLACK_WEBHOOK_URL:
        print("Slack Webhook URL not configured. Skipping notification.")
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
        print("Slack notification sent successfully.")
    except Exception as e:
        print(f"Failed to send Slack notification: {e}")

def get_db_connection():
    try:
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None

def run_expiry_check():
    print(f"Starting expiry check job at {date.today()}...")
    
    conn = get_db_connection()
    if not conn:
        return
        
    cur = conn.cursor()
    
    try:
        # Fetch requests that expire exactly tomorrow
        query = """
            SELECT id, requester_name, requester_email, environment
            FROM requests
            WHERE expiry_date = CURRENT_DATE + INTERVAL '1 day'
            AND status != 'deleted';
        """
        cur.execute(query)
        expiring_requests = cur.fetchall()
        
        if not expiring_requests:
            print("No resources expiring tomorrow. Check complete.")
            return
            
        print(f"Found {len(expiring_requests)} resources expiring in 24 hours.")
        
        for req in expiring_requests:
            message = (
                f"⚠️ *Database Expiring Soon*\n"
                f"The `{req['environment']}` database requested by {req['requester_email']} "
                f"is scheduled for automatic deletion in 24 hours.\n"
                f"Request ID: `{req['id']}`"
            )
            send_slack_notification(message)
                
    except Exception as e:
        print(f"Error during expiry check execution: {e}")
    finally:
        cur.close()
        conn.close()
        print("Expiry check job finished.")

if __name__ == "__main__":
    run_expiry_check()
