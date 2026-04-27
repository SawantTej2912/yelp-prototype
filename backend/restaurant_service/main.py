"""Restaurant service: listings, search, photos, CRUD (excludes claim — see owner_service)."""
import shared.models  # noqa: F401
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from restaurant_service.routers import restaurants

app = FastAPI(title="Yelp Prototype — Restaurant Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

uploads_dir = Path(__file__).resolve().parent.parent / "uploads"
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

app.include_router(restaurants.router)


@app.get("/")
def root():
    return {"message": "Yelp Prototype restaurant_service is running", "service": "restaurant_service"}
