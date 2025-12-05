"""
Tracks API endpoints
"""
import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.models import get_db
from app.models.database import User, Track, Listen, Lyric
from app.models.schemas import TrackResponse, ListenResponse
from app.api.auth import get_current_user
from app.services.spotify import get_spotify_service
from app.services.lyrics import get_lyrics_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/sync")
async def sync_listening_history(
    background_tasks: BackgroundTasks,
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
            after=last_sync
        )
        
        if not recent_tracks:
            return {"message": "No new tracks to sync", "count": 0}
        
        # Extract unique track IDs
        track_ids = list(set(track["spotify_id"] for track in recent_tracks))
        
        # Fetch audio features for all tracks
        audio_features = spotify_service.get_track_audio_features(
            spotify_access_token,
            track_ids
        )
        
        synced_count = 0
        
        for track_data in recent_tracks:
            spotify_id = track_data["spotify_id"]
            
            # Check if track exists
            track = db.query(Track).filter(Track.spotify_id == spotify_id).first()
            
            if not track:
                # Create new track
                features = audio_features.get(spotify_id, {})
                track = Track(
                    track_id=f"track_{spotify_id}",
                    spotify_id=spotify_id,
                    name=track_data["name"],
                    artists=track_data["artists"],
                    album=track_data.get("album"),
                    duration_ms=track_data.get("duration_ms"),
                    popularity=track_data.get("popularity"),
                    **features
                )
                db.add(track)
            
            # Create listen record
            listen = Listen(
                user_id=current_user.user_id,
                track_id=track.track_id,
                played_at=track_data["played_at"],
                ms_played=track_data.get("duration_ms"),
                context_type=track_data.get("context_type"),
                context_uri=track_data.get("context_uri")
            )
            db.add(listen)
            synced_count += 1
        
        # Update last sync time
        current_user.last_sync = datetime.utcnow()
        
        db.commit()
        
        # Schedule background task to fetch lyrics
        background_tasks.add_task(
            fetch_lyrics_for_tracks,
            db,
            track_ids
        )
        
        logger.info(f"Synced {synced_count} tracks for user {current_user.user_id}")
        
        return {
            "message": "Successfully synced listening history",
            "count": synced_count,
            "last_sync": current_user.last_sync
        }
        
    except Exception as e:
        logger.error(f"Error syncing listening history: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error syncing listening history")


def fetch_lyrics_for_tracks(db: Session, spotify_ids: List[str]):
    """
    Background task to fetch lyrics for tracks.
    
    Args:
        db: Database session
        spotify_ids: List of Spotify track IDs
    """
    try:
        lyrics_service = get_lyrics_service()
        
        for spotify_id in spotify_ids:
            # Check if lyrics already exist
            track = db.query(Track).filter(Track.spotify_id == spotify_id).first()
            
            if not track:
                continue
            
            existing_lyrics = db.query(Lyric).filter(Lyric.track_id == track.track_id).first()
            if existing_lyrics:
                continue
            
            # Fetch lyrics
            artist_name = track.artists[0] if track.artists else "Unknown"
            lyrics_text, source, is_instrumental = lyrics_service.fetch_lyrics(
                track.name,
                artist_name
            )
            
            if lyrics_text or is_instrumental:
                # Detect language
                language = None
                if lyrics_text:
                    language = lyrics_service.detect_language(lyrics_text)
                
                # Save lyrics
                lyric = Lyric(
                    track_id=track.track_id,
                    source=source,
                    language=language,
                    text=lyrics_text or "",
                    is_instrumental=is_instrumental
                )
                db.add(lyric)
        
        db.commit()
        logger.info(f"Fetched lyrics for {len(spotify_ids)} tracks")
        
    except Exception as e:
        logger.error(f"Error fetching lyrics: {e}")
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
