import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Text

from app.models import get_db
from app.models.database import User, Track, Listen, Score
from app.api.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/timeline")
async def get_mood_timeline(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get daily average mood (Valence & Energy) for the specific user.
    Uses the AI-generated valence/energy from the Tracks table.
    """
    # Calculate cutoff date
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    # Query: Join Listens -> Tracks. Group by Day.
    # We ignore tracks where valence is NULL.
    ist_ts = func.timezone('Asia/Kolkata', Listen.played_at)
    daily_stats = (
        db.query(
            func.date(ist_ts).label('date'),
            func.avg(Track.valence).label('avg_valence'),
            func.avg(Track.energy).label('avg_energy'),
            func.count(Listen.listen_id).label('track_count')
        )
        .join(Track, Listen.track_id == Track.track_id)
        .filter(
            Listen.user_id == current_user.user_id,
            Listen.played_at >= cutoff_date,
            Track.valence.isnot(None)
        )
        .group_by(func.date(ist_ts))
        .order_by(func.date(ist_ts))
        .all()
    )
    
    # Format for Frontend (e.g., Chart.js or Recharts)
    result = []
    for day in daily_stats:
        result.append({
            "date": str(day.date),
            "valence": round(day.avg_valence, 2), # 0.0 (Sad) to 1.0 (Happy)
            "energy": round(day.avg_energy, 2),   # 0.0 (Calm) to 1.0 (Intense)
            "count": day.track_count
        })
        
    return result


@router.get("/emotions")
async def get_emotion_distribution(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Aggregate the specific emotions (Joy, Sadness, etc.) 
    from the user's last X songs.
    """
    # All-time total scored tracks for this user (ever-growing, never drops)
    all_time_count = (
        db.query(func.count(func.distinct(Listen.track_id)))
        .join(Score, Listen.track_id == Score.track_id)
        .filter(Listen.user_id == current_user.user_id)
        .scalar()
    ) or 0

    # Emotion distribution from the last `limit` scored listens (for recency)
    recent_scored = (
        db.query(Listen.track_id)
        .join(Score, Listen.track_id == Score.track_id)
        .filter(Listen.user_id == current_user.user_id)
        .order_by(Listen.played_at.desc())
        .limit(limit)
        .subquery()
    )

    emotion_totals = (
        db.query(
            func.sum(Score.joy).label('total_joy'),
            func.sum(Score.sadness).label('total_sadness'),
            func.sum(Score.anger).label('total_anger'),
            func.sum(Score.fear).label('total_fear'),
            func.sum(Score.optimism).label('total_optimism'),
            func.count(Score.score_id).label('analyzed_count')
        )
        .join(recent_scored, Score.track_id == recent_scored.c.track_id)
        .first()
    )

    if not emotion_totals or emotion_totals.analyzed_count == 0:
        return {"message": "Not enough data yet. Listen to more songs!"}

    count = emotion_totals.analyzed_count
    distribution = {
        "joy":      round(emotion_totals.total_joy / count, 2),
        "sadness":  round(emotion_totals.total_sadness / count, 2),
        "anger":    round(emotion_totals.total_anger / count, 2),
        "fear":     round(emotion_totals.total_fear / count, 2),
        "optimism": round(emotion_totals.total_optimism / count, 2),
    }

    dominant_mood = max(distribution, key=distribution.get)

    # Determine top genre from recent scored listens
    from app.services.lastfm import canonical_genre
    genre_counts: dict = {}
    tag_rows = (
        db.query(Track.tags)
        .join(Listen, Listen.track_id == Track.track_id)
        .join(Score, Score.track_id == Track.track_id)
        .filter(Listen.user_id == current_user.user_id, Track.tags.isnot(None))
        .limit(limit)
        .all()
    )
    for (tags,) in tag_rows:
        if tags:
            g = canonical_genre(tags)
            genre_counts[g] = genre_counts.get(g, 0) + 1
    genre_counts.pop("other", None)
    top_genre = max(genre_counts, key=genre_counts.get) if genre_counts else None

    return {
        "analyzed_tracks": all_time_count,
        "dominant_mood":   dominant_mood,
        "distribution":    distribution,
        "top_genre":       top_genre,
    }


@router.get("/predict")
async def predict_mood(
    horizon: int = 7,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Forecast next `horizon` days of lyrical valence.
    Model selection (by available data points):
      < 7  days  → SimpleExpSmoothing (SES)
      7-13 days  → Holt double exponential (trend)
      ≥ 14 days  → ExponentialSmoothing ETS (trend + damping), optimised AIC
    Also returns backtesting MAE over the last min(7, n//3) held-out days.
    """
    from statsmodels.tsa.holtwinters import ExponentialSmoothing, SimpleExpSmoothing, Holt
    import pandas as pd
    import numpy as np

    ist_ts_fc = func.timezone('Asia/Kolkata', Listen.played_at)
    daily = (
        db.query(
            func.date(ist_ts_fc).label("date"),
            func.avg(Track.valence).label("avg_valence"),
        )
        .join(Track, Listen.track_id == Track.track_id)
        .filter(
            Listen.user_id == current_user.user_id,
            Track.valence.isnot(None),
        )
        .group_by(func.date(ist_ts_fc))
        .order_by(func.date(ist_ts_fc))
        .all()
    )

    if len(daily) < 3:
        raise HTTPException(
            status_code=422,
            detail="Not enough data for a forecast. You need at least 3 days of listening history.",
        )

    dates  = [str(d.date) for d in daily]
    values = [float(d.avg_valence) for d in daily]
    idx    = pd.date_range(start=dates[0], end=dates[-1], freq="D")
    series = pd.Series(values, index=pd.to_datetime(dates)).reindex(idx).interpolate("linear")

    actual_days = len(daily)
    n           = len(series)
    sparse      = actual_days < 14

    hist_mean  = float(np.mean(values))
    obs_range  = max(float(np.max(values)) - float(np.min(values)), 0.01)
    clip_lo    = max(-1.0, float(np.min(values)) - 0.2 * obs_range)
    clip_hi    = min(1.0,  float(np.max(values)) + 0.2 * obs_range)

    def _fit(arr):
        if len(arr) >= 14:
            # Full ETS with additive trend + damping, AIC-optimised
            try:
                return ExponentialSmoothing(
                    arr, trend="add", damped_trend=True,
                    initialization_method="estimated"
                ).fit(optimized=True)
            except Exception:
                pass
        if len(arr) >= 7:
            try:
                return Holt(arr, initialization_method="estimated").fit(optimized=True)
            except Exception:
                pass
        return SimpleExpSmoothing(arr, initialization_method="estimated").fit(optimized=True)

    # ── Backtesting MAE ────────────────────────────────────────────────────
    # Hold out the last k days, train on the rest, measure 1-step-ahead MAE
    k = min(7, max(1, n // 3))
    mae = None
    model_name = "SES"
    if n - k >= 3:
        try:
            train = series.values[:-k]
            test  = series.values[-k:]
            preds = []
            for i in range(k):
                m = _fit(np.append(train, series.values[n - k: n - k + i]))
                preds.append(m.forecast(1)[0])
            mae = round(float(np.mean(np.abs(np.array(preds) - test))), 4)
        except Exception:
            pass

    # ── Final model on full series ─────────────────────────────────────────
    try:
        model = _fit(series.values)
        forecast_vals = model.forecast(horizon)
        if n >= 14:
            model_name = "ETS(A,Ad,N)"
        elif n >= 7:
            model_name = "Holt"
        fitted    = model.fittedvalues
        residuals = series.values - fitted[:len(series)]
        sigma     = float(np.std(residuals)) if len(residuals) > 1 else obs_range * 0.3
    except Exception as e:
        logger.warning(f"Forecast model failed ({e}), falling back to mean")
        forecast_vals = np.array([hist_mean] * horizon)
        sigma         = obs_range * 0.3

    last_date      = pd.to_datetime(dates[-1])
    forecast_dates = [(last_date + timedelta(days=i + 1)).strftime("%Y-%m-%d") for i in range(horizon)]

    forecast = [
        {
            "date":   forecast_dates[i],
            "valence": round(float(np.clip(forecast_vals[i], clip_lo, clip_hi)), 3),
            "lower":  round(float(np.clip(forecast_vals[i] - sigma, clip_lo, clip_hi)), 3),
            "upper":  round(float(np.clip(forecast_vals[i] + sigma, clip_lo, clip_hi)), 3),
        }
        for i in range(horizon)
    ]

    history = [{"date": str(d.date), "valence": round(float(d.avg_valence), 3)} for d in daily]

    return {
        "history":     history,
        "forecast":    forecast,
        "sparse_data": sparse,
        "data_points": actual_days,
        "hist_mean":   round(hist_mean, 3),
        "model":       model_name,
        "backtest_mae": mae,
    }


@router.get("/time-of-day")
async def get_time_of_day(
    tz: str = "Asia/Kolkata",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Average lyrical mood score grouped by hour of day in the user's local timezone."""
    local_ts = func.timezone(tz, Listen.played_at)
    rows = (
        db.query(
            func.extract("hour", local_ts).label("hour"),
            func.avg(Track.valence).label("avg_valence"),
            func.count(Listen.listen_id).label("count"),
        )
        .join(Track, Listen.track_id == Track.track_id)
        .filter(
            Listen.user_id == current_user.user_id,
            Track.valence.isnot(None),
        )
        .group_by(func.extract("hour", local_ts))
        .order_by(func.extract("hour", local_ts))
        .all()
    )
    return [
        {"hour": int(r.hour), "avg_valence": round(float(r.avg_valence), 3), "count": r.count}
        for r in rows
    ]


@router.get("/day-of-week")
async def get_day_of_week(
    tz: str = "Asia/Kolkata",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Average lyrical mood score grouped by day of week in the user's local timezone."""
    local_ts = func.timezone(tz, Listen.played_at)
    rows = (
        db.query(
            func.extract("dow", local_ts).label("dow"),
            func.avg(Track.valence).label("avg_valence"),
            func.count(Listen.listen_id).label("count"),
        )
        .join(Track, Listen.track_id == Track.track_id)
        .filter(
            Listen.user_id == current_user.user_id,
            Track.valence.isnot(None),
        )
        .group_by(func.extract("dow", local_ts))
        .order_by(func.extract("dow", local_ts))
        .all()
    )
    days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    return [
        {"day": days[int(r.dow)], "dow": int(r.dow), "avg_valence": round(float(r.avg_valence), 3), "count": r.count}
        for r in rows
    ]


@router.get("/artist-mood")
async def get_artist_mood(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Average lyrical mood per artist (artists with 3+ listens)."""
    rows = (
        db.query(
            Track.artists,
            func.avg(Track.valence).label("avg_valence"),
            func.count(Listen.listen_id).label("plays"),
        )
        .join(Listen, Listen.track_id == Track.track_id)
        .filter(
            Listen.user_id == current_user.user_id,
            Track.valence.isnot(None),
        )
        .group_by(cast(Track.artists, Text))
        .having(func.count(Listen.listen_id) >= 3)
        .order_by(func.avg(Track.valence))
        .limit(20)
        .all()
    )
    result = []
    for r in rows:
        artist = r.artists[0] if isinstance(r.artists, list) and r.artists else str(r.artists)
        result.append({
            "artist": artist,
            "avg_valence": round(float(r.avg_valence), 3),
            "plays": r.plays,
        })
    return result