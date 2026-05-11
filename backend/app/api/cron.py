import os
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session

from app.models import get_db
from app.models.database import User
from app.api.tracks import fetch_lyrics_for_tracks
from app.services.spotify import get_spotify_service

router = APIRouter()
logger = logging.getLogger(__name__)


def _verify_cron_secret(authorization: str | None) -> None:
    secret = os.getenv("CRON_SECRET")
    if not secret:
        raise HTTPException(status_code=503, detail="CRON_SECRET not configured.")
    expected = f"Bearer {secret}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Unauthorized.")


@router.post("/sync")
async def auto_sync_all_users(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    """
    Nightly cron endpoint — syncs every user's recent Spotify tracks and
    kicks off lyrics + sentiment analysis in the same process.
    Called by Railway's cron scheduler; protected by CRON_SECRET.
    """
    _verify_cron_secret(authorization)

    spotify = get_spotify_service()
    auth_manager = spotify.get_oauth_manager()

    users = (
        db.query(User)
        .filter(User.is_active == True, User.spotify_refresh_token.isnot(None))
        .all()
    )

    results = []
    for user in users:
        try:
            # Exchange stored refresh token for a fresh access token
            token_info = auth_manager.refresh_access_token(user.spotify_refresh_token)
            access_token = token_info["access_token"]

            # Save updated refresh token if Spotify rotated it
            new_refresh = token_info.get("refresh_token")
            if new_refresh and new_refresh != user.spotify_refresh_token:
                user.spotify_refresh_token = new_refresh
                db.commit()

            # Fetch recent tracks
            recent_tracks = spotify.get_recently_played(access_token, limit=50)
            if not recent_tracks:
                results.append({"user": user.user_id, "synced": 0})
                continue

            from app.models.database import Track, Listen
            track_ids = list(set(t["spotify_id"] for t in recent_tracks if t.get("spotify_id")))

            synced = 0
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

                listen = Listen(
                    user_id=user.user_id,
                    track_id=track.track_id,
                    played_at=track_data.get("played_at"),
                    ms_played=track_data.get("duration_ms"),
                )
                db.add(listen)
                synced += 1

            user.last_sync = datetime.utcnow()
            db.commit()

            # Run lyrics + sentiment in the same thread (cron has no time pressure)
            fetch_lyrics_for_tracks(db, track_ids)

            results.append({"user": user.user_id, "synced": synced})
            logger.info(f"Auto-sync: {user.user_id} — {synced} tracks")

        except Exception as e:
            logger.error(f"Auto-sync failed for {user.user_id}: {e}")
            results.append({"user": user.user_id, "error": str(e)})

    return {
        "synced_at": datetime.utcnow().isoformat(),
        "users_processed": len(users),
        "results": results,
    }
