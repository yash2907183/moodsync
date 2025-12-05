"""
Quick test script to verify MoodSync setup
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

def test_imports():
    """Test that all required packages are installed"""
    print("🔍 Testing imports...")
    try:
        import fastapi
        import sqlalchemy
        import transformers
        import spotipy
        import lyricsgenius
        import redis
        print("✅ All required packages imported successfully")
        return True
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False

def test_database():
    """Test database connection"""
    print("\n🔍 Testing database connection...")
    try:
        from app.models import engine
        from sqlalchemy import text
        
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            result.fetchone()
        print("✅ Database connection successful")
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

def test_redis():
    """Test Redis connection"""
    print("\n🔍 Testing Redis connection...")
    try:
        import redis
        r = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"))
        r.ping()
        print("✅ Redis connection successful")
        return True
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        return False

def test_sentiment_analyzer():
    """Test sentiment analyzer"""
    print("\n🔍 Testing sentiment analyzer...")
    try:
        from app.services.sentiment import get_sentiment_analyzer
        
        analyzer = get_sentiment_analyzer(use_gpu=False)
        result = analyzer.analyze_comprehensive("I love this happy song", use_all_models=False)
        
        if result and "polarity" in result:
            print(f"✅ Sentiment analyzer working (polarity: {result['polarity']:.2f})")
            return True
        else:
            print("❌ Sentiment analyzer returned invalid result")
            return False
    except Exception as e:
        print(f"❌ Sentiment analyzer failed: {e}")
        return False

def test_spotify_service():
    """Test Spotify service initialization"""
    print("\n🔍 Testing Spotify service...")
    try:
        from app.services.spotify import get_spotify_service
        
        service = get_spotify_service()
        if service.client_id and service.client_secret:
            print("✅ Spotify service initialized")
            return True
        else:
            print("❌ Spotify credentials not found")
            return False
    except Exception as e:
        print(f"❌ Spotify service failed: {e}")
        return False

def test_lyrics_service():
    """Test lyrics service initialization"""
    print("\n🔍 Testing lyrics service...")
    try:
        from app.services.lyrics import get_lyrics_service
        
        service = get_lyrics_service()
        if service.genius:
            print("✅ Lyrics service initialized")
            return True
        else:
            print("⚠️  Lyrics service initialized but Genius token not found")
            return True  # Not critical
    except Exception as e:
        print(f"❌ Lyrics service failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 MoodSync Setup Verification")
    print("=" * 50)
    
    tests = [
        ("Imports", test_imports),
        ("Database", test_database),
        ("Redis", test_redis),
        ("Sentiment Analyzer", test_sentiment_analyzer),
        ("Spotify Service", test_spotify_service),
        ("Lyrics Service", test_lyrics_service),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            success = test_func()
            results.append((name, success))
        except Exception as e:
            print(f"\n❌ Unexpected error in {name}: {e}")
            results.append((name, False))
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Summary")
    print("=" * 50)
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    for name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
    
    print(f"\n📈 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! You're ready to run MoodSync!")
        print("\n💡 Next steps:")
        print("   python scripts/init_db.py  # Initialize database")
        print("   uvicorn app.main:app --reload  # Start the API server")
    else:
        print("\n⚠️  Some tests failed. Please check the errors above.")
        print("\n💡 Common fixes:")
        print("   - Ensure PostgreSQL and Redis are running")
        print("   - Check .env file has all required variables")
        print("   - Run: pip install -r requirements.txt")

if __name__ == "__main__":
    main()
