"""
Initialize database tables
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))

from app.models import init_db, engine
from sqlalchemy import inspect


def check_tables():
    """Check which tables exist in the database"""
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    return tables


def main():
    """Main initialization function"""
    print("🚀 MoodSync Database Initialization")
    print("=" * 50)
    
    # Check existing tables
    existing_tables = check_tables()
    if existing_tables:
        print(f"\n⚠️  Found existing tables: {', '.join(existing_tables)}")
        response = input("Do you want to continue? This will create any missing tables. (y/n): ")
        if response.lower() != 'y':
            print("❌ Initialization cancelled")
            return
    
    # Initialize database
    print("\n📊 Creating database tables...")
    try:
        init_db()
        print("✅ Database tables created successfully!")
        
        # List created tables
        tables = check_tables()
        print(f"\n📋 Available tables:")
        for table in sorted(tables):
            print(f"   - {table}")
        
        print("\n🎉 Database initialization complete!")
        print("\n💡 Next steps:")
        print("   1. Run the application: uvicorn app.main:app --reload")
        print("   2. Visit http://localhost:8000/docs for API documentation")
        print("   3. Start syncing your music data!")
        
    except Exception as e:
        print(f"\n❌ Error initializing database: {e}")
        print("\n💡 Troubleshooting:")
        print("   1. Check that PostgreSQL is running")
        print("   2. Verify DATABASE_URL in .env file")
        print("   3. Ensure database and user exist")
        sys.exit(1)


if __name__ == "__main__":
    main()
