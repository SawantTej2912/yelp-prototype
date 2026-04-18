from fastapi import FastAPI
from routers import restaurants

app = FastAPI()

app.include_router(restaurants.router, prefix="/restaurants", tags=["restaurants"])


@app.get("/")
async def root():
    return {"message": "Restaurant service is running"}
