# MoodSync

Discover what your music says about your mood. MoodSync connects to your Spotify account, fetches lyrics via Genius, runs them through emotion and sentiment models, and builds a personal mood timeline — complete with AI-written summaries, a 7-day forecast, and shareable mood cards.

![MoodSync Dashboard](docs/screenshot.png)

## What it does

- **Spotify OAuth** — sign in with Spotify, we fetch your 50 most recent tracks
- **Lyrics NLP** — lyrics are pulled from Genius and analysed with three models:
  - `j-hartmann/emotion-english-distilroberta-base` — 7-class emotion classifier (joy, sadness, anger, fear, disgust, surprise, neutral)
  - `cardiffnlp/twitter-roberta-base-sentiment` — RoBERTa polarity (positive / neutral / negative)
  - VADER — fast rule-based sentiment as a secondary signal
- **Mood timeline** — daily aggregated valence score plotted over time
- **AI mood summary** — Claude (Anthropic) writes a personalised paragraph about your emotional state based on your dominant emotions and top tracks
- **7-day forecast** — Holt exponential smoothing (statsmodels) predicts your mood trajectory with a confidence band
- **Mood check-ins** — rate your actual mood (1–5) each day; the app computes Pearson correlation between your self-report and the AI's valence reading
- **Shareable cards** — html2canvas renders a styled PNG you can download or share
- **Dark / light mode** — system-preference detection + manual toggle, no flash on load

## Tech stack

| Layer | Stack |
|---|---|
| Backend | Python 3.11, FastAPI, SQLAlchemy 2, PostgreSQL |
| NLP | HuggingFace Transformers, VADER, statsmodels |
| AI summary | Anthropic Claude API |
| Lyrics | Genius API via lyricsgenius |
| Auth | Spotify OAuth 2.0 + JWT (python-jose) |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS v3 |
| Charts | Recharts |
| Cards | html2canvas |

## Quick start

See [SETUP.md](SETUP.md) for full instructions. Short version:

```bash
# 1. Clone and enter the repo
git clone <your-repo-url> moodsync && cd moodsync

# 2. Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in your keys
python ../scripts/init_db.py
uvicorn app.main:app --reload --port 8000

# 3. Frontend (new terminal)
cd frontend
npm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), click **Connect with Spotify**, and sync your tracks.

## Environment variables

### Backend (`backend/.env`)

```
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://localhost:8000/api/auth/callback

GENIUS_ACCESS_TOKEN=

ANTHROPIC_API_KEY=

DATABASE_URL=postgresql://user:pass@localhost:5432/moodsync

JWT_SECRET_KEY=          # any random string, keep it secret
FRONTEND_URL=http://localhost:3000
```

### Frontend (`frontend/.env.local`)

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## API endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/auth/login` | Begin Spotify OAuth flow |
| GET | `/api/auth/callback` | OAuth callback, issues JWT |
| GET | `/api/tracks/sync` | Fetch & analyse recent tracks |
| GET | `/api/insights/timeline` | Daily valence history |
| GET | `/api/insights/emotions` | Emotion breakdown |
| GET | `/api/insights/predict` | 7-day mood forecast |
| GET | `/api/insights/top-tracks` | Top tracks with scores |
| GET | `/api/insights/correlation` | Mood check-in vs AI valence |
| GET | `/api/mood/checkin` | Today's check-in |
| POST | `/api/mood/checkin` | Submit mood check-in |
| GET | `/api/summary/generate` | Generate Claude AI summary |
| GET | `/api/analysis/me` | Current user info |

Interactive docs at `http://localhost:8000/docs` (Swagger UI).

## Scripts

```bash
scripts/init_db.py          # create database tables
scripts/backfill_moods.py   # re-analyse all stored tracks (run after model change)
scripts/daily_sync.py       # sync + analyse (run this as a cron job)
scripts/view_analysis.py    # CLI tool to inspect scores in the database
scripts/dump_db.py          # export DB rows to JSON for debugging
```

## Known limitations

- **Explicit lyrics score low** — NLP models read explicit / aggressive language literally, so tracks like hype anthems often get negative valence. This is a known limitation of text-based sentiment; audio features would solve it but Spotify's audio features API is deprecated for new apps (Nov 2024).
- **Instrumental tracks** — lyrics are absent so VADER / transformer scores fall back to neutral (0.0).
- **Genius matching** — the Genius search sometimes returns wrong lyrics for non-English or remixed tracks.

## License

MIT
