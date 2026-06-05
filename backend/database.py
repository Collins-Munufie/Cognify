import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv(override=True)

# Get the database URL from the environment
DATABASE_URL = os.getenv("DATABASE_URL")

# If no DATABASE_URL is provided, fallback to local SQLite for development
if not DATABASE_URL:
    SQLALCHEMY_DATABASE_URL = "sqlite:///./flashcards.db"
    # connect_args={"check_same_thread": False} is needed only for SQLite
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    # SQLAlchemy 1.4+ requires "postgresql://" instead of "postgres://"
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
    elif DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
        
    SQLALCHEMY_DATABASE_URL = DATABASE_URL
    # For PostgreSQL (Supabase/Neon), we do NOT pass check_same_thread
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
