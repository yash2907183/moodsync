import os
import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
import anthropic

from app.models import get_db
from app.models.database import User, Track, Listen, Score
from app.api.auth import get_current_user

import numpy as np

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/mood")
async def get_mood_summary(
    days: int = 7,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a natural-language mood summary using Claude."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="AI summary not configured. Add ANTHROPIC_API_KEY to backend/.env")

    cutoff = datetime.utcnow() - timedelta(days=days)

    # Daily valence / energy averages
    daily_stats = (
        db.query(
            func.date(Listen.played_at).label("date"),
            func.avg(Track.valence).label("avg_valence"),
            func.avg(Track.energy).label("avg_energy"),
            func.count(Listen.listen_id).label("track_count"),
        )
        .join(Track, Listen.track_id == Track.track_id)
        .filter(
            Listen.user_id == current_user.user_id,
            Listen.played_at >= cutoff,
            Track.valence.isnot(None),
        )
        .group_by(func.date(Listen.played_at))
        .order_by(func.date(Listen.played_at))
        .all()
    )

    if not daily_stats:
        return {
            "summary": "Not enough listening data in this period to generate a mood summary. Try a longer time window or sync more tracks.",
            "generated_at": datetime.utcnow().isoformat(),
            "days": days,
            "tracks_analyzed": 0,
        }

    # Emotion averages for tracks listened to in this window
    recent_track_ids = (
        db.query(Listen.track_id)
        .filter(Listen.user_id == current_user.user_id, Listen.played_at >= cutoff)
        .subquery()
    )
    emotion_row = (
        db.query(
            func.avg(Score.joy).label("joy"),
            func.avg(Score.sadness).label("sadness"),
            func.avg(Score.anger).label("anger"),
            func.avg(Score.fear).label("fear"),
            func.avg(Score.optimism).label("optimism"),
            func.count(Score.score_id).label("count"),
        )
        .join(recent_track_ids, Score.track_id == recent_track_ids.c.track_id)
        .first()
    )

    # All unique tracks listened to this period (with play counts)
    # Use top 20 so Claude sees real variety, not just the repeat-heavy songs
    play_counts = (
        db.query(Listen.track_id, func.count(Listen.listen_id).label("plays"))
        .filter(Listen.user_id == current_user.user_id, Listen.played_at >= cutoff)
        .group_by(Listen.track_id)
        .order_by(desc("plays"))
        .limit(20)
        .subquery()
    )
    top_tracks = (
        db.query(Track.name, Track.artists, play_counts.c.plays)
        .join(play_counts, Track.track_id == play_counts.c.track_id)
        .order_by(desc(play_counts.c.plays))
        .all()
    )

    # Build context strings for the prompt
    timeline_lines = "\n".join(
        f"  {d.date}: valence={d.avg_valence:.2f}, energy={d.avg_energy:.2f} ({d.track_count} tracks)"
        for d in daily_stats
    )

    emotions_line = "No emotion data available."
    analyzed_count = 0
    if emotion_row and emotion_row.count:
        analyzed_count = emotion_row.count
        emotions_line = (
            f"joy={emotion_row.joy:.3f}, sadness={emotion_row.sadness:.3f}, "
            f"anger={emotion_row.anger:.3f}, fear={emotion_row.fear:.3f}, "
            f"optimism={emotion_row.optimism:.3f}"
        )

    tracks_line = "No track data available."
    if top_tracks:
        tracks_line = ", ".join(
            f"'{t.name}' by {t.artists[0] if isinstance(t.artists, list) else t.artists} ({t.plays}x)"
            for t in top_tracks
        )

    prompt = f"""You are a personal music mood analyst. Based on this listener's data from the past {days} day(s), write a warm, insightful 2–3 sentence mood summary in second person ("you"). Focus on the overall emotional vibe and patterns — mention a mix of artists or songs from across the list, not just the most-played ones. Sound like a thoughtful friend, not a report. Do not mention play counts or numbers.

Daily mood (valence = happiness 0→1, energy = intensity 0→1):
{timeline_lines}

Average emotion scores across analysed tracks (scale 0→1):
{emotions_line}

Tracks listened to this period (most to least played):
{tracks_line}

Write only the summary paragraph — no headers, no bullet points, no preamble."""

    try:
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-opus-4-7",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        summary_text = message.content[0].text.strip()
    except anthropic.AuthenticationError:
        raise HTTPException(status_code=503, detail="Invalid ANTHROPIC_API_KEY. Check your backend/.env")
    except Exception as e:
        logger.error(f"Claude API error: {e}")
        raise HTTPException(status_code=502, detail="Could not generate summary right now. Try again.")

    return {
        "summary": summary_text,
        "generated_at": datetime.utcnow().isoformat(),
        "days": days,
        "tracks_analyzed": analyzed_count,
    }


@router.get("/forecast")
async def get_forecast_narrative(
    horizon: int = 7,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a 2-sentence Claude narrative interpreting the mood forecast."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="AI summary not configured.")

    from statsmodels.tsa.holtwinters import SimpleExpSmoothing, Holt
    import pandas as pd

    daily = (
        db.query(
            func.date(Listen.played_at).label("date"),
            func.avg(Track.valence).label("avg_valence"),
        )
        .join(Track, Listen.track_id == Track.track_id)
        .filter(
            Listen.user_id == current_user.user_id,
            Track.valence.isnot(None),
        )
        .group_by(func.date(Listen.played_at))
        .order_by(func.date(Listen.played_at))
        .all()
    )

    if len(daily) < 3:
        return {"narrative": None, "reason": "sparse"}

    dates = [str(d.date) for d in daily]
    values = [float(d.avg_valence) for d in daily]
    idx = pd.date_range(start=dates[0], end=dates[-1], freq="D")
    series = pd.Series(values, index=pd.to_datetime(dates)).reindex(idx).interpolate("linear")

    hist_mean = float(np.mean(values))
    hist_min  = float(np.min(values))
    hist_max  = float(np.max(values))
    obs_range = max(hist_max - hist_min, 0.01)
    clip_lo   = max(0.0, hist_min - 0.2 * obs_range)
    clip_hi   = min(1.0, hist_max + 0.2 * obs_range)

    try:
        if len(series) >= 7:
            model = Holt(series.values, initialization_method="estimated").fit(optimized=True)
        else:
            model = SimpleExpSmoothing(series.values, initialization_method="estimated").fit(optimized=True)
        raw_forecast = model.forecast(horizon)
    except Exception:
        raw_forecast = [hist_mean] * horizon

    forecast_vals = [round(float(np.clip(v, clip_lo, clip_hi)), 3) for v in raw_forecast]

    last_date = pd.to_datetime(dates[-1])
    forecast_dates = [
        (last_date + timedelta(days=i + 1)).strftime("%b %d") for i in range(horizon)
    ]

    trend_diff = forecast_vals[-1] - forecast_vals[0]
    trend_word = "rising" if trend_diff > 0.02 else "falling" if trend_diff < -0.02 else "steady"

    # Find the peak/dip day for Claude to reference
    peak_idx = int(np.argmax(forecast_vals))
    dip_idx  = int(np.argmin(forecast_vals))
    notable_day = forecast_dates[peak_idx] if trend_word == "rising" else forecast_dates[dip_idx]

    forecast_lines = "\n".join(
        f"  {forecast_dates[i]}: {forecast_vals[i]:.3f}" for i in range(horizon)
    )

    prompt = f"""You are a warm, insightful music mood analyst. A listener's 7-day mood forecast (based on their music, valence 0=sad → 1=happy) looks like this:

Historical average: {hist_mean:.3f}
Overall trend: {trend_word}
Notable day: {notable_day}

Day-by-day forecast:
{forecast_lines}

Write exactly 2 sentences in second person ("your"):
1. Describe the trajectory naturally — when it shifts and roughly where it lands. Mention the notable day if relevant.
2. Offer one warm, human insight or reframe that makes the reader feel understood.

Rules: no numbers or valence scores, no headers, no bullet points, no preamble."""

    try:
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-opus-4-7",
            max_tokens=120,
            messages=[{"role": "user", "content": prompt}],
        )
        narrative = message.content[0].text.strip()
    except anthropic.AuthenticationError:
        raise HTTPException(status_code=503, detail="Invalid ANTHROPIC_API_KEY.")
    except Exception as e:
        logger.error(f"Claude forecast narrative error: {e}")
        raise HTTPException(status_code=502, detail="Could not generate forecast narrative.")

    return {
        "narrative": narrative,
        "generated_at": datetime.utcnow().isoformat(),
    }
