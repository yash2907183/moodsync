import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# 1. Setup path so we can import 'app'
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# 2. Import your Track model
from app.models.database import Track

# 3. Define the connection DIRECTLY here (Bypassing import errors)
#    We use the default credentials from your setup guide.
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://moodsync_user:your_password@localhost:5432/moodsync")

def check_data():
    print(f"🔌 Connecting to database: {DATABASE_URL.split('@')[-1]}...") # Hide password in logs
    
    # Create manual connection
    try:
        engine = create_engine(DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        # --- QUERY THE DATA ---
        
        # Count total tracks
        count = db.query(Track).count()
        print(f"\n✅ SUCCESS! Total Tracks in DB: {count}")
        print("-" * 50)

        # Show details of the last 10 tracks
        recent_tracks = db.query(Track).order_by(Track.created_at.desc()).limit(10).all()
        
        if not recent_tracks:
            print("No tracks found yet.")
        
        for t in recent_tracks:
            # Check mood data
            mood_status = "❌ No Mood Data"
            if t.valence is not None:
                mood_status = f"✅ Valence: {t.valence}"
            
            print(f"🎵 {t.name}")
            print(f"   Artist: {t.artists}")
            print(f"   Status: {mood_status}")
            print("-" * 30)

    except Exception as e:
        print(f"\n❌ CRITICAL ERROR: {e}")
        print("Tip: Check if your Postgres server is running and the password is correct.")
    finally:
        if 'db' in locals():
            db.close()

if __name__ == "__main__":
    check_data()