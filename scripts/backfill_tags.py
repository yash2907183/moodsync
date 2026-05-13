"""
One-time script to fetch Last.fm tags for all existing tracks in the DB.
Run once after deploying the Last.fm integration.
~93 tracks at 1 req/sec = ~2 minutes.
"""
import sys
import os
import time

current_dir = os.path.dirname(os.path.abspath(__file__))
backend_path = os.path.join(os.path.dirname(current_dir), 'backend')
sys.path.append(backend_path)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.database import Track
from app.services.lastfm import LastFmService
from dotenv import load_dotenv

load_dotenv(os.path.join(backend_path, '.env'), override=False)

DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL or "localhost" in DATABASE_URL:
    print("\n❌  Set DATABASE_URL to your Neon production URL:")
    print("    export DATABASE_URL='postgresql://...'")
    sys.exit(1)

LASTFM_API_KEY = os.getenv("LASTFM_API_KEY", "")
if not LASTFM_API_KEY:
    print("\n❌  Set LASTFM_API_KEY before running.")
    sys.exit(1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
lastfm = LastFmService()


def run():
    db = SessionLocal()
    try:
        tracks = db.query(Track).filter(Track.tags.is_(None)).all()
        print(f"📊  Found {len(tracks)} tracks without tags.\n")

        tagged = 0
        for i, track in enumerate(tracks):
            artist = (
                track.artists[0]
                if isinstance(track.artists, list) and track.artists
                else str(track.artists)
            )
            tags = lastfm.get_track_tags(track.name, artist)
            track.tags = tags if tags else []
            db.commit()

            status = ", ".join(tags) if tags else "no tags found"
            print(f"[{i+1}/{len(tracks)}] {track.name} — {status}")
            if tags:
                tagged += 1

            time.sleep(0.3)  # Last.fm free tier: ~5 req/sec max

    except KeyboardInterrupt:
        print("\n⚠️   Interrupted — progress saved.")
    finally:
        db.close()
        print(f"\n✅  Done — {tagged}/{len(tracks)} tracks tagged.")


if __name__ == "__main__":
    run()
