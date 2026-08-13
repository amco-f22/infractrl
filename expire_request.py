import os
import psycopg2
from dotenv import load_dotenv

load_dotenv('backend/.env')
DATABASE_URL = os.getenv('DATABASE_URL')
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()
cur.execute("UPDATE requests SET expiry_date = CURRENT_DATE - INTERVAL '1 day' WHERE status = 'ready'")
print(f"Updated {cur.rowcount} ready requests to be expired.")
conn.commit()
cur.close()
conn.close()
