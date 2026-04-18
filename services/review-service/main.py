from fastapi import FastAPI
from routers import reviews

app = FastAPI()

app.include_router(reviews.router, prefix="/reviews", tags=["reviews"])


@app.get("/")
async def root():
    return {"message": "Review service is running"}
