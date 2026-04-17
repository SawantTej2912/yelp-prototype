from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import restaurants

app = FastAPI(title="Owner Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(restaurants.router, prefix="/owner/restaurants", tags=["owner-restaurants"])

@app.get("/")
def root():
    return {"message": "Owner Service is running"}
