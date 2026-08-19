import os
import psycopg2
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

DATABASE_URL = os.getenv('DATABASE_URL')

def migrate():
    print('Connecting to database...')
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()
    
    try:
        print('Creating custom policies tables...')
        
        # Policies table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS policies (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            description TEXT,
            priority INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT true,
            created_by TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        """)
        
        # Policy conditions table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS policy_conditions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
            field TEXT NOT NULL,
            operator TEXT NOT NULL,
            value TEXT NOT NULL,
            logic_gate TEXT DEFAULT 'AND'
        );
        """)
        
        # Policy actions table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS policy_actions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
            action_type TEXT NOT NULL,
            reason_template TEXT
        );
        """)
        
        print('Tables created successfully!')
        
    except Exception as e:
        print(f'Error creating tables: {e}')
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    migrate()
