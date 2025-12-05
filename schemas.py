"""
Pydantic schemas for API request/response validation
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, EmailStr, validator


# ============= User Schemas =============
class UserBase(BaseModel):
    email: Optional[EmailStr] = None


class UserCreate(UserBase):
    spotify_id: str
    consent_version: str = "1.0"


class UserResponse(UserBase):
    user_id: str
    spotify_id: Optional[str]
    created_at: datetime
    is_active: bool
    last_sync: Optional[datetime]
    
    class Config:
        from_attributes = True


# ============= Track Schemas =============
class AudioFeatures(BaseModel):
    valence: Optional[float] = None
    energy: Optional[float] = None
    danceability: Optional[float] = None
    tempo: Optional[float] = None
    loudness: Optional[float] = None
    speechiness: Optional[float] = None
    acousticness: Optional[float] = None
    instrumentalness: Optional[float] = None
    key: Optional[int] = None
    mode: Optional[int] = None


class TrackBase(BaseModel):
    name: str
    artists: List[str]
    album: Optional[str] = None
    duration_ms: Optional[int] = None


class TrackCreate(TrackBase):
    spotify_id: str
    audio_features: Optional[AudioFeatures] = None


class TrackResponse(TrackBase):
    track_id: str
    spotify_id: Optional[str]
    valence: Optional[float]
    energy: Optional[float]
    tempo: Optional[float]
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============= Listen Schemas =============
class ListenCreate(BaseModel):
    track_id: str
    played_at: datetime
    ms_played: Optional[int] = None
    context_type: Optional[str] = None
    context_uri: Optional[str] = None


class ListenResponse(BaseModel):
    listen_id: int
    user_id: str
    track_id: str
    played_at: datetime
    ms_played: Optional[int]
    
    class Config:
        from_attributes = True


# ============= Lyric Schemas =============
class LyricCreate(BaseModel):
    track_id: str
    source: str
    language: Optional[str] = None
    text: str
    is_instrumental: bool = False


class LyricResponse(BaseModel):
    lyric_id: int
    track_id: str
    source: str
    language: Optional[str]
    text: str
    is_instrumental: bool
    fetched_at: datetime
    
    class Config:
        from_attributes = True


# ============= Score Schemas =============
class EmotionScores(BaseModel):
    joy: float = 0.0
    sadness: float = 0.0
    anger: float = 0.0
    fear: float = 0.0
    surprise: float = 0.0
    disgust: float = 0.0
    optimism: float = 0.0
    love: float = 0.0


class ScoreCreate(BaseModel):
    track_id: str
    model: str
    polarity: Optional[float] = None
    compound: Optional[float] = None
    emotions: Optional[EmotionScores] = None
    valence_score: Optional[float] = None
    arousal_score: Optional[float] = None
    confidence: float = 1.0


class ScoreResponse(BaseModel):
    score_id: int
    track_id: str
    model: str
    polarity: Optional[float]
    joy: float
    sadness: float
    anger: float
    fear: float
    optimism: float
    confidence: float
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============= Daily Mood Schemas =============
class DailyMoodCreate(BaseModel):
    user_id: str
    day: datetime
    polarity_avg: Optional[float] = None
    polarity_std: Optional[float] = None
    joy_avg: float = 0.0
    sadness_avg: float = 0.0
    anger_avg: float = 0.0
    fear_avg: float = 0.0
    optimism_avg: float = 0.0
    energy_avg: Optional[float] = None
    valence_avg: Optional[float] = None
    tempo_avg: Optional[float] = None
    track_count: int = 0
    listening_minutes: float = 0.0
    confidence: float = 1.0
    top_tracks: Optional[List[str]] = None
    top_emotions: Optional[Dict[str, float]] = None


class DailyMoodResponse(BaseModel):
    daily_id: int
    user_id: str
    day: datetime
    polarity_avg: Optional[float]
    joy_avg: float
    sadness_avg: float
    anger_avg: float
    fear_avg: float
    optimism_avg: float
    track_count: int
    listening_minutes: float
    confidence: float
    top_emotions: Optional[Dict[str, float]]
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============= Mood Checkin Schemas =============
class MoodCheckinCreate(BaseModel):
    day: datetime
    mood_1to5: int = Field(..., ge=1, le=5)
    notes: Optional[str] = None
    
    @validator('mood_1to5')
    def validate_mood(cls, v):
        if v < 1 or v > 5:
            raise ValueError('Mood must be between 1 and 5')
        return v


class MoodCheckinResponse(BaseModel):
    checkin_id: int
    user_id: str
    day: datetime
    mood_1to5: int
    notes: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============= Analytics Schemas =============
class MoodTimeline(BaseModel):
    """Mood timeline data for visualization"""
    dates: List[datetime]
    polarity: List[float]
    emotions: Dict[str, List[float]]
    confidence: List[float]


class TopDriver(BaseModel):
    """Top emotional drivers (songs/artists)"""
    track_id: str
    track_name: str
    artists: List[str]
    contribution: float
    emotion: str


class MoodPrediction(BaseModel):
    """Mood forecast"""
    date: datetime
    predicted_polarity: float
    confidence_lower: float
    confidence_upper: float


class UserInsights(BaseModel):
    """Comprehensive user insights"""
    current_mood: float
    current_emotions: EmotionScores
    mood_trend: str  # "improving", "declining", "stable"
    timeline: MoodTimeline
    top_positive_drivers: List[TopDriver]
    top_negative_drivers: List[TopDriver]
    predictions: List[MoodPrediction]
    correlation_with_checkins: Optional[float] = None


# ============= Authentication Schemas =============
class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int


class TokenData(BaseModel):
    user_id: Optional[str] = None
    spotify_id: Optional[str] = None


# ============= API Response Wrappers =============
class ResponseModel(BaseModel):
    """Generic API response wrapper"""
    success: bool
    message: str
    data: Optional[Any] = None


class PaginatedResponse(BaseModel):
    """Paginated response wrapper"""
    items: List[Any]
    total: int
    page: int
    page_size: int
    has_next: bool
