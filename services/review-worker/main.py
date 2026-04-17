import json
from datetime import datetime
from bson import ObjectId
from kafka.consumer import create_consumer
from database import reviews_collection, restaurants_collection


async def update_restaurant_rating_summary(restaurant_id: str):
    ratings = []
    async for review in reviews_collection.find({"restaurant_id": restaurant_id}):
        ratings.append(review.get("rating", 0))

    review_count = len(ratings)
    avg_rating = sum(ratings) / review_count if review_count > 0 else 0

    await restaurants_collection.update_one(
        {"_id": ObjectId(restaurant_id)},
        {
            "$set": {
                "review_count": review_count,
                "avg_rating": round(avg_rating, 2),
                "updated_at": datetime.utcnow()
            }
        }
    )


async def process_message(topic: str, payload: dict):
    if topic == "review.created":
        review_doc = {
            "user_id": payload["user_id"],
            "restaurant_id": payload["restaurant_id"],
            "rating": payload["rating"],
            "comment": payload.get("comment", ""),
            "status": "completed",
            "created_at": datetime.utcnow(),
            "updated_at": None
        }
        await reviews_collection.insert_one(review_doc)
        await update_restaurant_rating_summary(payload["restaurant_id"])

    elif topic == "review.updated":
        review_id = payload["review_id"]
        update_data = {
            "updated_at": datetime.utcnow()
        }

        if "rating" in payload:
            update_data["rating"] = payload["rating"]
        if "comment" in payload:
            update_data["comment"] = payload["comment"]

        existing_review = await reviews_collection.find_one({"_id": ObjectId(review_id)})
        if existing_review:
            await reviews_collection.update_one(
                {"_id": ObjectId(review_id)},
                {"$set": update_data}
            )
            await update_restaurant_rating_summary(existing_review["restaurant_id"])

    elif topic == "review.deleted":
        review_id = payload["review_id"]
        existing_review = await reviews_collection.find_one({"_id": ObjectId(review_id)})
        if existing_review:
            await reviews_collection.delete_one({"_id": ObjectId(review_id)})
            await update_restaurant_rating_summary(existing_review["restaurant_id"])


async def consume_messages():
    consumer = await create_consumer()
    try:
        async for message in consumer:
            topic = message.topic
            payload = json.loads(message.value.decode("utf-8"))
            await process_message(topic, payload)
    finally:
        await consumer.stop()
