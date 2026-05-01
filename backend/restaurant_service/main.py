"""Restaurant service: listings, search, photos, CRUD (excludes claim — see owner_service)."""
import shared.models  # noqa: F401
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from shared.database import Base, engine
from restaurant_service.routers import restaurants

app = FastAPI(title="Yelp Prototype — Restaurant Service", version="1.0.0")

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://afd618d55ea6c4f489ba944dd942a1ae-542582531.us-east-1.elb.amazonaws.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

uploads_dir = Path(__file__).resolve().parent.parent / "uploads"
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")


@app.on_event("startup")
def init_mysql_schema():
    Base.metadata.create_all(bind=engine)

app.include_router(restaurants.router)


@app.get("/")
def root():
    return {"message": "Yelp Prototype restaurant_service is running", "service": "restaurant_service"}
