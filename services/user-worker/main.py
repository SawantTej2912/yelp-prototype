import json
import asyncio
from datetime import datetime
from bson import ObjectId
from passlib.context import CryptContext
from kafka.consumer import create_consumer
from database import users_collection, activity_logs_collection

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def log_activity(user_id: str, action: str, details: str):
    await activity_logs_collection.insert_one({
        "user_id": user_id,
        "action": action,
        "details": details,
        "created_at": datetime.utcnow()
    })


def ensure_password_hash(raw_value: str) -> str:
    raw_value = raw_value or ""
    if raw_value.startswith("$2a$") or raw_value.startswith("$2b$") or raw_value.startswith("$2y$"):
        return raw_value
    return pwd_context.hash(raw_value)


async def process_message(topic: str, payload: dict):
    print(f"[user-worker] Processing topic={topic} payload={payload}")

    if topic == "user.created":
        user_doc = {
            "name": payload.get("name", ""),
            "email": payload.get("email", ""),
            "password_hash": ensure_password_hash(payload.get("password_hash") or payload.get("password", "")),
            "role": payload.get("role", "user"),
            "phone": payload.get("phone", ""),
            "profile_pic": payload.get("profile_pic", ""),
            "about_me": payload.get("about_me", ""),
            "city": payload.get("city", ""),
            "state": payload.get("state", ""),
            "country": payload.get("country", ""),
            "preferences": payload.get("preferences", {
                "cuisine_prefs": [],
                "price_range": "",
                "dietary_needs": [],
                "ambiance_prefs": [],
                "preferred_location": "",
                "search_radius": 10,
                "sort_preference": "rating"
            }),
            "created_at": datetime.utcnow(),
            "updated_at": None
        }

        result = await users_collection.insert_one(user_doc)
        await log_activity(
            str(result.inserted_id),
            "user_created",
            f"User '{payload.get('email', '')}' created through Kafka worker"
        )
        print("[user-worker] User created successfully")

    elif topic == "user.updated":
        user_id = payload.get("user_id")
        if user_id and ObjectId.is_valid(user_id):
            existing = await users_collection.find_one({"_id": ObjectId(user_id)})
            if existing:
                update_data = {
                    "updated_at": datetime.utcnow()
                }

                for field in [
                    "name", "phone", "profile_pic", "about_me",
                    "city", "state", "country", "role"
                ]:
                    if field in payload:
                        update_data[field] = payload[field]

                if "preferences" in payload:
                    update_data["preferences"] = payload["preferences"]

                await users_collection.update_one(
                    {"_id": ObjectId(user_id)},
                    {"$set": update_data}
                )

                await log_activity(
                    user_id,
                    "user_updated",
                    f"User '{existing.get('email', '')}' updated through Kafka worker"
                )
                print("[user-worker] User updated successfully")
            else:
                print(f"[user-worker] User not found for update user_id={user_id}")
        else:
            print("[user-worker] Invalid or missing user_id for update")

    else:
        print(f"[user-worker] Unknown topic received: {topic}")


async def consume_messages():
    print("[user-worker] Starting Kafka consumer...")
    consumer = await create_consumer()
    print("[user-worker] Kafka consumer started successfully")

    try:
        async for message in consumer:
            topic = message.topic
            payload = json.loads(message.value.decode("utf-8"))
            await process_message(topic, payload)
    except Exception as e:
        print(f"[user-worker] Error while consuming messages: {e}")
    finally:
        print("[user-worker] Stopping Kafka consumer...")
        await consumer.stop()


if __name__ == "__main__":
    asyncio.run(consume_messages())
