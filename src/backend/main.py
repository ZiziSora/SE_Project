from fastapi import FastAPI, Depends
from app.core.auth import get_current_user
from app.routers.auth_router import router as auth_router

app = FastAPI(title="Smart University Event Ecosystem API")

# Đăng ký routers
app.include_router(auth_router)


@app.get("/")
def read_root():
    return {"message": "Welcome to Smart University Event Ecosystem API"}


@app.get("/me")
def get_me(user: dict = Depends(get_current_user)):
    return {
        "user_id": user.get("sub"),
        "email": user.get("email"),
        "role": user.get("role"),
    }