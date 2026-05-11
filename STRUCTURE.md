# Project Structure

```
moodsync/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app, CORS, router registration
│   │   ├── api/
│   │   │   ├── auth.py              # Spotify OAuth + JWT issue/verify
│   │   │   ├── tracks.py            # /sync, /analysis-status, background sentiment task
│   │   │   ├── insights.py          # timeline, emotions, forecast (Holt), top-tracks
│   │   │   ├── analysis.py          # per-track analysis endpoint
│   │   │   ├── mood.py              # mood check-in CRUD + correlation
│   │   │   ├── summary.py           # Claude AI mood summary + forecast narrative
│   │   │   └── playlists.py         # playlist analysis jobs + AI music generation
│   │   ├── services/
│   │   │   ├── spotify.py           # Spotipy wrapper — recent tracks, playlist tracks, user profile
│   │   │   ├── lyrics.py            # Genius fetch → lyrics.ovh fallback + text cleaning
│   │   │   └── sentiment.py         # NLP pipeline (j-hartmann + RoBERTa + VADER)
│   │   ├── models/
│   │   │   ├── database.py          # SQLAlchemy ORM models (User, Track, Listen, Lyric, Score, PlaylistJob, ...)
│   │   │   └── schemas.py           # Pydantic request/response schemas
│   │   └── utils/                   # shared helpers
│   ├── Procfile                     # Railway start command
│   └── requirements.txt
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── layout.tsx           # ThemeProvider + anti-flash dark-mode script
│       │   ├── page.tsx             # Landing page (animated, dark/light)
│       │   ├── dashboard/
│       │   │   └── page.tsx         # Main dashboard — mood hero, stat cards, all panels
│       │   ├── callback/            # OAuth callback handler (stores JWT + Spotify token)
│       │   └── share/               # Shareable mood card page
│       ├── components/
│       │   ├── charts/
│       │   │   ├── MoodTimeline.tsx     # Line chart — daily lyrical mood history
│       │   │   └── EmotionBreakdown.tsx # Bar chart — emotion distribution
│       │   ├── dashboard/
│       │   │   ├── MoodCheckin.tsx      # Mood rating widget + correlation chart
│       │   │   ├── MoodForecast.tsx     # 7-day forecast with confidence band + Claude narrative
│       │   │   ├── MoodSummary.tsx      # Claude AI mood summary card
│       │   │   ├── PlaylistAnalyzer.tsx # Playlist URL input, job progress, track list, music gen
│       │   │   └── TopTracksList.tsx    # Top tracks by play count
│       │   └── ui/
│       │       └── StatCard.tsx         # Stat summary card
│       └── lib/
│           ├── api.ts               # All fetch calls to the backend
│           ├── auth.ts              # JWT + Spotify token helpers (localStorage)
│           ├── theme.tsx            # ThemeProvider context + localStorage
│           ├── mood-theme.ts        # Emotion → gradient/colour/emoji mapping
│           └── constants.ts         # Shared constants
│
├── scripts/
│   ├── init_db.py                   # Create all database tables
│   ├── daily_sync.py                # Cron job: sync + analyse
│   ├── backfill_moods.py            # Analyse all stored tracks (run with DATABASE_URL=<neon-url>)
│   ├── view_analysis.py             # CLI: inspect scores in DB
│   └── dump_db.py                   # Export DB rows to JSON
│
├── .gitignore
├── README.md
├── SETUP.md
├── STRUCTURE.md
└── START_HERE.md
```

## Data flow

### Personal sync (after pressing Sync in the UI)

```
Spotify API
    │  50 most recently played tracks
    ▼
POST /api/tracks/sync
    │  saves new Track + Listen records
    └─► background task (fetch_lyrics_for_tracks)
            │
            ├─► Genius API  →  if blocked: lyrics.ovh  →  if missing: valence=0.0 (neutral)
            │
            └─► sentiment.py
                    ├─ j-hartmann  (joy/sadness/anger/fear/disgust/surprise/optimism)
                    ├─ RoBERTa     (positive/neutral/negative polarity)
                    └─ VADER       (compound score)
                            │
                            ▼
                      Track.valence updated
                      Score record created
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
           timeline    forecast     Claude summary
           (Recharts)  (Holt +      (Anthropic API)
                        Claude)
```

### Playlist analysis (paste a URL)

```
POST /api/playlists/analyze
    │  creates PlaylistJob, starts background task
    ▼
background: _run_playlist_job
    │  Spotify playlist API → all tracks
    │  for each track:
    │    Genius → lyrics.ovh → Score
    ▼
GET /api/playlists/jobs/{id}  (polled every 3s by frontend)
    │  returns status, progress, per-track valence
    ▼
POST /api/playlists/jobs/{id}/generate-music
    │  Claude generates music prompt from mood data
    └─► Stability Audio API → 45s MP3 → base64 → frontend audio player
```

## Database tables

| Table | Purpose |
|---|---|
| `users` | Spotify user accounts + refresh tokens |
| `tracks` | Track metadata + valence/energy scores |
| `listens` | Each play event (user × track × timestamp) |
| `lyrics` | Cached lyrics text per track |
| `scores` | Full emotion scores per track (joy, sadness, anger, fear, optimism, ...) |
| `playlist_jobs` | Background job state for playlist analysis |
| `mood_checkins` | User self-reported daily mood (1–5) |
| `daily` | Pre-aggregated daily mood stats |

## NLP models

| Model | Purpose | Output |
|---|---|---|
| `j-hartmann/emotion-english-distilroberta-base` | Emotion classification | 7 emotion probabilities (0→1) |
| `cardiffnlp/twitter-roberta-base-sentiment` | Polarity | positive / neutral / negative |
| VADER (`vaderSentiment`) | Fast rule-based sentiment | compound score −1 to +1 |

Lyrical mood score = `(positive_emotion_mass − negative_emotion_mass) / total_mass`, giving a −1 to +1 signal displayed as plain labels (Very dark → Dark & heavy → Mixed → Uplifting → Very uplifting).

> All scores reflect **lyrical content only** — not the musical sound, tempo, or key of the track.
