"""
Research endpoints:
  GET /api/research/calibration  — personalized sentiment vs universal correlation
  GET /api/research/regulation   — emotion regulation strategy classifier
  GET /api/research/language     — English vs non-English lyrical mood comparison
"""
import logging
from datetime import datetime, timedelta

import numpy as np
from fastapi import APIRouter, Depends, HTTPException
from scipy import stats
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.models import get_db
from app.models.database import Listen, Lyric, MoodCheckin, Score, Track, User

router = APIRouter()
logger = logging.getLogger(__name__)


# ── 1. Personalized Calibration ────────────────────────────────────────────

@router.get("/calibration")
async def get_personal_calibration(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    How well does the universal sentiment model predict YOUR mood?
    Computes Pearson correlation between daily lyrical valence and
    self-reported check-ins, then fits a personal calibration line.
    """
    checkins = (
        db.query(MoodCheckin)
        .filter(MoodCheckin.user_id == current_user.user_id)
        .order_by(MoodCheckin.day)
        .all()
    )

    if len(checkins) < 3:
        raise HTTPException(
            status_code=422,
            detail="Need at least 3 mood check-ins to compute calibration."
        )

    points = []
    for ci in checkins:
        day = ci.day.date() if hasattr(ci.day, "date") else ci.day
        daily_valence = (
            db.query(func.avg(Track.valence))
            .join(Listen, Listen.track_id == Track.track_id)
            .filter(
                Listen.user_id == current_user.user_id,
                func.date(Listen.played_at) == day,
                Track.valence.isnot(None),
            )
            .scalar()
        )
        if daily_valence is not None:
            # Normalise check-in 1–5 → -1 to +1
            user_mood_norm = (ci.mood_1to5 - 3) / 2.0
            points.append({
                "date":              str(day),
                "universal_valence": round(float(daily_valence), 3),
                "user_mood":         round(user_mood_norm, 3),
                "user_mood_raw":     ci.mood_1to5,
            })

    if len(points) < 3:
        raise HTTPException(
            status_code=422,
            detail="Not enough days with both listening data and check-ins."
        )

    x = np.array([p["universal_valence"] for p in points])
    y = np.array([p["user_mood"] for p in points])

    corr, p_value = stats.pearsonr(x, y)
    slope, intercept, _, _, _ = stats.linregress(x, y)

    # Personal valence = slope * universal + intercept
    for p in points:
        p["personal_valence"] = round(slope * p["universal_valence"] + intercept, 3)

    strength = (
        "strong"   if abs(corr) > 0.5 else
        "moderate" if abs(corr) > 0.3 else
        "weak"
    )
    direction = "positive" if corr >= 0 else "negative (inverse)"

    return {
        "points":         points,
        "n_points":       len(points),
        "correlation":    round(float(corr), 3),
        "p_value":        round(float(p_value), 3),
        "slope":          round(float(slope), 3),
        "intercept":      round(float(intercept), 3),
        "strength":       strength,
        "direction":      direction,
        "interpretation": (
            f"The AI model is a {strength} {direction} predictor of your mood "
            f"(r={corr:.2f}, p={p_value:.3f}, n={len(points)} days). "
            + ("The model aligns well with how you actually feel."
               if abs(corr) > 0.5
               else "Your emotional response to music differs from the universal model — "
               "the calibration line personalises scores for you.")
        ),
    }


# ── 2. Emotion Regulation ──────────────────────────────────────────────────

def _classify_session(vals: list) -> dict:
    if len(vals) < 2:
        return {"strategy": "Single track", "color": "#94a3b8"}
    arr        = np.array(vals)
    mean_v     = float(np.mean(arr))
    std_v      = float(np.std(arr))
    start_v    = float(np.mean(arr[:max(1, len(arr) // 3)]))
    end_v      = float(np.mean(arr[-(max(1, len(arr) // 3)):]))
    slope      = (end_v - start_v) / max(len(arr) - 1, 1)

    if std_v < 0.08:
        if mean_v < -0.15:
            return {"strategy": "Rumination",                 "color": "#dc2626"}
        elif mean_v > 0.15:
            return {"strategy": "Mood Maintenance (positive)", "color": "#10b981"}
        else:
            return {"strategy": "Mood Maintenance (neutral)",  "color": "#7c3aed"}
    elif slope > 0.05 and start_v < -0.1:
        return {"strategy": "Mood Repair",       "color": "#34d399"}
    elif slope > 0.05:
        return {"strategy": "Upregulation",      "color": "#10b981"}
    elif slope < -0.05:
        return {"strategy": "Downregulation",    "color": "#f87171"}
    else:
        return {"strategy": "Diversion",         "color": "#f59e0b"}


@router.get("/regulation")
async def get_emotion_regulation(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Classify each listening session by emotion regulation strategy based on
    the lyrical valence trajectory (Mood Repair, Rumination, Upregulation…).
    Sessions = clusters of listens with <60 min gaps.
    """
    rows = (
        db.query(Listen.played_at, Track.valence, Track.name, Track.artists)
        .join(Track, Listen.track_id == Track.track_id)
        .filter(
            Listen.user_id == current_user.user_id,
            Track.valence.isnot(None),
        )
        .order_by(Listen.played_at)
        .all()
    )

    if len(rows) < 6:
        raise HTTPException(status_code=422, detail="Need more listening history to classify sessions.")

    # Group into sessions (gap > 60 min = new session, max 25 tracks per session)
    MAX_SESSION = 25
    sessions: list[list] = []
    current: list = []
    for played_at, valence, name, artists in rows:
        if not current:
            current.append((played_at, valence, name, artists))
        else:
            gap_min = (played_at - current[-1][0]).total_seconds() / 60
            if gap_min > 60 or len(current) >= MAX_SESSION:
                if len(current) >= 3:
                    sessions.append(current)
                current = [(played_at, valence, name, artists)]
            else:
                current.append((played_at, valence, name, artists))
    if len(current) >= 3:
        sessions.append(current)

    classified = []
    for s in sessions:
        vals      = [v for _, v, _, _ in s]
        meta      = _classify_session(vals)
        artist_0  = s[0][3]
        artist_0  = artist_0[0] if isinstance(artist_0, list) and artist_0 else str(artist_0)
        classified.append({
            "date":          s[0][0].strftime("%Y-%m-%d %H:%M"),
            "tracks":        len(s),
            "strategy":      meta["strategy"],
            "color":         meta["color"],
            "mean_valence":  round(float(np.mean(vals)), 3),
            "start_valence": round(float(vals[0]), 3),
            "end_valence":   round(float(vals[-1]), 3),
            "sample_tracks": [n for _, _, n, _ in s[:3]],
        })

    # Distribution
    dist: dict = {}
    for c in classified:
        dist[c["strategy"]] = dist.get(c["strategy"], 0) + 1

    dominant = max(dist, key=dist.get) if dist else "Unknown"

    return {
        "sessions":              classified[-30:],
        "strategy_distribution": dist,
        "total_sessions":        len(classified),
        "dominant_strategy":     dominant,
        "interpretation": (
            f"Across {len(classified)} listening sessions, your most common strategy is "
            f"'{dominant}'. " + {
                "Rumination":                  "You tend to dwell in heavy lyrical themes — consecutive dark songs with no emotional shift.",
                "Mood Repair":                 "You often start a session with heavy lyrics and gradually move toward lighter ones — a sign of active mood regulation.",
                "Mood Maintenance (positive)": "You mostly listen to consistently uplifting lyrics, maintaining a positive emotional state.",
                "Mood Maintenance (neutral)":  "Your sessions are emotionally consistent and neutral — steady, balanced listening.",
                "Upregulation":                "You often build toward more intense or positive lyrics through your sessions.",
                "Downregulation":              "Your sessions often drift toward heavier lyrics over time.",
                "Diversion":                   "Your sessions show varied lyrical moods — you use music to shift between emotional states.",
            }.get(dominant, "")
        ),
    }


# ── 3. Language Comparison ─────────────────────────────────────────────────

@router.get("/language")
async def get_language_comparison(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Compare lyrical emotion profiles for English vs non-English tracks.
    Uses the language stored in the Lyric table (populated by langdetect).
    """
    rows = (
        db.query(
            Lyric.language,
            func.avg(Track.valence).label("avg_valence"),
            func.avg(Score.joy).label("avg_joy"),
            func.avg(Score.sadness).label("avg_sadness"),
            func.avg(Score.anger).label("avg_anger"),
            func.avg(Score.fear).label("avg_fear"),
            func.avg(Score.optimism).label("avg_optimism"),
            func.count(Lyric.lyric_id).label("track_count"),
        )
        .join(Track, Track.track_id == Lyric.track_id)
        .join(Score, Score.track_id == Lyric.track_id)
        .join(Listen, Listen.track_id == Lyric.track_id)
        .filter(
            Listen.user_id == current_user.user_id,
            Lyric.language.isnot(None),
            Lyric.is_instrumental == False,
        )
        .group_by(Lyric.language)
        .having(func.count(Lyric.lyric_id) >= 2)
        .all()
    )

    if not rows:
        raise HTTPException(
            status_code=422,
            detail="Not enough multilingual data yet. Sync more tracks to enable language comparison."
        )

    def _fmt(r) -> dict:
        return {
            "language":    r.language,
            "track_count": r.track_count,
            "avg_valence": round(float(r.avg_valence or 0), 3),
            "emotions": {
                "joy":      round(float(r.avg_joy or 0), 3),
                "sadness":  round(float(r.avg_sadness or 0), 3),
                "anger":    round(float(r.avg_anger or 0), 3),
                "fear":     round(float(r.avg_fear or 0), 3),
                "optimism": round(float(r.avg_optimism or 0), 3),
            },
        }

    groups = [_fmt(r) for r in rows]
    en     = next((g for g in groups if g["language"] == "en"), None)
    others = [g for g in groups if g["language"] != "en"]

    return {
        "groups":    groups,
        "english":   en,
        "non_english": others,
        "note": "Scores for English tracks use j-hartmann (7-emotion classifier). "
                "Non-English tracks use XLM-RoBERTa (polarity-based). "
                "Comparing these reveals both lyrical content differences and model capability differences.",
    }
