import json
import asyncio
from datetime import datetime
from bson import ObjectId
from kafka.consumer import create_consumer
from database import users_collection, activity_logs_collection


async def log_activity(user_id: str, action: str, details: str):
    await activity_logs_collection.insert_one({
        "user_id": user_id,
        "action": action,
        "details": details,
        "created_at": datetime.utcnow()
    })


async def process_message(topic: str, payload: dict):
    print(f"[user-worker] Processing topic={topic} payload={payload}")

    if topic == "user.created":

        # 🔥 FIX: support both password and password_hash
        password_hash = payload.get("password_hash") or payload.get("password")

        if not password_hash:
            print("[user-worker] ERROR: No password or password_hash provided")
            return

        user_doc = {
            "name": payload.get("name", ""),
            "email": payload.get("email", ""),
            "password_hash": password_hash,
            "role": payload.get("role", "user"),
            "phone": payload.get("phone", ""),
            "profile_pic": payload.get("profile_pic", ""),
            "about_me": payload.get("about_me", ""),
            "city": payload.get("city", ""),
            "state": payload.get("state", ""),
            "country": payload.get("country", ""),
            "preferences": payload.get("preferences", {}),
            "created_at": datetime.utcnow(),
            "updated_at": None
        }

        print("[user-worker] Inserting user into MongoDB...")
        result = await users_collection.insert_one(user_doc)

        await log_activity(
            str(result.inserted_id),
            "user_created",
            f"User '{payload.get('email', '')}' created"
        )

        print("[user-worker] User created successfully")

    elif topic == "user.updated":
        user_id = payload.get("user_id")

        if user_id and ObjectId.is_valid(user_id):
            await users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {**payload, "updated_at": datetime.utcnow()}}
            )
            print("[user-worker] User updated successfully")

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
        await consumer.stop()


if __name__ == "__main__":
    asyncio.run(consume_messages())
