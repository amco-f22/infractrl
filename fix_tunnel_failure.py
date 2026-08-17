import os
import psycopg2
from dotenv import load_dotenv

load_dotenv('backend/.env')
DATABASE_URL = os.getenv('DATABASE_URL')
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()
req_id = '6e6b973b-8779-45f0-8234-3e083b277463'
cur.execute("UPDATE requests SET status = 'ready', aws_resource_id = 'infractl-' || %s, expiry_date = CURRENT_DATE - INTERVAL '1 day' WHERE id = %s", (req_id, req_id))
print(f"Updated request {req_id} to ready, added aws_resource_id, and backdated expiry.")
conn.commit()
cur.close()
conn.close()
