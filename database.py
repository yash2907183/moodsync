"""
Database models for MoodSync application
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, JSON
from sqlalchemy.orm import relationship, DeclarativeBase
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    """Base class for all models"""
    pass


class User(Base):
    """User account information"""
    __tablename__ = "users"
    
    user_id = Column(String(255), primary_key=True, index=True)
    spotify_id = Column(String(255), unique=True, nullable=True, index=True)
    email = Column(String(255), unique=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    consent_version = Column(String(50), nullable=False, default="1.0")
    is_active = Column(Boolean, default=True)
    last_sync = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    listens = relationship("Listen", back_populates="user", cascade="all, delete-orphan")
    daily_moods = relationship("DailyMood", back_populates="user", cascade="all, delete-orphan")
    mood_checkins = relationship("MoodCheckin", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(user_id={self.user_id}, spotify_id={self.spotify_id})>"


class Track(Base):
    """Track/song metadata"""
    __tablename__ = "tracks"
    
    track_id = Column(String(255), primary_key=True, index=True)
    spotify_id = Column(String(255), unique=True, nullable=True, index=True)
    name = Column(String(500), nullable=False, index=True)
    artists = Column(JSON, nullable=False)  # List of artist names
    album = Column(String(500), nullable=True)
    duration_ms = Column(Integer, nullable=True)
    popularity = Column(Integer, nullable=True)
    
    # Spotify audio features
    valence = Column(Float, nullable=True)
    energy = Column(Float, nullable=True)
    danceability = Column(Float, nullable=True)
    tempo = Column(Float, nullable=True)
    loudness = Column(Float, nullable=True)
    speechiness = Column(Float, nullable=True)
    acousticness = Column(Float, nullable=True)
    instrumentalness = Column(Float, nullable=True)
    liveness = Column(Float, nullable=True)
    key = Column(Integer, nullable=True)
    mode = Column(Integer, nullable=True)
    time_signature = Column(Integer, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    listens = relationship("Listen", back_populates="track")
    lyrics = relationship("Lyric", back_populates="track", uselist=False)
    scores = relationship("Score", back_populates="track")
    
    def __repr__(self):
        return f"<Track(track_id={self.track_id}, name={self.name})>"


class Listen(Base):
    """User listening history"""
    __tablename__ = "listens"
    
    listen_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(255), ForeignKey("users.user_id"), nullable=False, index=True)
    track_id = Column(String(255), ForeignKey("tracks.track_id"), nullable=False, index=True)
    played_at = Column(DateTime(timezone=True), nullable=False, index=True)
    ms_played = Column(Integer, nullable=True)
    context_type = Column(String(50), nullable=True)  # playlist, album, artist, etc.
    context_uri = Column(String(255), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="listens")
    track = relationship("Track", back_populates="listens")
    
    def __repr__(self):
        return f"<Listen(user_id={self.user_id}, track_id={self.track_id}, played_at={self.played_at})>"


class Lyric(Base):
    """Cached lyrics for tracks"""
    __tablename__ = "lyrics"
    
    lyric_id = Column(Integer, primary_key=True, autoincrement=True)
    track_id = Column(String(255), ForeignKey("tracks.track_id"), unique=True, nullable=False, index=True)
    source = Column(String(50), nullable=False)  # genius, musixmatch, etc.
    language = Column(String(10), nullable=True)
    text = Column(Text, nullable=False)
    cleaned_text = Column(Text, nullable=True)
    fetched_at = Column(DateTime(timezone=True), server_default=func.now())
    is_instrumental = Column(Boolean, default=False)
    confidence = Column(Float, default=1.0)
    
    # Relationships
    track = relationship("Track", back_populates="lyrics")
    
    def __repr__(self):
        return f"<Lyric(track_id={self.track_id}, source={self.source}, language={self.language})>"


class Score(Base):
    """Sentiment and emotion scores for tracks"""
    __tablename__ = "scores"
    
    score_id = Column(Integer, primary_key=True, autoincrement=True)
    track_id = Column(String(255), ForeignKey("tracks.track_id"), nullable=False, index=True)
    model = Column(String(100), nullable=False, index=True)  # vader, roberta, goemotions
    
    # Sentiment scores
    polarity = Column(Float, nullable=True)  # -1 to 1
    compound = Column(Float, nullable=True)
    
    # Emotion scores (Ekman + extensions)
    joy = Column(Float, default=0.0)
    sadness = Column(Float, default=0.0)
    anger = Column(Float, default=0.0)
    fear = Column(Float, default=0.0)
    surprise = Column(Float, default=0.0)
    disgust = Column(Float, default=0.0)
    optimism = Column(Float, default=0.0)
    love = Column(Float, default=0.0)
    
    # Valence-Arousal (Russell's Circumplex)
    valence_score = Column(Float, nullable=True)
    arousal_score = Column(Float, nullable=True)
    
    confidence = Column(Float, default=1.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    track = relationship("Track", back_populates="scores")
    
    def __repr__(self):
        return f"<Score(track_id={self.track_id}, model={self.model}, polarity={self.polarity})>"


class DailyMood(Base):
    """Aggregated daily mood metrics"""
    __tablename__ = "daily"
    
    daily_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(255), ForeignKey("users.user_id"), nullable=False, index=True)
    day = Column(DateTime(timezone=True), nullable=False, index=True)
    
    # Aggregated sentiment
    polarity_avg = Column(Float, nullable=True)
    polarity_std = Column(Float, nullable=True)
    
    # Aggregated emotions
    joy_avg = Column(Float, default=0.0)
    sadness_avg = Column(Float, default=0.0)
    anger_avg = Column(Float, default=0.0)
    fear_avg = Column(Float, default=0.0)
    optimism_avg = Column(Float, default=0.0)
    
    # Aggregated audio features
    energy_avg = Column(Float, nullable=True)
    valence_avg = Column(Float, nullable=True)
    tempo_avg = Column(Float, nullable=True)
    
    # Metadata
    track_count = Column(Integer, default=0)
    listening_minutes = Column(Float, default=0.0)
    confidence = Column(Float, default=1.0)
    top_tracks = Column(JSON, nullable=True)  # List of top track IDs
    top_emotions = Column(JSON, nullable=True)  # Dominant emotions
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="daily_moods")
    
    def __repr__(self):
        return f"<DailyMood(user_id={self.user_id}, day={self.day}, polarity_avg={self.polarity_avg})>"


class MoodCheckin(Base):
    """User-reported mood for validation"""
    __tablename__ = "mood_checkins"
    
    checkin_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(255), ForeignKey("users.user_id"), nullable=False, index=True)
    day = Column(DateTime(timezone=True), nullable=False, index=True)
    mood_1to5 = Column(Integer, nullable=False)  # 1=very negative, 5=very positive
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="mood_checkins")
    
    def __repr__(self):
        return f"<MoodCheckin(user_id={self.user_id}, day={self.day}, mood={self.mood_1to5})>"
