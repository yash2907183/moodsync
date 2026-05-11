# MoodSync

Discover what your music says about your emotional state. MoodSync connects to your Spotify account, fetches song lyrics, runs them through emotion and sentiment models, and builds a personal mood timeline — complete with AI-written summaries, a 7-day forecast, playlist mood analysis, and AI-generated music.

Live at: **[moodsync-delta.vercel.app](https://moodsync-delta.vercel.app)**

## What it does

- **Spotify OAuth** — sign in with Spotify; your 50 most recent tracks are fetched and analysed automatically after each sync
- **Lyrics NLP** — lyrics are pulled from Genius (with lyrics.ovh as cloud fallback) and analysed with three models:
  - `j-hartmann/emotion-english-distilroberta-base` — 7-class emotion classifier (joy, sadness, anger, fear, disgust, surprise, optimism)
  - `cardiffnlp/twitter-roberta-base-sentiment` — RoBERTa polarity (positive / neutral / negative)
  - VADER — fast rule-based sentiment as a secondary signal
- **Mood timeline** — daily aggregated lyrical mood score plotted over time
- **Emotion breakdown** — bar chart showing your dominant emotions from recent lyrics (joy, anger, fear, sadness, optimism)
- **AI mood summary** — Claude writes a personalised paragraph about your emotional state based on your top tracks and emotion mix
- **7-day forecast** — Holt exponential smoothing predicts your mood trajectory with a confidence band, interpreted by Claude in plain English
- **Playlist analyser** — paste any Spotify playlist URL; MoodSync fetches lyrics for every track and returns a full mood profile with per-track emotion scores
- **AI music generation** — after analysing a playlist, Claude writes a music prompt and Stability Audio generates a 45-second original track matching the playlist's vibe
- **Mood check-ins** — rate your actual mood (1–5) each day; the app computes Pearson correlation between your self-report and the lyrical mood reading
- **Analysis progress** — live banner after sync shows how many tracks are being processed in the background, auto-refreshes when done
- **Shareable cards** — html2canvas renders a styled PNG you can download or share
- **Dark / light mode** — system-preference detection + manual toggle, no flash on load

## Tech stack

| Layer | Stack |
|---|---|
| Backend | Python 3.11, FastAPI, SQLAlchemy 2, PostgreSQL (Neon) |
| NLP | HuggingFace Transformers, VADER, statsmodels |
| AI summary & forecast | Anthropic Claude API (claude-opus-4-7) |
| AI music generation | Stability AI Stable Audio API |
| Lyrics | Genius API (lyricsgenius) + lyrics.ovh fallback |
| Auth | Spotify OAuth 2.0 + JWT (python-jose) |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS v3 |
| Charts | Recharts |
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
ANTHROPIC_API_KEY=
STABILITY_API_KEY=

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
| GET | `/api/mood/checkin/today` | Today's mood check-in |
| POST | `/api/mood/checkin` | Submit mood check-in |
| GET | `/api/mood/correlation` | Check-in vs lyrical mood correlation |
| GET | `/api/summary/mood` | Generate Claude AI mood summary |
| GET | `/api/summary/forecast` | Claude narrative for forecast |
| POST | `/api/playlists/analyze` | Start background playlist analysis job |
| GET | `/api/playlists/jobs/{id}` | Poll playlist job status + results |
| POST | `/api/playlists/jobs/{id}/generate-music` | Generate AI music from playlist mood |

Interactive docs at `http://localhost:8000/docs`.

## Scripts

```bash
scripts/init_db.py          # create all database tables
scripts/backfill_moods.py   # analyse stored tracks against a specific DATABASE_URL
scripts/daily_sync.py       # sync + analyse (for cron jobs)
scripts/view_analysis.py    # CLI tool to inspect scores in the database
scripts/dump_db.py          # export DB rows to JSON for debugging
```

## How scoring works

MoodSync measures **lyrical emotional content** — not the sound of the music. This distinction matters:

- "Mr. Brightside" has jealous, angry lyrics but sounds euphoric — our score reflects the lyrics, not the feeling
- Scores are based on what the *words express*, not tempo, key, or instrumentation

The pipeline: j-hartmann classifies 7 emotions from the lyrics → valence is computed as `(positive_mass − negative_mass) / total_mass` → shown as plain labels (Very dark / Dark & heavy / Mixed / Uplifting / Very uplifting)

## Known limitations

- **Genius blocked on cloud IPs** — Genius rate-limits requests from data centre IPs; lyrics.ovh is used as a fallback but has narrower coverage
- **Non-English tracks** — neither Genius nor lyrics.ovh reliably covers regional/non-English music; these tracks get a neutral placeholder score
- **Lyrics ≠ musical feel** — sentiment is derived from lyrics only; audio features (tempo, key, energy) are not used since Spotify's audio features API was deprecated for new apps in Nov 2024
- **Spotify dev mode** — the app supports up to 25 users; add testers via the Spotify Developer Dashboard until extended quota is approved

## License

MIT
