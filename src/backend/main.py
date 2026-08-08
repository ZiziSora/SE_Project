from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routers import categories, events, uploads

app = FastAPI(
    title="UniEvent API",
    description="Backend quản lý sự kiện trường học — vai trò Ban tổ chức.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events.router)
app.include_router(categories.router)
app.include_router(uploads.router)


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError):
    """Gộp lỗi validate của Pydantic thành 1 câu tiếng Việt cho frontend hiển thị."""
    messages: list[str] = []
    for err in exc.errors():
        msg = err.get("msg", "")
        messages.append(msg.replace("Value error, ", ""))
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": " ".join(messages) or "Dữ liệu không hợp lệ."},
    )


@app.get("/api/health", tags=["system"])
def health():
    return {"status": "ok", "service": "unievent-api"}