import logging
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.models import get_db
from app.models.database import User, Track, Score, Listen, MoodCheckin
from app.models.schemas import MoodCheckinCreate, MoodCheckinResponse
from app.api.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/filter")
async def get_tracks_by_mood(
    emotion: str = Query(..., description="Target emotion: joy, sadness, anger, fear, optimism"),
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the user's tracks that match a specific emotion.
    Example: ?emotion=sadness&min_score=0.7
    """
    valid_emotions = ["joy", "sadness", "anger", "fear", "optimism"]
    emotion = emotion.lower()
    if emotion not in valid_emotions:
        return {"error": f"Invalid emotion. Choose from: {valid_emotions}"}

    target = getattr(Score, emotion)
    others = [getattr(Score, e) for e in valid_emotions if e != emotion]

    # Only include tracks where the requested emotion is strictly the highest score
    results = (
        db.query(Track, Score)
        .join(Score, Track.track_id == Score.track_id)
        .filter(*[target >= other for other in others])
        .order_by(desc(target))
        .limit(limit)
        .all()
    )

    response = []
    for track, score in results:
        response.append({
            "track_id": track.track_id,
            "name": track.name,
            "artist": track.artists,
            "match_score": getattr(score, emotion),
            "valence": track.valence
        })

    return {
        "filter": emotion,
        "count": len(response),
        "tracks": response
    }


@router.post("/checkin", response_model=MoodCheckinResponse)
async def submit_checkin(
    payload: MoodCheckinCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit or update today's mood check-in (1 = very sad, 5 = very happy)."""
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    existing = (
        db.query(MoodCheckin)
        .filter(
            MoodCheckin.user_id == current_user.user_id,
            MoodCheckin.day >= today_start,
            MoodCheckin.day < today_end,
        )
        .first()
    )

    if existing:
        existing.mood_1to5 = payload.mood_1to5
        existing.notes = payload.notes
        db.commit()
        db.refresh(existing)
        return existing

    checkin = MoodCheckin(
        user_id=current_user.user_id,
        day=today_start,
        mood_1to5=payload.mood_1to5,
        notes=payload.notes,
    )
    db.add(checkin)
    db.commit()
    db.refresh(checkin)
    return checkin


@router.get("/checkin/today")
async def get_today_checkin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return today's check-in if it exists, else null."""
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    checkin = (
        db.query(MoodCheckin)
        .filter(
            MoodCheckin.user_id == current_user.user_id,
            MoodCheckin.day >= today_start,
            MoodCheckin.day < today_end,
        )
        .first()
    )
    return {"checkin": checkin.mood_1to5 if checkin else None, "notes": checkin.notes if checkin else None}


@router.get("/correlation")
async def get_mood_correlation(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Compare self-reported mood (1–5) against AI-detected valence from music.
    Returns daily pairs + Pearson correlation coefficient.
    """
    cutoff = datetime.utcnow() - timedelta(days=days)

    # AI valence per day from listening history
    ai_rows = (
        db.query(
            func.date(Listen.played_at).label("date"),
            func.avg(Track.valence).label("avg_valence"),
        )
        .join(Track, Listen.track_id == Track.track_id)
        .filter(
            Listen.user_id == current_user.user_id,
            Listen.played_at >= cutoff,
            Track.valence.isnot(None),
        )
        .group_by(func.date(Listen.played_at))
        .all()
    )
    ai_by_date = {str(r.date): round(r.avg_valence, 3) for r in ai_rows}

    # Self-reported check-ins
    checkins = (
        db.query(MoodCheckin)
        .filter(
            MoodCheckin.user_id == current_user.user_id,
            MoodCheckin.day >= cutoff,
        )
        .order_by(MoodCheckin.day)
        .all()
    )

    # Build merged timeline — only dates where both values exist
    points = []
    for c in checkins:
        date_str = str(c.day.date())
        if date_str in ai_by_date:
            # Normalise 1–5 to 0–1 to match valence scale
            user_normalised = (c.mood_1to5 - 1) / 4
            points.append({
                "date": date_str,
                "user_mood": c.mood_1to5,
                "user_normalised": round(user_normalised, 3),
                "ai_valence": ai_by_date[date_str],
            })

    # Pearson correlation (requires ≥2 paired points)
    correlation = None
    if len(points) >= 2:
        xs = [p["user_normalised"] for p in points]
        ys = [p["ai_valence"] for p in points]
        n = len(xs)
        mean_x = sum(xs) / n
        mean_y = sum(ys) / n
        num = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
        den = (sum((x - mean_x) ** 2 for x in xs) * sum((y - mean_y) ** 2 for y in ys)) ** 0.5
        correlation = round(num / den, 3) if den else None

    return {
        "points": points,
        "correlation": correlation,
        "checkin_count": len(checkins),
        "days": days,
    }