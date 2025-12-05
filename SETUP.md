# MoodSync Setup Guide

## 🚀 Quick Start (5 minutes)

### Prerequisites

```bash
# Required
Python 3.9+
PostgreSQL 13+
Redis 6+

# Optional (for full features)
Node.js 16+ (for frontend)
Docker (for containerized deployment)
```

### 1. Database Setup

```bash
# Install PostgreSQL
# macOS:
brew install postgresql
brew services start postgresql

# Ubuntu/Debian:
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# Create database
psql postgres
CREATE DATABASE moodsync;
CREATE USER moodsync_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE moodsync TO moodsync_user;
\q
```

### 2. Redis Setup

```bash
# macOS:
brew install redis
brew services start redis

# Ubuntu/Debian:
sudo apt install redis-server
sudo systemctl start redis
```

### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your credentials (see below)

# Initialize database
python scripts/init_db.py

# Run the application
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`
- API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

## 🔑 API Keys Setup

### Spotify Developer Account

1. Go to https://developer.spotify.com/dashboard
2. Click "Create an App"
3. Fill in app name and description
4. Add redirect URI: `http://localhost:8000/api/auth/callback`
5. Copy `Client ID` and `Client Secret` to your `.env` file

```env
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
SPOTIFY_REDIRECT_URI=http://localhost:8000/api/auth/callback
```

### Genius API (for lyrics)

1. Go to https://genius.com/api-clients
2. Click "New API Client"
3. Fill in app details
4. Generate a Client Access Token
5. Copy token to your `.env` file

```env
GENIUS_ACCESS_TOKEN=your_genius_token_here
```

### Optional: Musixmatch API (backup lyrics source)

1. Go to https://developer.musixmatch.com/
2. Sign up and get API key
3. Add to `.env`:

```env
MUSIXMATCH_API_KEY=your_musixmatch_key_here
```

## 📝 Environment Variables

Complete `.env` file template:

```env
# Database
DATABASE_URL=postgresql://moodsync_user:your_password@localhost:5432/moodsync

# Redis
REDIS_URL=redis://localhost:6379/0

# Spotify
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:8000/api/auth/callback

# Genius
GENIUS_ACCESS_TOKEN=your_genius_token

# JWT
JWT_SECRET_KEY=generate-a-strong-random-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# App Settings
DEBUG=True
LOG_LEVEL=INFO
USE_GPU=False  # Set to True if you have GPU support

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000
```

## 🧪 Testing the Setup

### 1. Test Database Connection

```bash
python -c "from app.models import init_db; init_db(); print('✅ Database connection successful')"
```

### 2. Test Sentiment Analyzer

```bash
python -c "from app.services.sentiment import get_sentiment_analyzer; analyzer = get_sentiment_analyzer(); result = analyzer.analyze_comprehensive('I love this happy song'); print('✅ Sentiment analyzer working:', result)"
```

### 3. Test API Endpoints

```bash
# Health check
curl http://localhost:8000/health

# Get auth URL
curl http://localhost:8000/api/auth/login
```

## 📊 Database Initialization Script

Create `scripts/init_db.py`:

```python
"""
Initialize database tables
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models import init_db

if __name__ == "__main__":
    print("Initializing database...")
    init_db()
    print("✅ Database initialized successfully!")
```

Run it:
```bash
python scripts/init_db.py
```

## 🔄 Typical Workflow

### 1. User Authentication
```bash
# Get login URL
GET /api/auth/login
# Returns: {"auth_url": "https://accounts.spotify.com/..."}

# User clicks URL, authorizes, redirects to callback
GET /api/auth/callback?code=...
# Returns: JWT token and user info
```

### 2. Sync Listening History
```bash
POST /api/tracks/sync
Headers: Authorization: Bearer <jwt_token>
Body: {
  "spotify_access_token": "<spotify_token>",
  "limit": 50
}
```

### 3. Get Mood Insights
```bash
GET /api/insights/timeline?days=30
Headers: Authorization: Bearer <jwt_token>
```

## 🐳 Docker Deployment (Optional)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  db:
    image: postgres:13
    environment:
      POSTGRES_DB: moodsync
      POSTGRES_USER: moodsync_user
      POSTGRES_PASSWORD: your_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:6
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    depends_on:
      - db
      - redis
    environment:
      DATABASE_URL: postgresql://moodsync_user:your_password@db:5432/moodsync
      REDIS_URL: redis://redis:6379/0
    volumes:
      - ./backend:/app

volumes:
  postgres_data:
```

Run with Docker:
```bash
docker-compose up -d
```

## 🎯 Next Steps

1. **Test Authentication Flow**: Try logging in with your Spotify account
2. **Sync Your Data**: Import your listening history
3. **Run Analysis**: Process lyrics and generate sentiment scores
4. **View Insights**: Check your mood timeline

## 🔧 Troubleshooting

### Issue: Database connection failed
```bash
# Check PostgreSQL is running
pg_isready

# Check credentials in .env
psql -U moodsync_user -d moodsync -h localhost
```

### Issue: Redis connection failed
```bash
# Check Redis is running
redis-cli ping
# Should return: PONG
```

### Issue: Sentiment models not loading
```bash
# Clear cache and reinstall transformers
pip uninstall transformers torch
pip install transformers torch --no-cache-dir

# Check GPU availability (if using)
python -c "import torch; print(torch.cuda.is_available())"
```

### Issue: Genius API rate limit
```bash
# The free tier has limits. Consider:
# 1. Adding delays between requests
# 2. Caching lyrics in database
# 3. Using Musixmatch as backup
```

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Spotipy Documentation](https://spotipy.readthedocs.io/)
- [HuggingFace Transformers](https://huggingface.co/docs/transformers)
- [SQLAlchemy Tutorial](https://docs.sqlalchemy.org/)

## 🆘 Getting Help

If you encounter issues:
1. Check logs in `logs/moodsync.log`
2. Enable debug mode: `DEBUG=True` in `.env`
3. Check API docs at `/docs` for endpoint details
4. Review the project README.md

## ✅ Verification Checklist

- [ ] PostgreSQL running and database created
- [ ] Redis running
- [ ] Python virtual environment activated
- [ ] All dependencies installed
- [ ] .env file configured with all API keys
- [ ] Database tables created (init_db.py)
- [ ] API server running at http://localhost:8000
- [ ] Health check returns "healthy"
- [ ] Can access /docs for API documentation
- [ ] Spotify login redirects correctly
- [ ] Sentiment analyzer loads successfully

Once all items are checked, you're ready to start using MoodSync! 🎉
