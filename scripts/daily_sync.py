"""
Daily sync script — run this once a day (via cron) to keep all users' listening
history up to date without needing to open the browser.

Usage:
    cd /Users/yash/Downloads/moodsync
    source backend/venv/bin/activate
    python scripts/daily_sync.py

Cron setup (runs every day at 2 AM):
    crontab -e
    0 2 * * * cd /Users/yash/Downloads/moodsync && source backend/venv/bin/activate && python scripts/daily_sync.py >> logs/daily_sync.log 2>&1
"""

import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
backend_path = os.path.join(os.path.dirname(current_dir), "backend")
sys.path.append(backend_path)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from spotipy.oauth2 import SpotifyOAuth
from dotenv import load_dotenv

load_dotenv(os.path.join(backend_path, ".env"))

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://moodsync_user:your_password@localhost:5432/moodsync")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

from app.models.database import User, Track, Listen
from app.services.spotify import SpotifyService


def refresh_spotify_token(refresh_token: str) -> str | None:
    """Use the stored refresh token to get a fresh Spotify access token."""
    oauth = SpotifyOAuth(
        client_id=os.getenv("SPOTIFY_CLIENT_ID"),
        client_secret=os.getenv("SPOTIFY_CLIENT_SECRET"),
        redirect_uri=os.getenv("SPOTIFY_REDIRECT_URI", "http://localhost:8000/api/auth/callback"),
        scope="user-read-recently-played",
        cache_path=None,
    )
    try:
        token_info = oauth.refresh_access_token(refresh_token)
        return token_info["access_token"]
    except Exception as e:
        print(f"   ❌ Token refresh failed: {e}")
        return None


def sync_user(user: User, db) -> int:
    """Sync recent tracks for one user. Returns number of new listens added."""
    access_token = refresh_spotify_token(user.spotify_refresh_token)
    if not access_token:
        return 0

    spotify_service = SpotifyService()
    sp = spotify_service.get_client(access_token)

    try:
        results = sp.current_user_recently_played(limit=50)
    except Exception as e:
        print(f"   ❌ Spotify fetch failed: {e}")
        return 0

    synced = 0
    for item in results.get("items", []):
        track_data = item["track"]
        played_at_str = item["played_at"]

        from datetime import datetime, timezone
        played_at = datetime.fromisoformat(played_at_str.replace("Z", "+00:00"))

        # Upsert track
        track_id = f"track_{track_data['id']}"
        track = db.query(Track).filter(Track.track_id == track_id).first()
        if not track:
            track = Track(
                track_id=track_id,
                spotify_id=track_data["id"],
                name=track_data["name"],
                artists=[a["name"] for a in track_data["artists"]],
                album=track_data.get("album", {}).get("name"),
                duration_ms=track_data.get("duration_ms"),
                popularity=track_data.get("popularity"),
            )
            db.add(track)
            db.flush()

        # Skip duplicate listens
        exists = (
            db.query(Listen)
            .filter(
                Listen.user_id == user.user_id,
                Listen.track_id == track_id,
                Listen.played_at == played_at,
            )
            .first()
        )
        if not exists:
            db.add(Listen(user_id=user.user_id, track_id=track_id, played_at=played_at))
            synced += 1

    db.commit()
    return synced


def run():
    db = SessionLocal()
    try:
        users = db.query(User).filter(User.spotify_refresh_token.isnot(None), User.is_active == True).all()
        print(f"🔄 Syncing {len(users)} user(s)...\n")

        for user in users:
            print(f"👤 {user.spotify_id}")
            count = sync_user(user, db)
            print(f"   ✅ {count} new listens added\n")

        print("Done.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
