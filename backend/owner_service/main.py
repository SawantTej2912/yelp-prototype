"""Owner service: restaurant claim and owner dashboard data."""
import shared.models  # noqa: F401
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from shared.database import Base, engine
from owner_service.routers.owner import owner_router, restaurant_claim_router

app = FastAPI(title="Yelp Prototype — Owner Service", version="1.0.0")

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

app.include_router(restaurant_claim_router)
app.include_router(owner_router)


@app.get("/")
def root():
    return {"message": "Yelp Prototype owner_service is running", "service": "owner_service"}
