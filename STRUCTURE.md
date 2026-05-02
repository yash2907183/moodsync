# Project Structure

```
moodsync/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app, CORS, router registration
│   │   ├── api/
│   │   │   ├── auth.py              # Spotify OAuth + JWT issue/verify
│   │   │   ├── tracks.py            # /sync endpoint — fetch & analyse recent tracks
│   │   │   ├── insights.py          # timeline, emotions, forecast, top-tracks, correlation
│   │   │   ├── analysis.py          # /me — current user info + aggregate stats
│   │   │   ├── mood.py              # mood check-in CRUD
│   │   │   └── summary.py           # Claude AI mood summary generation
│   │   ├── services/
│   │   │   ├── spotify.py           # Spotipy wrapper — recent tracks, user profile
│   │   │   ├── lyrics.py            # Genius lyrics fetch + text cleaning
│   │   │   └── sentiment.py         # NLP pipeline (j-hartmann + RoBERTa + VADER)
│   │   ├── models/
│   │   │   ├── database.py          # SQLAlchemy ORM models
│   │   │   └── schemas.py           # Pydantic request/response schemas
│   │   └── utils/                   # shared helpers (logging, etc.)
│   └── requirements.txt
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── layout.tsx           # ThemeProvider + anti-flash dark-mode script
│       │   ├── page.tsx             # Landing page (animated, dark/light)
│       │   ├── dashboard/
│       │   │   └── page.tsx         # Main dashboard with mood hero section
│       │   ├── callback/            # OAuth callback handler
│       │   └── share/               # Shareable card page
│       ├── components/
│       │   ├── charts/
│       │   │   ├── MoodTimeline.tsx     # Line chart — daily valence history
│       │   │   └── EmotionBreakdown.tsx # Bar chart — emotion distribution
│       │   ├── dashboard/
│       │   │   ├── MoodCheckin.tsx      # Mood rating + correlation chart
│       │   │   ├── MoodForecast.tsx     # 7-day forecast with confidence band
│       │   │   ├── MoodSummary.tsx      # Claude AI summary card
│       │   │   └── TopTracksList.tsx    # Top tracks with valence scores
│       │   └── ui/
│       │       └── StatCard.tsx         # Stat summary card with hover glow
│       └── lib/
│           ├── api.ts               # All fetch calls to the backend
│           ├── auth.ts              # JWT + Spotify token helpers
│           ├── theme.tsx            # ThemeProvider context + localStorage
│           ├── mood-theme.ts        # Mood → gradient/color/emoji mapping
│           └── constants.ts         # Shared constants
│
├── scripts/
│   ├── init_db.py                   # Create all database tables
│   ├── daily_sync.py                # Cron job: sync + analyse
│   ├── backfill_moods.py            # Re-analyse all stored tracks
│   ├── view_analysis.py             # CLI: inspect scores in DB
│   └── dump_db.py                   # Export DB rows to JSON
│
├── .gitignore
├── README.md
├── SETUP.md
└── STRUCTURE.md
```

## Data flow

```
Spotify API
    │  recent 50 tracks
    ▼
tracks.py /sync
    │  for each new track
    ├─► lyrics.py → Genius API → clean text
    └─► sentiment.py
            ├─ j-hartmann transformer  (joy/sadness/anger/fear/disgust/surprise/neutral)
            ├─ RoBERTa twitter model   (positive/neutral/negative polarity)
            └─ VADER                   (compound score)
                    │
                    ▼
              scores table
                    │
              daily aggregation
                    │
              daily_moods table
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
   timeline    forecast     Claude summary
   (Recharts)  (statsmodels  (Anthropic API)
               Holt)
```

## NLP models

| Model | Purpose | Output |
|---|---|---|
| `j-hartmann/emotion-english-distilroberta-base` | Emotion classification | 7 emotion probabilities |
| `cardiffnlp/twitter-roberta-base-sentiment` | Polarity | positive / neutral / negative |
| VADER (`vaderSentiment`) | Fast rule-based sentiment | compound score −1 to +1 |

Valence is derived as `(positive_mass − negative_mass) / total_mass` across the emotion scores, giving a −1 to +1 signal robust to low absolute confidence values.
