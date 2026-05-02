import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import get_db
from app.models.database import User, Track, Lyric, Score
from app.api.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/{track_id}")
async def analyze_track_details(
    track_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed AI analysis for a specific track.
    Includes: Lyrics snippet, Dominant Emotion, and Confidence score.
    """
    # 1. Fetch Track Metadata
    track = db.query(Track).filter(Track.track_id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    # 2. Fetch AI Scores
    score = db.query(Score).filter(Score.track_id == track_id).first()
    
    # 3. Fetch Lyrics
    lyric = db.query(Lyric).filter(Lyric.track_id == track_id).first()

    if not score:
        return {
            "track": track.name,
            "artist": track.artists,
            "status": "Not Analyzed (Run backfill script)"
        }

    # 4. Determine Dominant Emotion
    emotions = {
        "joy": score.joy,
        "sadness": score.sadness,
        "anger": score.anger,
        "fear": score.fear,
        "optimism": score.optimism
    }
    # Find the key with the highest value
    dominant_mood = max(emotions, key=emotions.get)
    confidence_pct = emotions[dominant_mood] * 100

    return {
        "track_info": {
            "name": track.name,
            "artist": track.artists,
            "album": track.album
        },
        "mood_profile": {
            "dominant_emotion": dominant_mood,
            "confidence": f"{confidence_pct:.1f}%",
            "valence": score.valence_score,  # -1 (Negative) to +1 (Positive)
            "energy": score.arousal_score,   # -1 (Calm) to +1 (Intense)
            "breakdown": emotions
        },
        "lyrics_sample": lyric.text[:150] + "..." if lyric and lyric.text else "No lyrics available"
    }