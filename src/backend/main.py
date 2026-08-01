from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import router từ file events.py
from app.routers.events import router as events_router

app = FastAPI()

# Cấu hình CORS để cho phép Frontend kết nối
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Nhúng router xử lý sự kiện vào app chính
app.include_router(events_router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Smart University Event Ecosystem API"}