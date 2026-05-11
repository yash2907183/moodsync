# Setup Guide

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL (local) or Neon (hosted, recommended)
- Spotify Developer account
- Genius API account
- Anthropic API key
- Stability AI API key (for AI music generation)

---

## 1. Spotify app

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) and create an app.
2. Under **Settings → Redirect URIs**, add:
   - `http://localhost:8000/api/auth/callback` (local dev)
   - `https://your-railway-url.up.railway.app/api/auth/callback` (production)
3. Copy your **Client ID** and **Client Secret**.
4. To allow other users to log in: Settings → User Management → add their Spotify email (up to 25 users in dev mode).

---

## 2. Genius API

1. Go to [genius.com/api-clients](https://genius.com/api-clients) and create a client.
2. Copy the **Client Access Token** (read-only is fine).

> Note: Genius is unreliable from cloud server IPs. The app automatically falls back to lyrics.ovh when Genius fails.

---

## 3. Anthropic API

1. Get a key from [console.anthropic.com](https://console.anthropic.com).
2. Used for: mood summary, forecast narrative, playlist music prompt generation.

---

## 4. Stability AI API

1. Sign up at [platform.stability.ai](https://platform.stability.ai).
2. Go to **Account → API Keys** → create a key.
3. Used for: generating audio from playlist mood analysis.

---

## 5. Database

### Local PostgreSQL

```bash
createdb moodsync
# connection string: postgresql://your_user:your_pass@localhost:5432/moodsync
```

### Hosted (Neon — recommended)

1. Create a project at [neon.tech](https://neon.tech).
2. Copy the connection string from the dashboard.
3. Run `python scripts/init_db.py` with `DATABASE_URL` set to create all tables.

---

## 6. Backend

```bash
cd backend

python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

pip install -r requirements.txt
```

Create `backend/.env`:

```
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:8000/api/auth/callback

GENIUS_ACCESS_TOKEN=your_genius_token
ANTHROPIC_API_KEY=your_anthropic_key
STABILITY_API_KEY=your_stability_key

DATABASE_URL=postgresql://user:pass@localhost:5432/moodsync

JWT_SECRET_KEY=some-long-random-string-keep-it-secret
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000
```

Initialize the database:

```bash
python ../scripts/init_db.py
```

Start the backend:

```bash
uvicorn app.main:app --reload
```

API available at `http://localhost:8000`. Swagger docs: `http://localhost:8000/docs`.

---

## 7. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No `.env.local` needed for local dev — the Next.js rewrite proxies `/api/` to `localhost:8000` by default.

---

## 8. First run

1. Click **Connect with Spotify** on the landing page.
2. Authorize the app.
3. Click **Sync** on the dashboard — this fetches your 50 most recent tracks and starts background analysis.
4. A banner shows how many tracks are being analysed. It disappears automatically when done (typically 2–10 minutes depending on how many tracks need lyrics).
5. The first sync loads HuggingFace models which takes ~15 seconds on first startup.

---

## 9. Backfilling (optional)

To re-analyse all stored tracks (e.g. after a model change, or to pre-warm the playlist analyser cache):

```bash
cd backend
source venv/bin/activate
cd ..
DATABASE_URL="postgresql://..." python scripts/backfill_moods.py
```

Pass your Neon connection string if running against the production database.

---

## 10. Deployment

### Database → Neon

1. Create a Neon project at [neon.tech](https://neon.tech).
2. Copy the connection string.
3. Run `DATABASE_URL="<neon-url>" python scripts/init_db.py` to create tables.

### Backend → Railway

1. Push your repo to GitHub.
2. Create a Railway project, connect the repo, set the **Root Directory** to `/backend`.
3. Add all variables from `backend/.env`, plus:
   - `ALLOWED_ORIGINS=https://your-vercel-url.vercel.app`
   - `FRONTEND_URL=https://your-vercel-url.vercel.app`
4. In Railway service Settings → Networking, make sure the public URL's **Target Port** matches the port uvicorn runs on (typically 8080).

### Frontend → Vercel

1. Import the repo in Vercel, set the **Root Directory** to `frontend`.
2. Add environment variable:
   - `NEXT_PUBLIC_BACKEND_URL=https://your-railway-url.up.railway.app`
3. Deploy.

### Post-deployment checklist

- Add production callback URL to Spotify dashboard: `https://your-railway-url.up.railway.app/api/auth/callback`
- Update `SPOTIFY_REDIRECT_URI` in Railway variables to the same URL
- Verify `/health` endpoint returns 200 on your Railway URL
