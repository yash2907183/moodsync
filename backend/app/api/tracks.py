"""
Tracks API endpoints
"""
import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import traceback

from app.models import get_db
from app.models.database import User, Track, Listen, Lyric, Score
from app.models.schemas import TrackResponse, ListenResponse
from app.api.auth import get_current_user
from app.services.spotify import get_spotify_service
from app.services.lyrics import get_lyrics_service
from app.services.sentiment import get_sentiment_analyzer

logger = logging.getLogger(__name__)

ALLOWED_FEATURE_KEYS = {
    "valence","energy","danceability","tempo","loudness",
    "speechiness","acousticness","instrumentalness","liveness",
    "key","mode","time_signature"
}

def normalize_id(s: str):
    """
    Convert 'spotify:track:XYZ' → 'XYZ'
    Keeps plain IDs unchanged.
    """
    if s and isinstance(s, str) and s.startswith("spotify:track:"):
        return s.split(":")[-1]
    return s

router = APIRouter()


@router.get("/analysis-status")
async def get_analysis_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Count of this user's tracks still waiting for sentiment analysis."""
    from sqlalchemy import func
    pending = (
        db.query(func.count(Listen.listen_id.distinct()))
        .join(Track, Listen.track_id == Track.track_id)
        .filter(
            Listen.user_id == current_user.user_id,
            Track.valence.is_(None),
        )
        .scalar()
    ) or 0
    return {"pending": pending}


@router.get("/stuck")
async def get_stuck_tracks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return tracks the user has listened to that have no real sentiment score (valence=0 or None)."""
    listened_ids = (
        db.query(Listen.track_id)
        .filter(Listen.user_id == current_user.user_id)
        .distinct()
        .subquery()
    )
    rows = (
        db.query(Track)
        .join(listened_ids, Track.track_id == listened_ids.c.track_id)
        .filter((Track.valence.is_(None)) | (Track.valence == 0.0))
        .all()
    )
    return {
        "count": len(rows),
        "tracks": [
            {
                "track_id": r.track_id,
                "name": r.name,
                "artist": r.artists[0] if isinstance(r.artists, list) and r.artists else str(r.artists),
                "valence": r.valence,
            }
            for r in rows
        ],

    }


@router.get("/top")
async def get_top_tracks(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Most-played tracks for the current user, by listen count."""
    from sqlalchemy import func, desc
    play_counts = (
        db.query(Listen.track_id, func.count(Listen.listen_id).label("plays"))
        .filter(Listen.user_id == current_user.user_id)
        .group_by(Listen.track_id)
        .order_by(desc("plays"))
        .limit(limit)
        .subquery()
    )
    rows = (
        db.query(Track.track_id, Track.name, Track.artists, play_counts.c.plays)
        .join(play_counts, Track.track_id == play_counts.c.track_id)
        .order_by(desc(play_counts.c.plays))
        .all()
    )
    return {
        "tracks": [
            {
                "track_id": r.track_id,
                "name": r.name,
                "artist": r.artists,
                "plays": r.plays,
            }
            for r in rows
        ]
    }


@router.post("/sync")
async def sync_listening_history(
    spotify_access_token: str,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Sync user's listening history from Spotify.
    
    Args:
        background_tasks: FastAPI background tasks
        spotify_access_token: User's Spotify access token
        limit: Number of tracks to fetch
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Sync status and track count
    """
    try:
        spotify_service = get_spotify_service()
        
        # Get last sync time to avoid duplicates
        last_sync = current_user.last_sync
        
        # Fetch recently played tracks
        recent_tracks = spotify_service.get_recently_played(
            spotify_access_token,
            limit=limit,
            after=None
        )
        if not recent_tracks:
            return {"message": "No new tracks to sync", "count": 0}
        
        if recent_tracks is None:
            logger.error("Spotify get_recently_played returned None for token: %s", spotify_access_token[:8])
            return {"message": "No new tracks to sync", "count": 0}


        if not recent_tracks:
            return {"message": "No new tracks to sync", "count": 0}
        
        # Extract unique track IDs
        track_ids = list(set(track["spotify_id"] for track in recent_tracks))
        
        # Fetch audio features for all tracks
        audio_features = spotify_service.get_track_audio_features(spotify_access_token, track_ids)            
        if audio_features is None:
            logger.error("Spotify audio features API returned None — token may be invalid/expired or request failed.")
            audio_features = {}

        synced_count = 0
        
        for track_data in recent_tracks:
            if not track_data or not track_data.get("spotify_id"):
                continue
            spotify_id = normalize_id(track_data.get("spotify_id"))
            if not spotify_id:
                continue
            

            # Check if track exists
            track = db.query(Track).filter(Track.spotify_id == spotify_id).first()

            features = audio_features.get(spotify_id, {})
            safe_features = {k: features.get(k) for k in ALLOWED_FEATURE_KEYS if features.get(k) is not None}

            if not safe_features:
                logger.warning(
                    "No audio features for spotify_id=%s (token expired, restricted track, or region-locked?)",
                    spotify_id
                )
            
            if not track:
                # Fetch Last.fm tags for new track
                from app.services.lastfm import get_lastfm_service
                artist_name = track_data.get("artists", [""])[0] if track_data.get("artists") else ""
                tags = get_lastfm_service().get_track_tags(track_data.get("name", ""), artist_name)

                track = Track(
                    track_id=f"track_{spotify_id}",
                    spotify_id=spotify_id,
                    name=track_data.get("name"),
                    artists=track_data.get("artists"),
                    album=track_data.get("album"),
                    duration_ms=track_data.get("duration_ms"),
                    popularity=track_data.get("popularity"),
                    tags=tags or None,
                    **safe_features
                )
                db.add(track)
                db.commit()

            # Create listen record
            listen = Listen(
                user_id=current_user.user_id,
                track_id=track.track_id,
                played_at=track_data.get("played_at"),
                ms_played=track_data.get("duration_ms"),
                context_type=track_data.get("context_type"),
                context_uri=track_data.get("context_uri")
            )
            db.add(listen)
            synced_count += 1
        
        # Update last sync time
        current_user.last_sync = datetime.utcnow()
        
        db.commit()
        
        # Find tracks that still need lyrics (no Lyric record + no valence)
        # These will be fetched by the browser using the user's residential IP
        tracks_needing_lyrics = []
        for spotify_id in track_ids:
            t = db.query(Track).filter(Track.spotify_id == spotify_id).first()
            if not t:
                continue
            has_lyrics = db.query(Lyric).filter(Lyric.track_id == t.track_id).first()
            # Retry if: no lyrics AND (valence never set OR valence=0.0 neutral placeholder from a failed fetch)
            if not has_lyrics and (t.valence is None or t.valence == 0.0):
                artist = t.artists[0] if isinstance(t.artists, list) and t.artists else str(t.artists)
                tracks_needing_lyrics.append({
                    "track_id": t.track_id,
                    "name": t.name,
                    "artist": artist,
                })

        logger.info(f"Synced {synced_count} tracks for user {current_user.user_id} — {len(tracks_needing_lyrics)} need lyrics")

        return {
            "message": "Successfully synced listening history",
            "count": synced_count,
            "last_sync": current_user.last_sync,
            "tracks_needing_lyrics": tracks_needing_lyrics,
        }
       
    except Exception as e:
        tb = traceback.format_exc()
        logger.error(f"Error syncing listening history: %s\n%s", e, tb)
        db.rollback()
        raise HTTPException(status_code=500, detail="Error syncing listening history")


def fetch_lyrics_for_tracks(db: Session, spotify_ids: List[str]):
    """
    Background task: fetch lyrics then run sentiment analysis for any track
    that still has valence=None. Writes valence/energy back to Track so the
    timeline and forecast work even when Spotify audio features are blocked.
    """
    try:
        lyrics_service = get_lyrics_service()
        sentiment_analyzer = get_sentiment_analyzer()
        analyzed = 0

        for spotify_id in spotify_ids:
            track = db.query(Track).filter(Track.spotify_id == spotify_id).first()
            if not track:
                continue

            # --- Lyrics step ---
            existing_lyric = db.query(Lyric).filter(Lyric.track_id == track.track_id).first()
            if not existing_lyric:
                artist_name = track.artists[0] if track.artists else "Unknown"
                lyrics_text, source, is_instrumental = lyrics_service.fetch_lyrics(
                    track.name, artist_name
                )
                if lyrics_text or is_instrumental:
                    language = lyrics_service.detect_language(lyrics_text) if lyrics_text else None
                    existing_lyric = Lyric(
                        track_id=track.track_id,
                        source=source,
                        language=language,
                        text=lyrics_text or "",
                        is_instrumental=is_instrumental,
                    )
                    db.add(existing_lyric)
                    db.commit()

            # --- Sentiment step (only for tracks still missing valence) ---
            if track.valence is not None:
                continue

            if existing_lyric and existing_lyric.is_instrumental:
                track.valence = 0.5
                track.energy = 0.5
                db.commit()
                continue

            lyrics_text = existing_lyric.text if existing_lyric else None
            if not lyrics_text:
                # No lyrics found from any source — assign neutral score so
                # this track stops blocking the pending count
                track.valence = 0.0
                track.energy = 0.0
                db.commit()
                continue

            result = sentiment_analyzer.analyze_comprehensive(lyrics_text)

            track.valence = result["valence"]
            track.energy = result["arousal"]

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
            db.commit()
            analyzed += 1

        logger.info(f"Lyrics+sentiment done: {analyzed}/{len(spotify_ids)} tracks got valence")
    except Exception as e:
        logger.error(f"Error in lyrics/sentiment background task: {e}")
        db.rollback()


@router.get("/recent", response_model=List[ListenResponse])
async def get_recent_listens(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user's recent listening history.
    
    Args:
        limit: Number of listens to return
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        List of recent listens
    """
    listens = db.query(Listen).filter(
        Listen.user_id == current_user.user_id
    ).order_by(
        Listen.played_at.desc()
    ).limit(limit).all()
    
    return listens


@router.get("/{track_id}", response_model=TrackResponse)
async def get_track(
    track_id: str,
    db: Session = Depends(get_db)
):
    """
    Get track information.
    
    Args:
        track_id: Track ID
        db: Database session
        
    Returns:
        Track information
    """
    track = db.query(Track).filter(Track.track_id == track_id).first()
    
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    return track


@router.get("/{track_id}/lyrics")
async def get_track_lyrics(
    track_id: str,
    db: Session = Depends(get_db)
):
    """
    Get lyrics for a track.
    
    Args:
        track_id: Track ID
        db: Database session
        
    Returns:
        Lyrics information
    """
    lyrics = db.query(Lyric).filter(Lyric.track_id == track_id).first()

    if not lyrics:
        raise HTTPException(status_code=404, detail="Lyrics not found")

    return {
        "track_id": lyrics.track_id,
        "text": lyrics.text,
        "language": lyrics.language,
        "source": lyrics.source,
        "is_instrumental": lyrics.is_instrumental
    }


@router.post("/lyrics")
async def submit_lyrics(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Accept lyrics fetched by the browser (using the user's residential IP)
    and run sentiment analysis server-side.
    """
    track_id   = payload.get("track_id")
    lyrics_text = payload.get("lyrics_text", "").strip()

    if not track_id:
        raise HTTPException(status_code=422, detail="track_id required")

    track = db.query(Track).filter(Track.track_id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    # Skip only if genuinely scored — valence=0.0 is the "no lyrics found" placeholder,
    # not a real score, so allow a retry if the browser now has lyrics.
    if track.valence is not None and track.valence != 0.0:
        return {"status": "already_scored"}

    # Save lyrics
    existing = db.query(Lyric).filter(Lyric.track_id == track_id).first()
    if not existing:
        if not lyrics_text:
            # Browser also found nothing — stamp a dummy Lyric so this track
            # stops re-appearing in tracks_needing_lyrics on every sync.
            db.add(Lyric(
                track_id=track_id,
                source="none",
                text="",
                is_instrumental=False,
                confidence=0.0,
            ))
            track.valence = 0.0
            track.energy  = 0.0
            db.commit()
            return {"status": "no_lyrics", "valence": 0.0}

        db.add(Lyric(
            track_id=track_id,
            source="browser_lyricsovh",
            text=lyrics_text,
            is_instrumental=False,
        ))
        db.commit()

    text = lyrics_text or (existing.text if existing else "")
    if not text:
        track.valence = 0.0
        track.energy  = 0.0
        db.commit()
        return {"status": "no_lyrics", "valence": 0.0}

    # Run sentiment
    from app.services.sentiment import get_sentiment_analyzer
    analyzer = get_sentiment_analyzer()
    result   = analyzer.analyze_comprehensive(text)

    track.valence = result["valence"]
    track.energy  = result["arousal"]

    existing_score = db.query(Score).filter(Score.track_id == track_id).first()
    if not existing_score:
        db.add(Score(
            track_id=track_id,
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
    db.commit()
    logger.info(f"Browser lyrics scored: {track.name} → valence={result['valence']:.3f}")
    return {"status": "scored", "valence": result["valence"]}
