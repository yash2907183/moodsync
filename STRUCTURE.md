# Project Structure

```
moodsync/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app, CORS, GZip, router registration
│   │   ├── api/
│   │   │   ├── auth.py              # Spotify OAuth + JWT issue/verify
│   │   │   ├── tracks.py            # /sync, /analysis-status, top/recent, background sentiment task
│   │   │   ├── insights.py          # timeline, emotions, forecast (Holt), time-of-day, day-of-week
│   │   │   ├── analysis.py          # per-track analysis endpoint
│   │   │   ├── mood.py              # mood check-in CRUD + Pearson correlation
│   │   │   ├── summary.py           # Claude AI mood summary + forecast narrative (legacy)
│   │   │   ├── research.py          # calibration, emotion regulation, language comparison, genre mood
│   │   │   ├── playlists.py         # playlist analysis jobs
│   │   │   └── cron.py              # nightly auto-sync endpoint (called by cron-job.org)
│   │   ├── services/
│   │   │   ├── spotify.py           # Spotipy wrapper — recent tracks, playlist tracks, user profile
│   │   │   ├── lyrics.py            # Genius fetch → lyrics.ovh → ChartLyrics fallback + text cleaning
│   │   │   ├── sentiment.py         # NLP pipeline (j-hartmann + RoBERTa + VADER); tag-aware energy blending
│   │   │   └── lastfm.py            # Last.fm API — track/artist tag fetching; used for genre mood breakdown
│   │   ├── models/
│   │   │   ├── database.py          # SQLAlchemy ORM models (User, Track, Listen, Lyric, Score, MoodCheckin, ...)
│   │   │   └── schemas.py           # Pydantic request/response schemas
│   │   └── utils/                   # shared helpers
│   ├── Procfile                     # Railway start command
│   └── requirements.txt
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── layout.tsx           # Root layout: loads globals.css, forces dark class on <html>, ThemeProvider
│       │   ├── globals.css          # Google Fonts (@import Hanken Grotesk, Geist, Material Symbols),
│       │   │                        #   Tailwind directives, .glass-panel, .chart-grid, scrollbar, animations
│       │   ├── page.tsx             # Landing page (animated hero, Connect with Spotify CTA)
│       │   ├── dashboard/
│       │   │   ├── layout.tsx       # Sidebar shell: Material Symbols nav icons, Sync Spotify button,
│       │   │   │                    #   lyrics fetching logic (lyrics.ovh + ChartLyrics fallback)
│       │   │   ├── page.tsx         # Overview: bento grid, mood-gradient hero card, glass emotion-mix
│       │   │   │                    #   panel, 4 stat cards, weekly trajectory bar chart, lyrical patterns
│       │   │   ├── insights/
│       │   │   │   └── page.tsx     # Emotional Insights: SVG mood timeline + stats summary (avg/peak/trough),
│       │   │   │                    #   MoodForecast component, time-of-day centred-bar rows, day-of-week rows
│       │   │   ├── tracks/
│       │   │   │   └── page.tsx     # Music Analytics: most-played list (ranked, play-count bars),
│       │   │   │                    #   emotion breakdown (sorted descending), artist mood map with
│       │   │   │                    #   red→green gradient valence slider
│       │   │   ├── journal/
│       │   │   │   └── page.tsx     # Journal: wraps MoodCheckin component
│       │   │   ├── research/
│       │   │   │   └── page.tsx     # Research Lab: calibration scatter (Recharts), regulation strategy
│       │   │   │                    #   bars + session list, genre mood cards, language donut charts
│       │   │   └── playlist/
│       │   │       └── page.tsx     # Playlist analyser (PlaylistAnalyzer component)
│       │   ├── callback/            # OAuth callback handler (stores JWT + Spotify token)
│       │   └── share/               # Shareable mood card page
│       ├── components/
│       │   ├── charts/
│       │   │   ├── MoodTimeline.tsx     # (legacy — no longer used in main dashboard pages)
│       │   │   └── EmotionBreakdown.tsx # (legacy — no longer used in main dashboard pages)
│       │   ├── dashboard/
│       │   │   ├── MoodCheckin.tsx      # Daily mood emoji buttons, mood-vs-music correlation line chart,
│       │   │   │                        #   Cognitive Ease + Stress Lag insight cards
│       │   │   ├── MoodForecast.tsx     # 7-day forecast: ComposedChart with confidence band, TODAY marker,
│       │   │   │                        #   tooltip shows plain-English mood label (not raw valence number),
│       │   │   │                        #   model + MAE badges
│       │   │   ├── MoodSummary.tsx      # Claude AI mood summary card (used in share page)
│       │   │   ├── PlaylistAnalyzer.tsx # Playlist URL input, job progress, track list
│       │   │   └── TopTracksList.tsx    # (legacy — tracks page now has inline ranked list)
│       │   └── ui/
│       │       └── StatCard.tsx         # Reusable stat card using design tokens
│       └── lib/
│           ├── api.ts               # All fetch calls to the backend
│           ├── auth.ts              # JWT + Spotify token helpers (localStorage)
│           ├── theme.tsx            # ThemeProvider context + localStorage
│           ├── mood-theme.ts        # Emotion → gradient/colour/emoji mapping (5 moods)
│           └── constants.ts         # Shared constants
│
├── scripts/
│   ├── init_db.py                   # Create all database tables (run once on fresh DB)
│   ├── backfill_moods.py            # Analyse all stored tracks (run with DATABASE_URL=<neon-url>)
│   ├── backfill_tags.py             # One-time Last.fm tag fetch for all existing tracks
│   ├── daily_sync.py                # Cron job: sync + analyse
│   ├── view_analysis.py             # CLI: inspect scores in DB
│   └── dump_db.py                   # Export DB rows to JSON
│
├── .gitignore
├── README.md
├── SETUP.md
├── STRUCTURE.md
└── START_HERE.md
```

## Design system

The frontend uses a **Material Design 3** inspired dark-mode token system defined in `tailwind.config.js`:

| Token | Value | Usage |
|---|---|---|
| `background` / `surface` | `#12121e` | Page and card backgrounds |
| `surface-container-low` | `#1a1a26` | Sidebar, stat cards |
| `surface-container` | `#1e1e2b` | Chart cards, insight cards |
| `surface-container-high` | `#292935` | Code blocks, session rows |
| `primary` | `#d2bbff` | Violet — active nav, bar fills, accent text |
| `primary-container` | `#7c3aed` | Sync button, emotion chip backgrounds |
| `tertiary` | `#ffb784` | Orange — secondary accent, energy lines |
| `error` | `#ffb4ab` | Red/pink — anger emotion, negative valence |
| `on-surface` | `#e3e0f1` | Primary text |
| `on-surface-variant` | `#ccc3d8` | Secondary text, labels |
| `outline-variant` | `#4a4455` | Card borders |

**Fonts** loaded via `@import` in `globals.css`:
- `font-hanken` (`Hanken Grotesk`) — page headings, card titles, large numbers
- `Inter` (default body) — body text, descriptions
- `font-geist` (`Geist`) — labels, caps text, code, metric values

**Icons**: Material Symbols Outlined via `<span className="material-symbols-outlined">icon_name</span>`

**Utility classes** (defined in `globals.css`):
- `.glass-panel` — frosted glass card (rgba white background + backdrop-filter blur)
- `.chart-grid` — subtle grid lines background for chart areas

## Data flow

### Personal sync (after pressing Sync Spotify in the sidebar)

```
Spotify API
    │  50 most recently played tracks
    ▼
POST /api/tracks/sync
    │  saves new Track + Listen records
    │  fetches Last.fm tags per track (falls back to artist tags)
    └─► background task (fetch_lyrics_for_tracks)
            │
            ├─► Genius API  →  lyrics.ovh  →  ChartLyrics  →  valence=0.0 (no lyrics)
            │
            └─► sentiment.py
                    ├─ j-hartmann  (joy/sadness/anger/fear/disgust/surprise/optimism)
                    ├─ RoBERTa     (positive/neutral/negative polarity)
                    └─ VADER       (compound score)
                    └─ tag-aware energy blending (Last.fm tags adjust valence for
                       high-energy genres to separate intensity from negativity)
                            │
                            ▼
                      Track.valence updated
                      Score record created
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
           timeline      forecast    calibration
           (SVG chart)  (Holt +      (Pearson r,
                        MoodForecast) scatter plot)
```

### Research endpoints

```
GET /api/research/regulation
    │  groups listens into sessions (30-min gap = new session)
    │  classifies each session using lyrical valence trajectory + Last.fm tags:
    │    – Upregulation   (valence rises; high-energy tags like rap/edm)
    │    – Mood Repair    (starts negative, ends positive)
    │    – Rumination     (stays in low valence without recovery)
    │    – Mood Maintenance (neutral → neutral)
    │    – Diversion      (high tempo + low lyrical weight)
    └─► returns strategy distribution + recent session samples

GET /api/research/genre-mood
    │  groups tracks by Last.fm genre tag
    │  aggregates avg_valence + dominant_emotion per genre
    └─► returns genre cards with emotion mini-bars + valence score
```

## Database tables

| Table | Purpose |
|---|---|
| `users` | Spotify user accounts + refresh tokens |
| `tracks` | Track metadata + valence score + `tags` JSON (Last.fm) |
| `listens` | Each play event (user × track × timestamp) |
| `lyrics` | Cached lyrics text per track |
| `scores` | Full emotion scores per track (joy, sadness, anger, fear, optimism, ...) |
| `mood_checkins` | User self-reported daily mood (1–5) |
| `daily` | Pre-aggregated daily mood stats |

## NLP models

| Model | Purpose | Output |
|---|---|---|
| `j-hartmann/emotion-english-distilroberta-base` | Emotion classification (English) | 7 emotion probabilities (0→1) |
| `cardiffnlp/twitter-roberta-base-sentiment` | Polarity | positive / neutral / negative |
| `cardiffnlp/twitter-xlm-roberta-base-sentiment` | Polarity (non-English) | positive / neutral / negative |
| VADER (`vaderSentiment`) | Fast rule-based sentiment | compound score −1 to +1 |

Lyrical mood score = `(positive_emotion_mass − negative_emotion_mass) / total_mass`, giving a −1 to +1 signal displayed as plain labels:

| Score range | Label |
|---|---|
| > 0.4 | Very uplifting |
| 0.2 – 0.4 | Uplifting |
| 0.05 – 0.2 | Slightly uplifting |
| −0.05 – 0.05 | Neutral |
| −0.2 – −0.05 | Slightly heavy |
| −0.4 – −0.2 | Heavy |
| < −0.4 | Very heavy |

> All scores reflect **lyrical content only** — not the musical sound, tempo, or key of the track.
