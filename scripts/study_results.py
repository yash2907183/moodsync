"""
Study results script — computes all paper metrics for study participants.
Primary researcher is excluded. Run after study ends (day 7).

Usage:
    cd /Users/yash/Downloads/moodsync/backend && source venv/bin/activate && cd ..
    DATABASE_URL="postgresql://..." python scripts/study_results.py
"""
import sys, os
current_dir  = os.path.dirname(os.path.abspath(__file__))
backend_path = os.path.join(os.path.dirname(current_dir), 'backend')
sys.path.append(backend_path)

import numpy as np
from scipy import stats
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv(os.path.join(backend_path, '.env'), override=False)

DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL or "localhost" in DATABASE_URL:
    print("\n❌  Set DATABASE_URL to your Neon production URL.\n")
    sys.exit(1)

# Primary researcher — excluded from all study calculations
RESEARCHER_ID = "user_fgz8ki8idzlgqwje25jlfkiub"

engine  = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
db      = Session()

print(f"\n{'='*60}")
print(f"  MOODSYNC — STUDY RESULTS")
print(f"  Researcher excluded: {RESEARCHER_ID}")
print(f"{'='*60}\n")

# ── Participants ───────────────────────────────────────────────────────────
users = db.execute(text("""
    SELECT user_id, display_name, spotify_id, created_at
    FROM users
    WHERE user_id != :rid
      AND is_active = true
    ORDER BY created_at
"""), {"rid": RESEARCHER_ID}).fetchall()

if not users:
    print("❌  No study participants found yet.\n")
    sys.exit(0)

print(f"  Participants: {len(users)}\n")

all_r_values   = []
all_strategies = {}

for user in users:
    uid  = user.user_id
    name = user.display_name or user.spotify_id

    print(f"{'─'*60}")
    print(f"  {name}")
    print(f"{'─'*60}")

    # ── Listening coverage ─────────────────────────────────────
    coverage = db.execute(text("""
        SELECT
            COUNT(DISTINCT l.track_id)                                    AS unique_tracks,
            COUNT(*)                                                       AS total_plays,
            COUNT(DISTINCT DATE(l.played_at AT TIME ZONE 'Asia/Kolkata')) AS listening_days,
            ROUND(AVG(t.valence)::numeric, 3)                             AS avg_valence
        FROM listens l
        JOIN tracks t ON t.track_id = l.track_id
        WHERE l.user_id = :uid
          AND t.valence != 0.0
    """), {"uid": uid}).fetchone()

    print(f"  Listening days : {coverage.listening_days}")
    print(f"  Unique tracks  : {coverage.unique_tracks}")
    print(f"  Total plays    : {coverage.total_plays}")
    print(f"  Avg valence    : {coverage.avg_valence}")

    # ── Mood check-ins ─────────────────────────────────────────
    checkins = db.execute(text("""
        SELECT
            COUNT(DISTINCT DATE(day)) AS checkin_days,
            COUNT(*)                  AS total_checkins,
            ROUND(AVG(mood_1to5)::numeric, 2) AS avg_mood
        FROM mood_checkins
        WHERE user_id = :uid
    """), {"uid": uid}).fetchone()

    print(f"  Check-in days  : {checkins.checkin_days}  ({checkins.total_checkins} total logs)")
    print(f"  Avg mood (1-5) : {checkins.avg_mood}")

    # ── Personalised calibration ───────────────────────────────
    paired = db.execute(text("""
        SELECT
            DATE(mc.day AT TIME ZONE 'Asia/Kolkata')          AS day,
            AVG((mc.mood_1to5 - 3.0) / 2.0)                  AS user_mood,
            AVG(t.valence)                                     AS avg_valence
        FROM mood_checkins mc
        JOIN listens l ON l.user_id = mc.user_id
            AND DATE(l.played_at AT TIME ZONE 'Asia/Kolkata') = DATE(mc.day AT TIME ZONE 'Asia/Kolkata')
        JOIN tracks t ON t.track_id = l.track_id
        WHERE mc.user_id = :uid
          AND t.valence != 0.0
        GROUP BY DATE(mc.day AT TIME ZONE 'Asia/Kolkata')
        HAVING COUNT(DISTINCT l.track_id) >= 3
    """), {"uid": uid}).fetchall()

    print(f"\n  Calibration ({len(paired)} matched days):")
    if len(paired) >= 3:
        x = np.array([float(p.avg_valence) for p in paired])
        y = np.array([float(p.user_mood)   for p in paired])
        r, p_val = stats.pearsonr(x, y)
        slope, intercept, _, _, _ = stats.linregress(x, y)
        strength = "strong" if abs(r) > 0.5 else "moderate" if abs(r) > 0.3 else "weak"
        sig      = "✅ significant" if p_val < 0.05 else "⚠️  not significant"
        print(f"    r = {r:.3f}   p = {p_val:.3f}   ({strength}, {sig})")
        print(f"    formula: score = {slope:.3f}×model + {intercept:.3f}")
        all_r_values.append({"name": name, "r": r, "p": p_val, "n": len(paired)})
    else:
        print(f"    ⚠️  Need ≥3 matched days (have {len(paired)})")

    # ── Emotion breakdown ──────────────────────────────────────
    emotions = db.execute(text("""
        SELECT
            ROUND(AVG(s.joy)::numeric, 3)      AS joy,
            ROUND(AVG(s.sadness)::numeric, 3)  AS sadness,
            ROUND(AVG(s.anger)::numeric, 3)    AS anger,
            ROUND(AVG(s.fear)::numeric, 3)     AS fear,
            ROUND(AVG(s.optimism)::numeric, 3) AS optimism
        FROM listens l
        JOIN scores s ON s.track_id = l.track_id
        JOIN tracks t ON t.track_id = l.track_id
        WHERE l.user_id = :uid
          AND t.valence != 0.0
    """), {"uid": uid}).fetchone()

    if emotions.joy is not None:
        emo_dict = {
            "joy":      float(emotions.joy),
            "sadness":  float(emotions.sadness),
            "anger":    float(emotions.anger),
            "fear":     float(emotions.fear),
            "optimism": float(emotions.optimism),
        }
        dominant = max(emo_dict, key=emo_dict.get)
        print(f"\n  Emotion breakdown:")
        for k, v in sorted(emo_dict.items(), key=lambda x: x[1], reverse=True):
            bar = "█" * int(v * 30)
            print(f"    {k:<10} {v:.3f}  {bar}")
        print(f"    Dominant: {dominant}")

    # ── Emotion regulation strategies ──────────────────────────
    reg_rows = db.execute(text("""
        SELECT
            DATE_TRUNC('hour', played_at AT TIME ZONE 'Asia/Kolkata') AS hour,
            ARRAY_AGG(t.valence ORDER BY played_at)                    AS valences,
            COUNT(*)                                                    AS track_count
        FROM listens l
        JOIN tracks t ON t.track_id = l.track_id
        WHERE l.user_id = :uid
          AND t.valence != 0.0
        GROUP BY DATE_TRUNC('hour', played_at AT TIME ZONE 'Asia/Kolkata')
        HAVING COUNT(*) >= 3
    """), {"uid": uid}).fetchall()

    if reg_rows:
        strategy_counts = {}
        for row in reg_rows:
            vals = [float(v) for v in row.valences if v is not None]
            if len(vals) < 2:
                continue
            arr     = np.array(vals)
            mean_v  = float(np.mean(arr))
            std_v   = float(np.std(arr))
            start_v = float(np.mean(arr[:max(1, len(arr)//3)]))
            end_v   = float(np.mean(arr[-(max(1, len(arr)//3)):]))
            slope_v = (end_v - start_v) / max(len(arr) - 1, 1)

            if std_v < 0.08:
                if mean_v < -0.15:   s = "Rumination"
                elif mean_v > 0.15:  s = "Mood Maintenance (positive)"
                else:                s = "Mood Maintenance (neutral)"
            elif slope_v > 0.05 and start_v < -0.1: s = "Mood Repair"
            elif slope_v > 0.05:    s = "Upregulation"
            elif slope_v < -0.05:   s = "Downregulation"
            else:                   s = "Diversion"

            strategy_counts[s] = strategy_counts.get(s, 0) + 1
            all_strategies[s]  = all_strategies.get(s, 0) + 1

        total_sessions = sum(strategy_counts.values())
        dominant_strat = max(strategy_counts, key=strategy_counts.get)
        print(f"\n  Emotion regulation ({total_sessions} sessions):")
        for s, c in sorted(strategy_counts.items(), key=lambda x: x[1], reverse=True):
            pct = round(c / total_sessions * 100, 1)
            bar = "█" * int(pct / 3)
            print(f"    {s:<35} {pct:>5}%  {bar}")
        print(f"    Dominant: {dominant_strat}")

    # ── Genre breakdown ────────────────────────────────────────
    from app.services.lastfm import canonical_genre
    genre_rows = db.execute(text("""
        SELECT t.tags, COUNT(*) AS plays, AVG(t.valence) AS avg_valence
        FROM listens l
        JOIN tracks t ON t.track_id = l.track_id
        WHERE l.user_id = :uid
          AND t.tags IS NOT NULL
          AND t.valence != 0.0
        GROUP BY t.tags
    """), {"uid": uid}).fetchall()

    genre_agg = {}
    for row in genre_rows:
        g = canonical_genre(row.tags or [])
        if g not in genre_agg:
            genre_agg[g] = {"plays": 0, "valences": []}
        genre_agg[g]["plays"]    += row.plays
        genre_agg[g]["valences"].append(float(row.avg_valence))

    if genre_agg:
        print(f"\n  Genre breakdown (top 5):")
        for genre, d in sorted(genre_agg.items(), key=lambda x: x[1]["plays"], reverse=True)[:5]:
            avg_v = round(np.mean(d["valences"]), 3)
            bar   = "█" * int(abs(avg_v) * 15)
            sign  = "+" if avg_v >= 0 else ""
            print(f"    {genre:<20} {d['plays']:>4} plays   valence={sign}{avg_v:.3f}  {bar}")

    print()

# ── Cross-user summary ─────────────────────────────────────────────────────
print(f"{'='*60}")
print(f"  CROSS-USER SUMMARY")
print(f"{'='*60}")
print(f"  Total participants : {len(users)}")

if all_r_values:
    rs = [x["r"] for x in all_r_values]
    print(f"  Calibration data   : {len(rs)}/{len(users)} users")
    print(f"  Mean Pearson r     : {np.mean(rs):.3f}")
    print(f"  Std Pearson r      : {np.std(rs):.3f}")
    print(f"  Range              : [{min(rs):.3f}, {max(rs):.3f}]")
    print(f"\n  Per-user r values:")
    for u in all_r_values:
        sig = "✅" if u["p"] < 0.05 else "⚠️ "
        print(f"    {u['name']:<20} r={u['r']:+.3f}  p={u['p']:.3f}  n={u['n']}  {sig}")
else:
    print(f"  ⚠️  No users have enough check-in data yet.")

if all_strategies:
    total = sum(all_strategies.values())
    print(f"\n  Regulation strategies (all users combined, {total} sessions):")
    for s, c in sorted(all_strategies.items(), key=lambda x: x[1], reverse=True):
        pct = round(c / total * 100, 1)
        print(f"    {s:<35} {pct:>5}%")

print()
db.close()
