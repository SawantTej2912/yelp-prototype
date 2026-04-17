from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import reviews

app = FastAPI(title="Review Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reviews.router, prefix="/reviews", tags=["reviews"])

@app.get("/")
def root():
    return {"message": "Review Service is running"}
