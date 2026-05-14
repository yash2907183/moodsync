"""
Find the optimal blending coefficient (alpha) for:
    final_valence = (1 - alpha) * j_hartmann_valence + alpha * polarity

Optimises against Pearson r between daily avg blended valence
and self-reported mood check-ins (normalised to -1..+1).

Usage:
    DATABASE_URL="postgresql://..." python scripts/calibrate_blend.py
"""
import sys, os
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_path = os.path.join(os.path.dirname(current_dir), 'backend')
sys.path.append(backend_path)

import numpy as np
from sqlalchemy import create_engine, func, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv(os.path.join(backend_path, '.env'), override=False)

DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL or "localhost" in DATABASE_URL:
    print("\n❌  Set DATABASE_URL to your Neon production URL.\n")
    sys.exit(1)

engine    = create_engine(DATABASE_URL)
Session   = sessionmaker(bind=engine)
db        = Session()

IST_OFFSET = "'+05:30'"

# ── Pull daily avg (valence_score, polarity) per day per user ──────────────
rows = db.execute(text(f"""
    SELECT
        l.user_id,
        DATE(l.played_at AT TIME ZONE 'Asia/Kolkata') AS day,
        AVG(s.valence_score) AS avg_vs,
        AVG(s.polarity)      AS avg_pol
    FROM listens l
    JOIN tracks  t ON t.track_id  = l.track_id
    JOIN scores  s ON s.track_id  = l.track_id
    WHERE t.valence != 0.0
    GROUP BY l.user_id, DATE(l.played_at AT TIME ZONE 'Asia/Kolkata')
""")).fetchall()

# ── Pull daily avg mood check-ins per user ─────────────────────────────────
checkins = db.execute(text("""
    SELECT
        user_id,
        DATE(day AT TIME ZONE 'UTC') AS day,
        AVG(mood_1to5) AS avg_mood
    FROM mood_checkins
    GROUP BY user_id, DATE(day AT TIME ZONE 'UTC')
""")).fetchall()

# Build lookup: (user_id, day) → avg_mood normalised to -1..+1
mood_lookup = {}
for r in checkins:
    mood_lookup[(r.user_id, str(r.day))] = (float(r.avg_mood) - 3) / 2.0

# Match listening days to check-in days
pairs = []
for r in rows:
    key = (r.user_id, str(r.day))
    if key in mood_lookup:
        pairs.append({
            "vs":    float(r.avg_vs),
            "pol":   float(r.avg_pol),
            "mood":  mood_lookup[key],
        })

if len(pairs) < 3:
    print(f"\n⚠️  Only {len(pairs)} matched day(s). Need at least 3 to calibrate.")
    print("   Log more mood check-ins and run again.\n")
    sys.exit(0)

print(f"\n📊  {len(pairs)} days matched (listening + check-in)\n")

# ── Grid search over alpha ─────────────────────────────────────────────────
vs   = np.array([p["vs"]   for p in pairs])
pol  = np.array([p["pol"]  for p in pairs])
mood = np.array([p["mood"] for p in pairs])

alphas  = np.round(np.arange(0, 1.05, 0.05), 2)
results = []

for alpha in alphas:
    blended = (1 - alpha) * vs + alpha * pol
    if np.std(blended) < 1e-6 or np.std(mood) < 1e-6:
        r = 0.0
    else:
        r = float(np.corrcoef(blended, mood)[0, 1])
    results.append((alpha, round(r, 4)))

# Sort by abs(r) descending
results.sort(key=lambda x: abs(x[1]), reverse=True)

print("  alpha  |   r    | direction")
print("---------|--------|----------")
for alpha, r in results:
    bar = "█" * int(abs(r) * 20)
    direction = "positive ↑" if r > 0 else "negative ↓" if r < 0 else "flat"
    marker = " ← BEST" if alpha == results[0][0] else ""
    print(f"  {alpha:.2f}   |  {r:+.4f} | {bar} {direction}{marker}")

best_alpha, best_r = results[0]
print(f"\n✅  Best alpha = {best_alpha}  (r = {best_r})")
print(f"   final_valence = {1-best_alpha:.2f} × j_hartmann + {best_alpha:.2f} × polarity\n")

db.close()
