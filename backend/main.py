from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from routers import auth, users, restaurants

app = FastAPI(title="Yelp Prototype API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Static file serving for uploaded images ─────────────────────────────────
uploads_dir = Path(__file__).parent / "uploads"
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

# ─── Routers ─────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(restaurants.router)

# Future routers (uncomment as phases are implemented):
# app.include_router(reviews.router)
# app.include_router(favorites.router)
# app.include_router(chat.router)


@app.get("/")
def root():
    return {"message": "Yelp Prototype API is running"}