# MoodSync: Personalized Music Sentiment Analysis and Mood Prediction

## 🎵 Project Overview

MoodSync is a personalized music sentiment analysis engine. Unlike standard Spotify wrappers that rely on pre-made metadata, MoodSync uses local Deep Learning (RoBERTa) to read the lyrics of your listening history and generate custom emotional insights.

### Key Features
- Analyze lyrics and audio features from Spotify listening history
- Track emotional patterns over time
- Predict mood changes based on music choices
- Provide personalized insights and recommendations

## 🏗️ Architecture

```
Raw Data → Feature Extraction → Sentiment Analysis → Pattern Recognition → User Insights
```

### Multi-Modal Approach
- **Lyrics Analysis**: Sentiment and emotion classification
- **Audio Features**: Valence, energy, tempo, key from Spotify API
- **Listening Context**: Time, patterns, listening duration
- **User Feedback**: Optional mood check-ins for validation

## 📋 Implementation Phases

### Phase 1: Data Infrastructure (Weeks 1-2) ✓
- Spotify API integration for listening history
- Genius/Musixmatch API for lyrics
- Data storage and caching setup

### Phase 2: Sentiment Analysis Models (Weeks 3-4)
- VADER baseline sentiment analyzer
- Fine-tuned BERT/RoBERTa on music lyrics
- Emotion classification (joy, sadness, anger, fear)
- Audio feature to sentiment mapping

### Phase 3: Pattern Recognition (Weeks 5-6)
- Temporal analysis (daily/weekly/monthly patterns)
- Personalized baselines and correlations
- Anomaly detection

### Phase 4: User Interface (Weeks 7-8)
- Dashboard with mood timeline visualization
- Top emotional triggers
- Personalized predictions
- Music recommendations

## 🚀 Quick Start

### Prerequisites
```bash
Python 3.9+
Node.js 16+
PostgreSQL 13+
Redis 6+
```

### Installation

1. **Clone and setup backend**
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API keys
```

2. **Setup database**
```bash
python scripts/init_db.py
```

3. **Run backend**
```bash
uvicorn app.main:app --reload
```

4. **Setup frontend** (optional)
```bash
cd frontend
npm install
npm run dev
```

## 🔑 Required API Keys

Add these to your `.env` file:
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `GENIUS_ACCESS_TOKEN`
- `MUSIXMATCH_API_KEY` (optional backup)
- `DATABASE_URL`
- `REDIS_URL`

## 📊 Data Flow

1. **Auth & Ingest**: OAuth login → Pull listening history
2. **Lyric Retrieval**: Fetch and clean lyrics from Genius/Musixmatch
3. **Language Detection**: Route multilingual content appropriately
4. **Sentiment Scoring**: Compute polarity and emotion vectors
5. **Aggregation**: Song → Session → Daily mood indices
6. **Prediction**: ARIMA/LSTM for mood forecasting

## 🛠️ Technology Stack

### Backend
- **Framework**: FastAPI
- **Task Queue**: Celery + Redis
- **Database**: PostgreSQL
- **NLP**: HuggingFace Transformers, spaCy
- **APIs**: Spotipy, lyricsgenius

### Machine Learning
- **Sentiment**: VADER, RoBERTa (cardiffnlp/twitter-roberta-base-sentiment)
- **Emotions**: GoEmotions (joeddav/distilbert-base-uncased-go-emotions-student)
- **Time Series**: statsmodels (ARIMA), PyTorch (LSTM/GRU)

### Frontend (Optional)
- **Framework**: Next.js + React
- **Charts**: Recharts / Chart.js
- **UI**: Tailwind CSS

## 📈 Evaluation Metrics

### Quantitative
- Mood prediction accuracy (target: 70%+)
- Pearson/Spearman correlation with self-reports
- MAE for next-day predictions

### Qualitative
- User satisfaction with insights
- Behavioral changes in listening habits

## 🗄️ Database Schema

### Core Tables
- `users`: User accounts and consent
- `tracks`: Song metadata
- `listens`: Listening history with timestamps
- `lyrics`: Cached lyrics with language info
- `scores`: Per-song sentiment and emotion scores
- `daily`: Aggregated daily mood indices
- `mood_checkins`: User-reported moods for validation

## 🔒 Privacy & Ethics

- Secure token storage with encryption
- User data deletion on request
- Local lyrics caching
- Clear disclaimer: supportive insight, not medical diagnosis
- Compliance with API ToS

## 📝 MVP Checklist

- [ ] Spotify OAuth + fetch recent plays
- [ ] Genius/Musixmatch lyrics integration
- [ ] Basic sentiment analysis (RoBERTa)
- [ ] Per-song emotion scoring
- [ ] Daily aggregation pipeline
- [ ] Simple dashboard with mood timeline
- [ ] Optional: mood check-in feature
- [ ] Edge case handling (instrumentals, multi-language)
- [ ] CSV/JSON export

## 🎯 Advanced Features (Future)

- Real-time mood tracking with biometrics
- Social sentiment comparison (anonymous)
- Therapeutic applications integration
- Adaptive playlists based on mood detection
- Multi-user collaborative insights

## 📚 Datasets

### Public
- Million Song Dataset (audio features)
- MSD Mood Dataset (mood annotations)
- DEAM Dataset (valence/arousal annotations)
- Spotify Audio Features

### Custom
- 3-6 months listening + mood data
- Target: 50-100 active users

## 🤝 Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for development guidelines.

## 📄 License

See [LICENSE](LICENSE) file for details.

## 🆘 Troubleshooting

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for common issues.

## 📞 Contact

For questions or support, please open an issue on GitHub.
