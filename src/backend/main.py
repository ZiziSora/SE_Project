import os
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from datetime import datetime, timezone, timedelta

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
        # Lấy thông tin đăng ký và ngày bắt đầu của sự kiện
        reg_res = (
            supabase_client.table("event_registrations")
            .select("registration_id, registration_status, events(start_time)")
            .eq("registration_id", registration_id)
            .execute()
        )
        
        if not reg_res.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy thông tin đăng ký.")
            
        reg_info = reg_res.data[0]
        event_info = reg_info.get("events") or {}
        if isinstance(event_info, list) and len(event_info) > 0:
            event_info = event_info[0]

        start_time_str = event_info.get("start_time") if isinstance(event_info, dict) else None

        if start_time_str:
            try:
                start_time = datetime.fromisoformat(start_time_str.replace("Z", "+00:00"))
                if start_time.tzinfo is None:
                    start_time = start_time.replace(tzinfo=timezone.utc)

                now = datetime.now(timezone.utc)
                if (start_time - now) < timedelta(days=5):
                    raise HTTPException(
                        status_code=400,
                        detail="Chỉ có thể hủy đăng ký trước khi sự kiện diễn ra ít nhất 5 ngày."
                    )
            except ValueError:
                pass

        response = (
            supabase_client.table("event_registrations")
            .update({"registration_status": "CANCELLED"})
            .eq("registration_id", registration_id)
            .execute()
        )
        return {"message": "Registration cancelled successfully", "data": response.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))