from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import restaurants

app = FastAPI(title="Restaurant Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(restaurants.router, prefix="/restaurants", tags=["restaurants"])

@app.get("/")
def root():
    return {"message": "Restaurant Service is running"}
