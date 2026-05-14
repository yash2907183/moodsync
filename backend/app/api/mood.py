import logging
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.models import get_db
from app.models.database import User, Track, Score, Listen, MoodCheckin
from app.models.schemas import MoodCheckinCreate, MoodCheckinResponse
from app.api.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

IST = timezone(timedelta(hours=5, minutes=30))

def ist_day_window():
    """Return (today_start_utc, today_end_utc) aligned to IST midnight."""
    now_ist   = datetime.now(IST)
    start_ist = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
    end_ist   = start_ist + timedelta(days=1)
    return (
        start_ist.astimezone(timezone.utc).replace(tzinfo=None),
        end_ist.astimezone(timezone.utc).replace(tzinfo=None),
    )

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
    """
    Submit a mood check-in. Multiple check-ins per day are allowed —
    the daily average is used in all correlation and calibration calculations.
    """
    today_start, _ = ist_day_window()

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
    """Return today's check-ins — last value (for UI highlight) and daily average."""
    today_start, today_end = ist_day_window()

    checkins = (
        db.query(MoodCheckin)
        .filter(
            MoodCheckin.user_id == current_user.user_id,
            MoodCheckin.day >= today_start,
            MoodCheckin.day < today_end,
        )
        .order_by(MoodCheckin.created_at.desc())
        .all()
    )
    if not checkins:
        return {"checkin": None, "avg_today": None, "count_today": 0, "notes": None}

    last    = checkins[0]
    avg     = round(sum(c.mood_1to5 for c in checkins) / len(checkins), 2)
    return {
        "checkin":     last.mood_1to5,
        "avg_today":   avg,
        "count_today": len(checkins),
        "notes":       last.notes,
    }


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
    ist_ts = func.timezone('Asia/Kolkata', Listen.played_at)
    ai_rows = (
        db.query(
            func.date(ist_ts).label("date"),
            func.avg(Track.valence).label("avg_valence"),
        )
        .join(Track, Listen.track_id == Track.track_id)
        .filter(
            Listen.user_id == current_user.user_id,
            Listen.played_at >= cutoff,
            Track.valence.isnot(None),
        )
        .group_by(func.date(ist_ts))
        .all()
    )
    ai_by_date = {str(r.date): round(r.avg_valence, 3) for r in ai_rows}

    # Self-reported check-ins — averaged per day (multiple check-ins allowed)
    checkin_rows = (
        db.query(
            func.date(MoodCheckin.day).label("date"),
            func.avg(MoodCheckin.mood_1to5).label("avg_mood"),
            func.count(MoodCheckin.checkin_id).label("count"),
        )
        .filter(
            MoodCheckin.user_id == current_user.user_id,
            MoodCheckin.day >= cutoff,
        )
        .group_by(func.date(MoodCheckin.day))
        .order_by(func.date(MoodCheckin.day))
        .all()
    )

    # Build merged timeline — only dates where both values exist
    points = []
    for c in checkin_rows:
        date_str = str(c.date)
        if date_str in ai_by_date:
            avg_mood = float(c.avg_mood)
            user_normalised = (avg_mood - 1) / 4
            points.append({
                "date":            date_str,
                "user_mood":       round(avg_mood, 2),
                "checkin_count":   c.count,
                "user_normalised": round(user_normalised, 3),
                "ai_valence":      ai_by_date[date_str],
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
        "checkin_count": len(checkin_rows),
        "days": days,
    }