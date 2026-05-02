import sys
import os
import pandas as pd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# --- SETUP ---
# 1. Connect to your App's Database
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_path = os.path.join(os.path.dirname(current_dir), 'backend')
load_dotenv(os.path.join(backend_path, '.env'))

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://moodsync_user:your_password@localhost:5432/moodsync")
engine = create_engine(DATABASE_URL)

def dump_table(table_name, limit=5):
    print(f"\n📂 TABLE: {table_name} (Showing first {limit} rows)")
    print("=" * 60)
    
    with engine.connect() as conn:
        # We use pandas here just because it prints tables very nicely
        try:
            query = text(f"SELECT * FROM {table_name} ORDER BY created_at DESC LIMIT {limit}")
            df = pd.read_sql(query, conn)
            
            if df.empty:
                print("(Table is empty)")
            else:
                # Clean up display (hide massive text blobs)
                if 'text' in df.columns:
                    df['text'] = df['text'].str[:30] + "..." # Truncate lyrics
                if 'artists' in df.columns:
                    df['artists'] = df['artists'].astype(str).str[:30]
                
                print(df.to_string(index=False))
                
        except Exception as e:
            print(f"Error reading {table_name}: {e}")

if __name__ == "__main__":
    print("💽 DATABASE DUMP - VERIFYING SAVED DATA")
    
    # 1. Check the Tracks (Metadata + Moods)
    dump_table("tracks")
    
    # 2. Check the AI Scores (Emotions)
    dump_table("scores")
    
    # 3. Check the Lyrics (Cached Text)
    dump_table("lyrics")
    
    print("\n✅ Verification Complete: This data is permanently saved on your disk.")