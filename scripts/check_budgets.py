"""
check_budgets.py — Alert when users approach or exceed their monthly budget.

Schedule via cron or GitHub Actions alongside cleanup.yml.
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
BUDGET_LIMIT = int(os.getenv("BUDGET_LIMIT_PER_USER", "200"))

PRICING = {
    "postgres": {"small": 15, "medium": 28, "large": 56},
    "redis":    {"small": 10, "medium": 20, "large": 40},
    "s3":       {"small": 5,  "medium": 15, "large": 30},
}


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
        print(f"Slack notification failed: {e}")


def check_budgets():
    print(f"=== InfraCtrl Budget Check — {date.today()} ===")

    try:
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    except Exception as e:
        print(f"Database connection failed: {e}")
        return

    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT requester_email, resource_type, instance_size
            FROM requests
            WHERE status IN ('ready', 'provisioning')
              AND expiry_date > CURRENT_DATE
        """)
        rows = cur.fetchall()

        # Aggregate per user
        user_costs = {}
        for row in rows:
            email = row["requester_email"]
            cost = PRICING.get(row["resource_type"], {}).get(row["instance_size"], 0)
            user_costs[email] = user_costs.get(email, 0) + cost

        alerts_sent = 0
        for email, cost in user_costs.items():
            pct = (cost / BUDGET_LIMIT) * 100 if BUDGET_LIMIT > 0 else 0

            if cost > BUDGET_LIMIT:
                send_slack_notification(
                    f"🚨 *BUDGET EXCEEDED*\n"
                    f"*{email}* is at *${cost}/${BUDGET_LIMIT}* ({pct:.0f}%)\n"
                    f"Action required: review and clean up resources."
                )
                alerts_sent += 1
                print(f"OVER BUDGET: {email} — ${cost}/${BUDGET_LIMIT}")
            elif pct >= 80:
                send_slack_notification(
                    f"⚠️ *Budget Warning*\n"
                    f"*{email}* is at *${cost}/${BUDGET_LIMIT}* ({pct:.0f}%)\n"
                    f"Approaching budget limit."
                )
                alerts_sent += 1
                print(f"WARNING: {email} — ${cost}/${BUDGET_LIMIT} ({pct:.0f}%)")
            else:
                print(f"OK: {email} — ${cost}/${BUDGET_LIMIT} ({pct:.0f}%)")

        print(f"Budget check complete. {alerts_sent} alert(s) sent.")

    except Exception as e:
        print(f"Error during budget check: {e}")
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    check_budgets()
