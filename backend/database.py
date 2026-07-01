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
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False, "timeout": 30}
    )
else:
    # SQLAlchemy 1.4+ requires "postgresql://" instead of "postgres://"
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
    elif DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
        
    SQLALCHEMY_DATABASE_URL = DATABASE_URL
    # For PostgreSQL (Supabase/Neon), we do NOT pass check_same_thread
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        connect_args={"connect_timeout": 10},
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

from sqlalchemy import text

def upgrade_db_schema(engine):
    with engine.begin() as conn:
        # Check and add columns to user_stats table
        columns_to_add = [
            ("time_spent_studying", "INTEGER DEFAULT 0"),
            ("success_generations", "INTEGER DEFAULT 0"),
            ("failed_generations", "INTEGER DEFAULT 0"),
            ("processing_status", "VARCHAR DEFAULT 'Idle'")
        ]
        for col_name, col_type in columns_to_add:
            try:
                conn.execute(text(f"ALTER TABLE user_stats ADD COLUMN {col_name} {col_type}"))
                print(f"Database upgrade: Added column '{col_name}' to 'user_stats' table.")
            except Exception as e:
                # Column likely already exists
                pass

