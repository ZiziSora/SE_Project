import os
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client

# Load .env file from backend/.env or root
backend_env_path = Path(__file__).resolve().parent.parent.parent / "backend" / ".env"
if backend_env_path.exists():
    load_dotenv(dotenv_path=backend_env_path)
else:
    load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = (
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    or os.getenv("SUPABASE_SECRET_KEY")
    or os.getenv("SUPABASE_PUBLISHED_KEY")
    or ""
)

app = FastAPI(title="Smart University Event Ecosystem API")

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase_client: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    print("Warning: Supabase credentials not fully configured.")

@app.get("/")
def read_root():
    return {"message": "Welcome to Smart University Event Ecosystem API"}

@app.get("/api/my-events")
def get_my_events():
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client is not configured.")
    try:
        response = (
            supabase_client.table("event_registrations")
            .select(
                """
                registration_id,
                user_id,
                event_id,
                registration_status,
                created_at,
                events (
                  event_id,
                  title,
                  description,
                  location,
                  start_time,
                  end_time,
                  registration_deadline,
                  capacity,
                  event_status,
                  banner_url,
                  event_categories (
                    category_id,
                    name
                  )
                )
                """
            )
            .order("created_at", desc=True)
            .execute()
        )
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/registrations/{registration_id}/cancel")
def cancel_registration(registration_id: str):
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client is not configured.")
    try:
        response = (
            supabase_client.table("event_registrations")
            .update({"registration_status": "CANCELLED"})
            .eq("registration_id", registration_id)
            .execute()
        )
        return {"message": "Registration cancelled successfully", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))