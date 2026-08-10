"""
notify_expiry.py — Send 24-hour advance warnings for resources expiring tomorrow.

Schedule:
  Option A (cron): 0 8 * * * /usr/bin/python3 /path/to/scripts/notify_expiry.py
  Option B: GitHub Actions scheduled workflow (see .github/workflows/cleanup.yml)
"""

import os
import psycopg2
import json
import urllib.request
from psycopg2.extras import RealDictCursor
from datetime import date
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend", ".env"))

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
        print("Slack notification sent.")
    except Exception as e:
        print(f"Failed to send Slack notification: {e}")


def get_db_connection():
    try:
        return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None


def run_expiry_check():
    print(f"=== InfraCtrl Expiry Check — {date.today()} ===")

    conn = get_db_connection()
    if not conn:
        return

    cur = conn.cursor()

    try:
        query = """
            SELECT id, requester_name, requester_email, environment, resource_type
            FROM requests
            WHERE expiry_date = CURRENT_DATE + INTERVAL '1 day'
            AND status NOT IN ('deleted', 'failed');
        """
        cur.execute(query)
        expiring_requests = cur.fetchall()

        if not expiring_requests:
            print("No resources expiring in 24 hours.")
            return

        print(f"Found {len(expiring_requests)} resource(s) expiring tomorrow.")

        for req in expiring_requests:
            message = (
                f"⚠️ *Resource Expiring in 24 Hours*\n"
                f"*Owner:* {req['requester_email']}\n"
                f"*Type:* {req.get('resource_type', 'postgres')} / `{req['environment']}`\n"
                f"*Request ID:* `{req['id']}`\n"
                f"It will be automatically destroyed tomorrow. Please migrate your data if needed."
            )
            send_slack_notification(message)

    except Exception as e:
        print(f"Error during expiry check: {e}")
    finally:
        cur.close()
        conn.close()
        print("=== Expiry check finished ===")


if __name__ == "__main__":
    run_expiry_check()
