"""
Database configuration and session management
"""
import os
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool

from app.models.database import Base


# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://moodsync_user:moodsync_password_123@localhost:5432/moodsync")

# Create engine with connection pooling
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=int(os.getenv("DB_POOL_SIZE", 20)),
    max_overflow=int(os.getenv("DB_MAX_OVERFLOW", 10)),
    pool_pre_ping=True,
    echo=os.getenv("DEBUG_SQL", "False").lower() == "true"
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Dependency function to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Initialize database by creating all tables."""
    Base.metadata.create_all(bind=engine)


def drop_db() -> None:
    """Drop all tables."""
    Base.metadata.drop_all(bind=engine)