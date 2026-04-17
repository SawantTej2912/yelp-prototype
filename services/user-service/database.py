import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "yelp_lab2")

client = AsyncIOMotorClient(MONGO_URL)
db = client[MONGO_DB_NAME]

users_collection = db["users"]
sessions_collection = db["sessions"]
