import os
import psycopg2
from dotenv import load_dotenv

load_dotenv('backend/.env')
DATABASE_URL = os.getenv('DATABASE_URL')
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()
cur.execute("SELECT id, status, aws_resource_id, expiry_date FROM requests ORDER BY created_at DESC LIMIT 1;")
row = cur.fetchone()
print(f"Latest request: {row}")
conn.close()
