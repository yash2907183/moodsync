# MoodSync

Discover what your music says about your emotional state. MoodSync connects to your Spotify account, fetches song lyrics, runs them through emotion and sentiment models, and builds a personal mood timeline — complete with a 7-day forecast, mood check-ins, personalised sentiment calibration, and research-grade analytics.

Live at: **[moodsync-delta.vercel.app](https://moodsync-delta.vercel.app)**

## What it does

- **Spotify OAuth** — sign in with Spotify; your 50 most recent tracks are fetched and analysed automatically after each sync
- **Lyrics NLP** — lyrics are fetched server-side from lrclib.net (open API, no key required, covers English and romanised Indic scripts) and analysed with two models:
  - `j-hartmann/emotion-english-distilroberta-base` — 7-class emotion classifier (joy, sadness, anger, fear, disgust, surprise, optimism)
  - `cardiffnlp/twitter-roberta-base-sentiment` — RoBERTa polarity (positive / neutral / negative)
- **Last.fm tag enrichment** — genre and mood tags fetched per track/artist; used to improve emotion regulation classification (e.g. distinguishes angry rap upregulation from genuine rumination)
- **Mood timeline** — daily aggregated lyrical mood score plotted over time with an SVG line chart
- **Emotion breakdown** — bar chart sorted by dominance showing your top emotions from recent lyrics (joy, anger, fear, sadness, optimism)
- **7-day forecast** — Holt exponential smoothing predicts your mood trajectory with a confidence band
- **Mood check-ins** — rate your actual mood (1–5) each day; the app computes Pearson correlation between your self-report and the lyrical mood reading
- **Personalised sentiment calibration** — scatter plot of universal model valence vs your check-in; shows Pearson r, p-value, and a personal calibration formula
- **Emotion regulation strategy** — classifies your listening sessions (Mood Maintenance, Upregulation, Rumination, Diversion) using lyrical trajectory + Last.fm tags
- **Genre mood breakdown** — per-genre emotion distribution and valence score using Last.fm genre tags
- **Language-aware sentiment** — non-English tracks use XLM-RoBERTa (multilingual); comparison across languages
- **Time-of-day / day-of-week patterns** — when do you listen to lyrically heavier vs lighter music?
- **Analysis progress** — live banner after sync shows how many tracks are being processed, auto-refreshes when done
- **Shareable cards** — html2canvas renders a styled PNG you can download or share

## Tech stack

| Layer | Stack |
|---|---|
| Backend | Python 3.11, FastAPI, SQLAlchemy 2, PostgreSQL (Neon) |
| NLP | HuggingFace Transformers (j-hartmann, XLM-RoBERTa, cardiffnlp), VADER, statsmodels |
| Music metadata | Last.fm API (genre/mood tags per track + artist) |
| Lyrics | lrclib.net (server-side, no key required) |
| Auth | Spotify OAuth 2.0 + JWT (python-jose) |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS v3 |
| UI design system | Material Design 3 color tokens, Hanken Grotesk / Inter / Geist fonts, Material Symbols Outlined icons |
| Charts | Recharts (forecast, correlation), SVG (mood timeline) |
| Cards | html2canvas |
| Hosting | Railway (backend) + Vercel (frontend) + Neon (database) |

## Quick start

See [SETUP.md](SETUP.md) for full instructions. Short version:

```bash
# 1. Clone
git clone https://github.com/yash2907183/moodsync && cd moodsync

# 2. Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in your keys
python ../scripts/init_db.py
uvicorn app.main:app --reload

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), click **Connect with Spotify**, and hit **Sync**.

## Environment variables

### Backend (`backend/.env`)

```
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://localhost:8000/api/auth/callback

GENIUS_ACCESS_TOKEN=
LASTFM_API_KEY=

DATABASE_URL=postgresql://user:pass@localhost:5432/moodsync

JWT_SECRET_KEY=          # any long random string
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000
```

### Frontend (no `.env.local` needed for local dev)

The frontend proxies all `/api/` calls through Next.js rewrites. In production, set:

```
NEXT_PUBLIC_BACKEND_URL=https://your-railway-url.up.railway.app
```

## API endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/auth/login` | Begin Spotify OAuth flow |
| GET | `/api/auth/callback` | OAuth callback, issues JWT |
| POST | `/api/tracks/sync` | Fetch & queue analysis for recent tracks |
| GET | `/api/tracks/analysis-status` | Count of tracks pending sentiment analysis |
| GET | `/api/tracks/top` | Most-played tracks |
| GET | `/api/tracks/recent` | Recent listen history |
| GET | `/api/insights/timeline` | Daily lyrical mood history |
| GET | `/api/insights/emotions` | Emotion breakdown (last 50 tracks) |
| GET | `/api/insights/predict` | 7-day mood forecast |
| GET | `/api/insights/time-of-day` | Average valence by hour of day |
| GET | `/api/insights/day-of-week` | Average valence by day of week |
| GET | `/api/mood/checkin/today` | Today's mood check-in |
| POST | `/api/mood/checkin` | Submit mood check-in |
| GET | `/api/mood/correlation` | Check-in vs lyrical mood correlation |
| GET | `/api/research/calibration` | Personalised sentiment calibration scatter data |
| GET | `/api/research/regulation` | Emotion regulation strategy classification |
| GET | `/api/research/language` | Language-aware sentiment comparison |
| GET | `/api/research/genre-mood` | Per-genre emotion + valence breakdown |

Interactive docs at `http://localhost:8000/docs`.

## Scripts

```bash
scripts/init_db.py          # create all database tables
scripts/backfill_moods.py   # analyse stored tracks against a specific DATABASE_URL
scripts/backfill_tags.py    # one-time Last.fm tag backfill for existing tracks
scripts/daily_sync.py       # sync + analyse (for cron jobs)
scripts/view_analysis.py    # CLI tool to inspect scores in the database
scripts/dump_db.py          # export DB rows to JSON for debugging
```

## How scoring works

MoodSync measures **lyrical emotional content** — not the sound of the music. This distinction matters:

- "Mr. Brightside" has jealous, angry lyrics but sounds euphoric — our score reflects the lyrics, not the feeling
- Scores are based on what the *words express*, not tempo, key, or instrumentation

The pipeline: j-hartmann classifies 7 emotions from the lyrics → valence is computed as `(positive_mass − negative_mass) / total_mass` → shown as plain labels (Very dark / Dark & heavy / Mixed / Uplifting / Very uplifting).

Non-English lyrics use XLM-RoBERTa multilingual model instead.

## Known limitations

- **Genius blocked on cloud IPs** — Genius is 403'd on Railway; lrclib.net is used as the server-side fallback
- **lrclib coverage** — very new releases and obscure tracks may not be in lrclib yet; those get valence=0.0
- **Language detection** — romanised Punjabi/Hindi lyrics are misidentified by langdetect; affects only the language comparison chart, not scoring
- **Lyrics ≠ musical feel** — sentiment is derived from lyrics only; Spotify's audio features API was deprecated for new apps in Nov 2024
- **Spotify dev mode** — the app supports up to 5 users; add testers via Spotify Developer Dashboard → User Management

## License

MIT
