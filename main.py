"""
Main FastAPI application
"""
import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events
    """
    # Startup
    logger.info("Starting MoodSync application...")
    
    # Initialize database
    from app.models import init_db
    try:
        init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
    
    # Initialize sentiment analyzer (load models)
    try:
        from app.services.sentiment import get_sentiment_analyzer
        use_gpu = os.getenv("USE_GPU", "False").lower() == "true"
        analyzer = get_sentiment_analyzer(use_gpu=use_gpu)
        logger.info("Sentiment analyzer initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing sentiment analyzer: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down MoodSync application...")


# Create FastAPI application
app = FastAPI(
    title="MoodSync API",
    description="Personalized Music Sentiment Analysis and Mood Prediction",
    version=os.getenv("API_VERSION", "v1"),
    lifespan=lifespan
)

# Configure CORS
origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:8000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add GZip compression
app.add_middleware(GZipMiddleware, minimum_size=1000)


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "MoodSync API",
        "version": os.getenv("API_VERSION", "v1")
    }


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Welcome to MoodSync API",
        "description": "Personalized Music Sentiment Analysis and Mood Prediction",
        "docs_url": "/docs",
        "health_check": "/health"
    }


# Import and include routers
from app.api import auth, tracks, analysis, insights, mood

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(tracks.router, prefix="/api/tracks", tags=["Tracks"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(insights.router, prefix="/api/insights", tags=["Insights"])
app.include_router(mood.router, prefix="/api/mood", tags=["Mood"])


if __name__ == "__main__":
    import uvicorn
    
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    reload = os.getenv("RELOAD", "True").lower() == "true"
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=reload,
        log_level=os.getenv("LOG_LEVEL", "info").lower()
    )
