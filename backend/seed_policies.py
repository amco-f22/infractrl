import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend', '.env'))

DATABASE_URL = os.getenv('DATABASE_URL')

DEFAULT_POLICIES = [
    {
        "name": "Production Gate",
        "description": "All production resources need manual approval",
        "priority": 90,
        "is_active": True,
        "created_by": "system",
        "conditions": [
            {"field": "environment", "operator": "eq", "value": "prod", "logic_gate": "AND"}
        ],
        "actions": [{"action_type": "pending_approval", "reason_template": "Production environment requires platform team review"}]
    },
    {
        "name": "Redis Review",
        "description": "Redis always needs approval",
        "priority": 60,
        "is_active": True,
        "created_by": "system",
        "conditions": [
            {"field": "resource_type", "operator": "eq", "value": "redis", "logic_gate": "AND"}
        ],
        "actions": [{"action_type": "pending_approval", "reason_template": "Redis resources require platform team review"}]
    },
    {
        "name": "Dev Fast Lane",
        "description": "Auto-approve small dev resources",
        "priority": 20,
        "is_active": True,
        "created_by": "system",
        "conditions": [
            {"field": "environment", "operator": "eq", "value": "dev", "logic_gate": "AND"}
        ],
        "actions": [{"action_type": "auto_approved", "reason_template": "Dev environment auto-approved"}]
    },
    {
        "name": "Hard Cost Ceiling",
        "description": "Never auto-approve anything for large instances",
        "priority": 10,
        "is_active": True,
        "created_by": "system",
        "conditions": [
            {"field": "instance_size", "operator": "eq", "value": "large", "logic_gate": "AND"}
        ],
        "actions": [{"action_type": "auto_denied", "reason_template": "Large instances need manager sign-off"}]
    }
]

def seed():
    print("Connecting to database...")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Check if policies already exist
        cur.execute("SELECT count(*) FROM policies")
        if cur.fetchone()['count'] > 0:
            print("Database already contains policies. Skipping seed.")
            return

        print("Seeding default policies...")
        
        for p in DEFAULT_POLICIES:
            # Insert policy
            cur.execute(
                "INSERT INTO policies (name, description, priority, is_active, created_by) VALUES (%s, %s, %s, %s, %s) RETURNING id",
                (p["name"], p["description"], p["priority"], p["is_active"], p["created_by"])
            )
            policy_id = cur.fetchone()['id']
            
            # Insert conditions
            for c in p["conditions"]:
                cur.execute(
                    "INSERT INTO policy_conditions (policy_id, field, operator, value, logic_gate) VALUES (%s, %s, %s, %s, %s)",
                    (policy_id, c["field"], c["operator"], c["value"], c["logic_gate"])
                )
                
            # Insert actions
            for a in p["actions"]:
                cur.execute(
                    "INSERT INTO policy_actions (policy_id, action_type, reason_template) VALUES (%s, %s, %s)",
                    (policy_id, a["action_type"], a["reason_template"])
                )
                
        print("Seeding completed successfully!")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    seed()
