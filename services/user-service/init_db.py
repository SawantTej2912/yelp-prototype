from database import sessions_collection
import asyncio

async def create_indexes():
    await sessions_collection.create_index("expires_at", expireAfterSeconds=0)

if __name__ == "__main__":
    asyncio.run(create_indexes())
