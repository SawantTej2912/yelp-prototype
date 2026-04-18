import json
import asyncio
from datetime import datetime
from bson import ObjectId
from kafka.consumer import create_consumer
from kafka.producer import send_event
from database import reviews_collection, restaurants_collection, booking_status_collection


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

    print(f"[worker] Updated restaurant summary for restaurant_id={restaurant_id} avg_rating={round(avg_rating, 2)} review_count={review_count}")


async def publish_and_store_status(operation: str, status: str, payload: dict, message: str):
    status_doc = {
        "operation": operation,
        "status": status,
        "message": message,
        "payload": payload,
        "created_at": datetime.utcnow()
    }

    await booking_status_collection.insert_one(status_doc)

    event_payload = {
        "operation": operation,
        "status": status,
        "message": message,
        "payload": payload,
        "created_at": datetime.utcnow().isoformat()
    }

    await send_event("booking.status", event_payload)
    print(f"[worker] Published booking.status -> {event_payload}")


async def process_message(topic: str, payload: dict):
    print(f"[worker] Processing topic={topic} payload={payload}")

    try:
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
            result = await reviews_collection.insert_one(review_doc)
            await update_restaurant_rating_summary(payload["restaurant_id"])

            await publish_and_store_status(
                operation="review.created",
                status="completed",
                payload={
                    "review_id": str(result.inserted_id),
                    "restaurant_id": payload["restaurant_id"],
                    "user_id": payload["user_id"]
                },
                message="Review created successfully"
            )

            print("[worker] Review created successfully")

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

                await publish_and_store_status(
                    operation="review.updated",
                    status="completed",
                    payload={
                        "review_id": review_id,
                        "restaurant_id": existing_review["restaurant_id"]
                    },
                    message="Review updated successfully"
                )

                print("[worker] Review updated successfully")
            else:
                await publish_and_store_status(
                    operation="review.updated",
                    status="failed",
                    payload={"review_id": review_id},
                    message="Review not found for update"
                )
                print(f"[worker] Review not found for update review_id={review_id}")

        elif topic == "review.deleted":
            review_id = payload["review_id"]
            existing_review = await reviews_collection.find_one({"_id": ObjectId(review_id)})
            if existing_review:
                await reviews_collection.delete_one({"_id": ObjectId(review_id)})
                await update_restaurant_rating_summary(existing_review["restaurant_id"])

                await publish_and_store_status(
                    operation="review.deleted",
                    status="completed",
                    payload={
                        "review_id": review_id,
                        "restaurant_id": existing_review["restaurant_id"]
                    },
                    message="Review deleted successfully"
                )

                print("[worker] Review deleted successfully")
            else:
                await publish_and_store_status(
                    operation="review.deleted",
                    status="failed",
                    payload={"review_id": review_id},
                    message="Review not found for delete"
                )
                print(f"[worker] Review not found for delete review_id={review_id}")

        else:
            print(f"[worker] Unknown topic received: {topic}")

    except Exception as e:
        await publish_and_store_status(
            operation=topic,
            status="failed",
            payload=payload,
            message=f"Worker processing error: {str(e)}"
        )
        print(f"[worker] Error while processing topic={topic}: {e}")


async def consume_messages():
    print("[worker] Starting Kafka consumer...")
    consumer = await create_consumer()
    print("[worker] Kafka consumer started successfully")

    try:
        async for message in consumer:
            topic = message.topic
            payload = json.loads(message.value.decode("utf-8"))
            await process_message(topic, payload)
    except Exception as e:
        print(f"[worker] Error while consuming messages: {e}")
    finally:
        print("[worker] Stopping Kafka consumer...")
        await consumer.stop()


if __name__ == "__main__":
    asyncio.run(consume_messages())
