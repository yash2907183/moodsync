import os
import threading
import logging
from datetime import datetime

from fastapi import APIRouter, Header, HTTPException
from sqlalchemy.orm import Session

from app.models import get_db
from app.models.database import User, Track, Listen
from app.api.tracks import fetch_lyrics_for_tracks
from app.services.spotify import get_spotify_service

router = APIRouter()
logger = logging.getLogger(__name__)


def _verify_cron_secret(authorization: str | None) -> None:
    secret = os.getenv("CRON_SECRET")
    if not secret:
        raise HTTPException(status_code=503, detail="CRON_SECRET not configured.")
    if authorization != f"Bearer {secret}":
        raise HTTPException(status_code=401, detail="Unauthorized.")


def _do_sync() -> None:
    """Runs in a background thread — syncs all users and runs sentiment analysis."""
    db: Session = next(get_db())
    try:
        spotify = get_spotify_service()
        auth_manager = spotify.get_oauth_manager()

        users = (
            db.query(User)
            .filter(User.is_active == True, User.spotify_refresh_token.isnot(None))
            .all()
        )

        logger.info(f"Auto-sync: processing {len(users)} user(s)")

        for user in users:
            try:
                token_info = auth_manager.refresh_access_token(user.spotify_refresh_token)
                access_token = token_info["access_token"]

                new_refresh = token_info.get("refresh_token")
                if new_refresh and new_refresh != user.spotify_refresh_token:
                    user.spotify_refresh_token = new_refresh
                    db.commit()

                recent_tracks = spotify.get_recently_played(access_token, limit=50)
                if not recent_tracks:
                    continue

                track_ids = list(set(t["spotify_id"] for t in recent_tracks if t.get("spotify_id")))

                for track_data in recent_tracks:
                    spotify_id = track_data.get("spotify_id")
                    if not spotify_id:
                        continue

                    track = db.query(Track).filter(Track.spotify_id == spotify_id).first()
                    if not track:
                        track = Track(
                            track_id=f"track_{spotify_id}",
                            spotify_id=spotify_id,
                            name=track_data.get("name"),
                            artists=track_data.get("artists"),
                            album=track_data.get("album"),
                            duration_ms=track_data.get("duration_ms"),
                            popularity=track_data.get("popularity"),
                        )
                        db.add(track)
                        db.commit()

                    db.add(Listen(
                        user_id=user.user_id,
                        track_id=track.track_id,
                        played_at=track_data.get("played_at"),
                        ms_played=track_data.get("duration_ms"),
                    ))

                user.last_sync = datetime.utcnow()
                db.commit()

                fetch_lyrics_for_tracks(db, track_ids)
                logger.info(f"Auto-sync done: {user.user_id} — {len(track_ids)} tracks")

            except Exception as e:
                logger.error(f"Auto-sync failed for {user.user_id}: {e}")
                db.rollback()

    finally:
        db.close()


@router.post("/sync")
async def auto_sync(authorization: str | None = Header(default=None)):
    """
    Nightly cron endpoint. Returns 202 immediately; processing runs in background.
    Protected by CRON_SECRET header: Authorization: Bearer <secret>
    """
    _verify_cron_secret(authorization)
    threading.Thread(target=_do_sync, daemon=True).start()
    return {"status": "accepted", "message": "Sync started in background."}
