from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
from supabase import create_client, Client
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
SUPBASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_JWT_KEY = os.getenv("SUPABASE_JWT_KEY")
SUPABASE_PUBLISHED_KEY = os.getenv("SUPABASE_PUBLISHED_KEY")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")

if not all([DATABASE_URL, SUPABASE_PUBLISHED_KEY, SUPABASE_JWT_KEY, SUPBASE_URL, SUPABASE_SECRET_KEY]):
    raise EnvironmentError("One or more environment variables are missing.")

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try: 
        yield db
    finally:
        db.close()


supabase: Client = create_client(SUPBASE_URL, SUPABASE_SECRET_KEY)