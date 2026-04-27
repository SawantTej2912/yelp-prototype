"""
Local development monolith: mounts all microservice routers on one process
so the existing frontend (single API base URL) continues to work.

Run from the `backend` directory:
  uvicorn main:app --reload

Or run each service separately (different ports), e.g.:
  uvicorn user_service.main:app --port 8001
  uvicorn restaurant_service.main:app --port 8002
  ...
"""
import shared.models  # noqa: F401
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from user_service.routers import auth, users, ai_assistant
from restaurant_service.routers import restaurants
from review_service.routers import reviews
from owner_service.routers.owner import owner_router, restaurant_claim_router

app = FastAPI(title="Yelp Prototype API (all services)", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

uploads_dir = Path(__file__).resolve().parent / "uploads"
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(restaurants.router)
app.include_router(restaurant_claim_router)
app.include_router(reviews.router)
app.include_router(owner_router)
app.include_router(ai_assistant.router)


@app.get("/")
def root():
    return {
        "message": "Yelp Prototype API is running",
        "mode": "dev_monolith",
        "services": [
            "user_service",
            "restaurant_service",
            "owner_service (claim + /owner/*)",
            "review_service",
        ],
    }
