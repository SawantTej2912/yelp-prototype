"""User service: authentication, user profiles, preferences, AI assistant."""
import shared.models  # noqa: F401
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from user_service.routers import auth, users, ai_assistant

app = FastAPI(title="Yelp Prototype — User Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# backend/uploads
uploads_dir = Path(__file__).resolve().parent.parent / "uploads"
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(ai_assistant.router)


@app.get("/")
def root():
    return {"message": "Yelp Prototype user_service is running", "service": "user_service"}
