import sys
import os

# --- PATH SETUP ---
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_path = os.path.join(os.path.dirname(current_dir), 'backend')
sys.path.append(backend_path)
# ------------------

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.database import Track, Lyric, Score
from dotenv import load_dotenv

# Load env from backend
load_dotenv(os.path.join(backend_path, '.env'))
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://moodsync_user:your_password@localhost:5432/moodsync")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def view_analysis():
    db = SessionLocal()
    try:
        # Fetch tracks that have a score
        tracks = db.query(Track).join(Score).order_by(Track.created_at.desc()).limit(10).all()
        
        print(f"\n📊 DETAILED LYRIC ANALYSIS (Last {len(tracks)} Songs)\n")
        
        for t in tracks:
            score = db.query(Score).filter(Score.track_id == t.track_id).first()
            lyric = db.query(Lyric).filter(Lyric.track_id == t.track_id).first()
            
            print(f"🎵 {t.name} - {t.artists[0]}")
            print("-" * 50)
            
            # 1. EMOTION BREAKDOWN
            # Find the dominant emotion
            emotions = {
                "Joy 😃": score.joy,
                "Sadness 😢": score.sadness,
                "Anger 😠": score.anger,
                "Fear 😨": score.fear
            }
            # Sort by value
            sorted_emotions = sorted(emotions.items(), key=lambda x: x[1], reverse=True)
            dominant = sorted_emotions[0]
            
            print(f"   🧠 Dominant Emotion: {dominant[0]} ({dominant[1]:.1%})")
            print(f"   📉 Valence (Positivity): {score.valence_score:.2f}  |  ⚡ Energy: {score.arousal_score:.2f}")
            
            # 2. LYRIC SNIPPET
            if lyric and lyric.text:
                snippet = lyric.text[:100].replace('\n', ' ') + "..."
                print(f"   📝 Lyric Snippet: \"{snippet}\"")
            else:
                print("   📝 (Instrumental / No Lyrics)")
                
            print("\n")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    view_analysis()