# MoodSync Project Structure

```
moodsync/
│
├── README.md                 # Main project documentation
├── LICENSE                   # Project license
│
├── backend/                  # Backend API application
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          # FastAPI application entry point
│   │   │
│   │   ├── api/             # API endpoints
│   │   │   ├── __init__.py
│   │   │   ├── auth.py      # Authentication endpoints (login, callback, logout)
│   │   │   ├── tracks.py    # Track management (sync, fetch, lyrics)
│   │   │   ├── analysis.py  # Sentiment analysis endpoints
│   │   │   ├── insights.py  # User insights and analytics
│   │   │   └── mood.py      # Mood tracking and predictions
│   │   │
│   │   ├── models/          # Database and data models
│   │   │   ├── __init__.py  # Database session management
│   │   │   ├── database.py  # SQLAlchemy ORM models
│   │   │   └── schemas.py   # Pydantic validation schemas
│   │   │
│   │   ├── services/        # Business logic services
│   │   │   ├── sentiment.py # Multi-model sentiment analysis
│   │   │   ├── spotify.py   # Spotify API integration
│   │   │   ├── lyrics.py    # Lyrics fetching (Genius)
│   │   │   ├── aggregator.py # Daily mood aggregation
│   │   │   └── predictor.py # Mood prediction (ARIMA/LSTM)
│   │   │
│   │   └── utils/           # Utility functions
│   │       ├── __init__.py
│   │       ├── text.py      # Text processing utilities
│   │       └── cache.py     # Redis caching utilities
│   │
│   ├── tests/               # Test suite
│   │   ├── test_api/
│   │   ├── test_services/
│   │   └── test_models/
│   │
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Environment variables template
│   └── Dockerfile           # Docker configuration
│
├── frontend/                # Frontend application (optional)
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── utils/          # Utility functions
│   │   └── App.js
│   ├── public/
│   ├── package.json
│   └── Dockerfile
│
├── data/                    # Data storage
│   ├── raw/                # Raw data (listening history)
│   ├── processed/          # Processed data
│   └── cache/              # Cached API responses
│
├── notebooks/              # Jupyter notebooks for analysis
│   ├── exploratory_analysis.ipynb
│   ├── model_evaluation.ipynb
│   └── visualization.ipynb
│
├── scripts/                # Utility scripts
│   ├── init_db.py         # Initialize database
│   ├── test_setup.py      # Setup verification
│   ├── sync_data.py       # Batch data sync
│   └── export_data.py     # Data export utilities
│
├── docs/                   # Documentation
│   ├── SETUP.md           # Setup guide
│   ├── API.md             # API documentation
│   ├── ARCHITECTURE.md    # Architecture overview
│   └── TROUBLESHOOTING.md # Common issues
│
└── docker-compose.yml      # Docker services configuration
```

## 📂 Key Directories

### `/backend/app/`
Core application code with FastAPI framework.

### `/backend/app/api/`
RESTful API endpoints organized by functionality:
- **auth.py**: Spotify OAuth, JWT tokens
- **tracks.py**: Sync listening history, fetch metadata
- **analysis.py**: Run sentiment analysis on tracks
- **insights.py**: Generate mood timelines and insights
- **mood.py**: User mood check-ins and predictions

### `/backend/app/models/`
Data layer with SQLAlchemy ORM:
- **database.py**: User, Track, Listen, Lyric, Score, DailyMood, MoodCheckin tables
- **schemas.py**: Pydantic models for request/response validation

### `/backend/app/services/`
Business logic services:
- **sentiment.py**: VADER + RoBERTa + GoEmotions for comprehensive analysis
- **spotify.py**: Spotify API wrapper (listening history, audio features)
- **lyrics.py**: Genius API integration with cleaning and normalization
- **aggregator.py**: Daily mood computation from individual tracks
- **predictor.py**: Time series forecasting (ARIMA/LSTM)

## 🔄 Data Flow

```
1. User Authentication
   └─> Spotify OAuth → JWT Token

2. Data Collection
   └─> Spotify API → Recently Played Tracks
   └─> Genius API → Lyrics
   └─> Database Storage

3. Sentiment Analysis
   └─> Lyrics → VADER/RoBERTa/GoEmotions → Sentiment Scores
   └─> Audio Features → Valence/Energy mapping
   └─> Database Storage

4. Aggregation
   └─> Individual Track Scores → Daily Mood Index
   └─> Temporal Patterns → Weekly/Monthly Trends

5. Insights Generation
   └─> Mood Timeline Visualization
   └─> Top Emotional Drivers
   └─> Predictions (Next Day/Week)
```

## 🗄️ Database Schema

### Users Table
- user_id (PK)
- spotify_id
- email
- last_sync
- consent_version

### Tracks Table
- track_id (PK)
- spotify_id
- name, artists, album
- Audio features (valence, energy, tempo, etc.)

### Listens Table
- listen_id (PK)
- user_id (FK) + track_id (FK)
- played_at
- context (playlist/album)

### Lyrics Table
- lyric_id (PK)
- track_id (FK)
- text, language, source
- is_instrumental

### Scores Table
- score_id (PK)
- track_id (FK)
- model (vader/roberta/goemotions)
- polarity, emotions, valence/arousal

### Daily Table
- daily_id (PK)
- user_id (FK)
- day
- Aggregated sentiment/emotions
- top_tracks, top_emotions

### MoodCheckins Table
- checkin_id (PK)
- user_id (FK)
- day, mood_1to5, notes

## 🚀 API Endpoints

### Authentication
```
GET  /api/auth/login          # Get Spotify auth URL
GET  /api/auth/callback       # OAuth callback
GET  /api/auth/me             # Current user info
POST /api/auth/logout         # Logout
```

### Tracks
```
POST /api/tracks/sync         # Sync listening history
GET  /api/tracks/recent       # Recent listens
GET  /api/tracks/{id}         # Track details
GET  /api/tracks/{id}/lyrics  # Track lyrics
```

### Analysis
```
POST /api/analysis/track/{id} # Analyze single track
POST /api/analysis/batch      # Analyze multiple tracks
GET  /api/analysis/scores     # Get sentiment scores
```

### Insights
```
GET  /api/insights/timeline   # Mood timeline
GET  /api/insights/summary    # Current mood summary
GET  /api/insights/drivers    # Top emotional drivers
GET  /api/insights/predictions # Mood predictions
```

### Mood
```
POST /api/mood/checkin        # Submit mood check-in
GET  /api/mood/checkins       # Get user check-ins
GET  /api/mood/correlation    # Correlation analysis
```

## 🧪 Testing

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_api/test_auth.py

# Run with coverage
pytest --cov=app tests/

# Run integration tests
pytest tests/integration/
```

## 📊 Models Used

### Sentiment Analysis
- **VADER**: Rule-based, fast baseline
- **RoBERTa**: cardiffnlp/twitter-roberta-base-sentiment
- **GoEmotions**: joeddav/distilbert-base-uncased-go-emotions-student

### Time Series Forecasting
- **ARIMA**: Classical time series
- **LSTM/GRU**: Deep learning for sequences

### Language Detection
- **FastText**: Fast language identification
- **LangDetect**: Python language detection

## 🔧 Configuration

All configuration via environment variables in `.env`:
- Database connection
- API keys (Spotify, Genius)
- Model settings
- Feature flags

## 📈 Performance Considerations

### Caching
- Redis for API responses
- Database for lyrics
- Model embeddings in memory

### Batch Processing
- Celery for async tasks
- Background lyrics fetching
- Bulk sentiment analysis

### Optimization
- Connection pooling
- Query optimization with indexes
- Model inference batching
