import sys
import os
import time

current_dir = os.path.dirname(os.path.abspath(__file__))
backend_path = os.path.join(os.path.dirname(current_dir), 'backend')
sys.path.append(backend_path)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.database import Track, Lyric, Score
from app.services.lyrics import LyricsService
from app.services.sentiment import SentimentAnalyzer
from dotenv import load_dotenv

load_dotenv(os.path.join(backend_path, '.env'))

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://moodsync_user:your_password@localhost:5432/moodsync")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def run_backfill():
    print("🧠 Initializing AI Models... (Downloading ~500MB on first run)")
    
    try:
        lyrics_service = LyricsService()
        sentiment_analyzer = SentimentAnalyzer()
        db = SessionLocal()
    except Exception as e:
        print(f"❌ Initialization Failed: {e}")
        return

    try:
        tracks = db.query(Track).filter(Track.valence == None).all()
        print(f"\n📊 Found {len(tracks)} tracks needing analysis.\n")
        
        for i, track in enumerate(tracks):
            artist_name = track.artists[0] if isinstance(track.artists, list) else str(track.artists)
            print(f"[{i+1}/{len(tracks)}] Processing: {track.name} - {artist_name}")
            
            lyric_obj = db.query(Lyric).filter(Lyric.track_id == track.track_id).first()
            lyrics_text = ""
            
            if lyric_obj:
                print("   📖 Lyrics found in cache.")
                lyrics_text = lyric_obj.text
            else:
                print("   ☁️  Fetching from Genius...")
                fetched_text, source, is_instrumental = lyrics_service.fetch_lyrics(track.name, artist_name)
                
                if fetched_text:
                    lyrics_text = fetched_text
                    new_lyric = Lyric(
                        track_id=track.track_id, 
                        source=source, 
                        text=fetched_text, 
                        is_instrumental=is_instrumental
                    )
                    db.add(new_lyric)
                    db.commit()
                elif is_instrumental:
                    print("   🎷 Instrumental. Setting neutral mood.")
                    track.valence = 0.5
                    track.energy = 0.5
                    db.commit()
                    continue
                else:
                    print("   ❌ Lyrics not found. Skipping.")
                    continue

            print("   🤖 Analyzing emotions...")
            result = sentiment_analyzer.analyze_comprehensive(lyrics_text)
            
            score = Score(
                track_id=track.track_id,
                model="hybrid_roberta",
                polarity=result["polarity"],
                valence_score=result["valence"],
                arousal_score=result["arousal"],
                joy=result["emotions"].get("joy", 0),
                sadness=result["emotions"].get("sadness", 0),
                anger=result["emotions"].get("anger", 0),
                fear=result["emotions"].get("fear", 0),
                optimism=result["emotions"].get("optimism", 0)
            )
            db.add(score)
            
            track.valence = result["valence"]
            track.energy = result["arousal"]
            
            db.commit()
            print(f"   ✅ Result: Valence={result['valence']:.2f}, Energy={result['arousal']:.2f}")
            print("-" * 40)
            
            time.sleep(1.0) # Be nice to API

    except Exception as e:
        print(f"\n❌ Runtime Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_backfill()