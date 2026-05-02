# Setup Guide

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+ (local or hosted — Neon, Supabase, Railway all work)
- Spotify Developer account
- Genius API account
- Anthropic API key

---

## 1. Spotify app

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) and create an app.
2. Under **Settings → Redirect URIs**, add:
   - `http://localhost:8000/api/auth/callback` (local dev)
   - Your production callback URL when deploying
3. Copy your **Client ID** and **Client Secret**.

---

## 2. Genius API

1. Go to [genius.com/api-clients](https://genius.com/api-clients) and create a client.
2. Copy the **Client Access Token** (read-only is fine).

---

## 3. Anthropic API

1. Get a key from [console.anthropic.com](https://console.anthropic.com).

---

## 4. Database

### Local PostgreSQL

```bash
createdb moodsync
# connection string: postgresql://your_user:your_pass@localhost:5432/moodsync
```

### Hosted (Neon — recommended for free tier)

1. Create a project at [neon.tech](https://neon.tech).
2. Copy the connection string from the dashboard.

---

## 5. Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy and fill in environment variables
cp .env.example .env
```

Edit `backend/.env`:

```
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:8000/api/auth/callback

GENIUS_ACCESS_TOKEN=your_genius_token

ANTHROPIC_API_KEY=your_anthropic_key

DATABASE_URL=postgresql://user:pass@localhost:5432/moodsync

JWT_SECRET_KEY=some-long-random-string-keep-it-secret
FRONTEND_URL=http://localhost:3000
```

Initialize the database:

```bash
python ../scripts/init_db.py
```

Start the backend:

```bash
uvicorn app.main:app --reload --port 8000
```

The API is now at `http://localhost:8000`. Swagger docs: `http://localhost:8000/docs`.

---

## 6. Frontend

```bash
cd frontend
npm install

# Create env file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 7. First run

1. Click **Connect with Spotify** on the landing page.
2. Authorize the app.
3. Click **Sync now** on the dashboard — this fetches your 50 recent tracks, retrieves lyrics, and runs NLP analysis.
4. The first sync takes 1–3 minutes while HuggingFace models load.

---

## 8. Backfilling (optional)

If you switch NLP models or want to re-analyse all stored tracks:

```bash
cd backend
source .venv/bin/activate
python ../scripts/backfill_moods.py
```

---

## 9. Daily sync cron (optional)

To keep your data fresh automatically, run `scripts/daily_sync.py` on a schedule:

```bash
# crontab -e
0 6 * * * /path/to/.venv/bin/python /path/to/scripts/daily_sync.py >> /path/to/logs/daily.log 2>&1
```

---

## 10. Deployment

### Backend → Railway

1. Push your repo to GitHub.
2. Create a new Railway project, connect the repo, set the root to `/backend`.
3. Add all environment variables from `backend/.env`.
4. Update `SPOTIFY_REDIRECT_URI` to `https://your-railway-url/api/auth/callback`.

### Frontend → Vercel

1. Import the repo in Vercel, set the root to `/frontend`.
2. Add `NEXT_PUBLIC_API_URL=https://your-railway-url`.

### Database → Neon

Use the Neon connection string as `DATABASE_URL` in Railway.

After deploying, add your production callback URL to the Spotify app's **Redirect URIs**.
