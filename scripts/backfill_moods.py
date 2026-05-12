import sys
import os
import time

current_dir = os.path.dirname(os.path.abspath(__file__))
backend_path = os.path.join(os.path.dirname(current_dir), 'backend')
sys.path.append(backend_path)

from sqlalchemy import create_engine, or_
from sqlalchemy.orm import sessionmaker
from app.models.database import Track, Lyric, Score
from app.services.lyrics import LyricsService
from app.services.sentiment import SentimentAnalyzer
from dotenv import load_dotenv

# Shell env takes priority over .env so you can pass the Neon URL directly
load_dotenv(os.path.join(backend_path, '.env'), override=False)

DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL or "localhost" in DATABASE_URL:
    print("\n❌  Set DATABASE_URL to your Neon production URL before running:")
    print("    export DATABASE_URL='postgresql://...'")
    print("    python scripts/backfill_moods.py\n")
    sys.exit(1)

print(f"🔌  Connecting to: ...{DATABASE_URL[-30:]}")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def run_backfill():
    print("🧠  Loading AI models (may take ~30s)...\n")
    try:
        lyrics_service = LyricsService()
        sentiment_analyzer = SentimentAnalyzer()
        db = SessionLocal()
    except Exception as e:
        print(f"❌  Init failed: {e}")
        return

    try:
        # All tracks with no real Score: valence=None or valence=0.0
        tracks = (
            db.query(Track)
            .outerjoin(Score, Score.track_id == Track.track_id)
            .filter(
                or_(Track.valence.is_(None), Track.valence == 0.0),
                Score.score_id.is_(None),
            )
            .all()
        )
        print(f"📊  Found {len(tracks)} tracks to process.\n")

        scored = 0
        skipped = 0

        for i, track in enumerate(tracks):
            artist = (
                track.artists[0]
                if isinstance(track.artists, list) and track.artists
                else str(track.artists)
            )
            print(f"[{i+1}/{len(tracks)}] {track.name} — {artist}")

            lyric_obj = db.query(Lyric).filter(Lyric.track_id == track.track_id).first()

            # Decide whether to fetch lyrics
            if lyric_obj and lyric_obj.text and len(lyric_obj.text.strip()) >= 50:
                lyrics_text = lyric_obj.text
                print("   📖  Using cached lyrics.")
            else:
                # Either no Lyric record or a dummy (source='none', empty text) — retry
                print("   ☁️   Fetching from Genius...")
                fetched, source, is_instrumental = lyrics_service.fetch_lyrics(
                    track.name, artist
                )

                if is_instrumental:
                    print("   🎷  Instrumental — setting valence=0.5.")
                    track.valence = 0.5
                    track.energy  = 0.5
                    if lyric_obj:
                        lyric_obj.source = "genius"
                        lyric_obj.text   = ""
                        lyric_obj.is_instrumental = True
                    else:
                        db.add(Lyric(track_id=track.track_id, source="genius",
                                     text="", is_instrumental=True))
                    db.commit()
                    skipped += 1
                    print("-" * 40)
                    time.sleep(0.5)
                    continue

                if not fetched:
                    print("   ❌  No lyrics found — skipping.")
                    skipped += 1
                    print("-" * 40)
                    time.sleep(0.5)
                    continue

                lyrics_text = fetched

                # Update or create Lyric record with real text
                if lyric_obj:
                    lyric_obj.text   = lyrics_text
                    lyric_obj.source = source
                    lyric_obj.is_instrumental = False
                else:
                    db.add(Lyric(track_id=track.track_id, source=source,
                                 text=lyrics_text, is_instrumental=False))
                db.commit()

            # Run sentiment
            print("   🤖  Analysing emotions...")
            result = sentiment_analyzer.analyze_comprehensive(lyrics_text)

            existing_score = db.query(Score).filter(Score.track_id == track.track_id).first()
            if not existing_score:
                db.add(Score(
                    track_id=track.track_id,
                    model="hybrid_roberta",
                    polarity=result["polarity"],
                    valence_score=result["valence"],
                    arousal_score=result["arousal"],
                    joy=result["emotions"].get("joy", 0),
                    sadness=result["emotions"].get("sadness", 0),
                    anger=result["emotions"].get("anger", 0),
                    fear=result["emotions"].get("fear", 0),
                    optimism=result["emotions"].get("optimism", 0),
                ))
            track.valence = result["valence"]
            track.energy  = result["arousal"]
            db.commit()

            print(f"   ✅  valence={result['valence']:.3f}  energy={result['arousal']:.3f}")
            scored += 1
            print("-" * 40)
            time.sleep(0.8)  # be polite to Genius

    except KeyboardInterrupt:
        print("\n⚠️   Interrupted — progress saved so far.")
    except Exception as e:
        print(f"\n❌  Runtime error: {e}")
        import traceback; traceback.print_exc()
    finally:
        db.close()
        print(f"\n✅  Done — {scored} newly scored, {skipped} skipped (no lyrics / instrumental).")


if __name__ == "__main__":
    run_backfill()
