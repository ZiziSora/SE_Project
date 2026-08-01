from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import CORS_ORIGINS
from app.routers.events import router as events_router

app = FastAPI(title="Smart University Event Ecosystem API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events_router)


@app.get("/")
def read_root():
    return {"message": "Welcome to Smart University Event Ecosystem API"}
