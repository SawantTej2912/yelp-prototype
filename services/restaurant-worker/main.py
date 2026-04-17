import json
import asyncio
from datetime import datetime
from bson import ObjectId
from kafka.consumer import create_consumer
from database import restaurants_collection, activity_logs_collection


async def log_activity(restaurant_id: str, action: str, details: str):
    await activity_logs_collection.insert_one({
        "restaurant_id": restaurant_id,
        "action": action,
        "details": details,
        "created_at": datetime.utcnow()
    })


async def process_message(topic: str, payload: dict):
    print(f"[restaurant-worker] Processing topic={topic} payload={payload}")

    if topic == "restaurant.created":
        restaurant_doc = {
            "name": payload.get("name", ""),
            "description": payload.get("description", ""),
            "cuisine_type": payload.get("cuisine_type", ""),
            "address": payload.get("address", ""),
            "city": payload.get("city", ""),
            "state": payload.get("state", ""),
            "zip_code": payload.get("zip_code", ""),
            "contact_info": payload.get("contact_info", ""),
            "hours": payload.get("hours", ""),
            "pricing_tier": payload.get("pricing_tier", ""),
            "amenities": payload.get("amenities", []),
            "owner_id": payload.get("owner_id", ""),
            "added_by": payload.get("added_by", ""),
            "avg_rating": 0,
            "review_count": 0,
            "view_count": 0,
            "photos": [],
            "activity_logs": [],
            "created_at": datetime.utcnow(),
            "updated_at": None
        }

        result = await restaurants_collection.insert_one(restaurant_doc)
        await log_activity(
            str(result.inserted_id),
            "restaurant_created",
            f"Restaurant '{payload.get('name', '')}' created through Kafka worker"
        )
        print("[restaurant-worker] Restaurant created successfully")

    elif topic == "restaurant.updated":
        restaurant_id = payload.get("restaurant_id")
        if restaurant_id and ObjectId.is_valid(restaurant_id):
            update_data = {
                "updated_at": datetime.utcnow()
            }

            for field in [
                "name", "description", "cuisine_type", "address", "city",
                "state", "zip_code", "contact_info", "hours", "pricing_tier",
                "amenities", "owner_id", "added_by"
            ]:
                if field in payload:
                    update_data[field] = payload[field]

            existing = await restaurants_collection.find_one({"_id": ObjectId(restaurant_id)})
            if existing:
                await restaurants_collection.update_one(
                    {"_id": ObjectId(restaurant_id)},
                    {"$set": update_data}
                )
                await log_activity(
                    restaurant_id,
                    "restaurant_updated",
                    f"Restaurant '{existing.get('name', '')}' updated through Kafka worker"
                )
                print("[restaurant-worker] Restaurant updated successfully")
            else:
                print(f"[restaurant-worker] Restaurant not found for update restaurant_id={restaurant_id}")
        else:
            print("[restaurant-worker] Invalid or missing restaurant_id for update")

    elif topic == "restaurant.claimed":
        restaurant_id = payload.get("restaurant_id")
        owner_id = payload.get("owner_id", "")

        if restaurant_id and ObjectId.is_valid(restaurant_id):
            existing = await restaurants_collection.find_one({"_id": ObjectId(restaurant_id)})
            if existing:
                await restaurants_collection.update_one(
                    {"_id": ObjectId(restaurant_id)},
                    {
                        "$set": {
                            "owner_id": owner_id,
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                await log_activity(
                    restaurant_id,
                    "restaurant_claimed",
                    f"Restaurant '{existing.get('name', '')}' claimed by owner '{owner_id}'"
                )
                print("[restaurant-worker] Restaurant claimed successfully")
            else:
                print(f"[restaurant-worker] Restaurant not found for claim restaurant_id={restaurant_id}")
        else:
            print("[restaurant-worker] Invalid or missing restaurant_id for claim")

    else:
        print(f"[restaurant-worker] Unknown topic received: {topic}")


async def consume_messages():
    print("[restaurant-worker] Starting Kafka consumer...")
    consumer = await create_consumer()
    print("[restaurant-worker] Kafka consumer started successfully")

    try:
        async for message in consumer:
            topic = message.topic
            payload = json.loads(message.value.decode("utf-8"))
            await process_message(topic, payload)
    except Exception as e:
        print(f"[restaurant-worker] Error while consuming messages: {e}")
    finally:
        print("[restaurant-worker] Stopping Kafka consumer...")
        await consumer.stop()


if __name__ == "__main__":
    asyncio.run(consume_messages())
