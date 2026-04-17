from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from bson import ObjectId
from database import reviews_collection, restaurants_collection

router = APIRouter()


class ReviewCreate(BaseModel):
    user_id: str
    restaurant_id: str
    rating: int
    comment: Optional[str] = ""


class ReviewUpdate(BaseModel):
    rating: Optional[int] = None
    comment: Optional[str] = None


def serialize_review(review):
    return {
        "id": str(review["_id"]),
        "user_id": review.get("user_id", ""),
        "restaurant_id": review.get("restaurant_id", ""),
        "rating": review.get("rating", 0),
        "comment": review.get("comment", ""),
        "status": review.get("status", "completed"),
        "created_at": review.get("created_at").isoformat() if review.get("created_at") else None,
        "updated_at": review.get("updated_at").isoformat() if review.get("updated_at") else None
    }


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


@router.post("/")
async def create_review(payload: ReviewCreate):
    if not ObjectId.is_valid(payload.restaurant_id):
        raise HTTPException(status_code=400, detail="Invalid restaurant id")

    if payload.rating < 1 or payload.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    restaurant = await restaurants_collection.find_one({"_id": ObjectId(payload.restaurant_id)})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    review_doc = {
        "user_id": payload.user_id,
        "restaurant_id": payload.restaurant_id,
        "rating": payload.rating,
        "comment": payload.comment,
        "status": "completed",
        "created_at": datetime.utcnow(),
        "updated_at": None
    }

    result = await reviews_collection.insert_one(review_doc)
    created_review = await reviews_collection.find_one({"_id": result.inserted_id})

    await update_restaurant_rating_summary(payload.restaurant_id)

    return {
        "message": "Review created successfully",
        "review": serialize_review(created_review)
    }


@router.get("/")
async def get_all_reviews():
    reviews = []
    async for review in reviews_collection.find():
        reviews.append(serialize_review(review))
    return reviews


@router.get("/restaurant/{restaurant_id}")
async def get_reviews_by_restaurant(restaurant_id: str):
    if not ObjectId.is_valid(restaurant_id):
        raise HTTPException(status_code=400, detail="Invalid restaurant id")

    reviews = []
    async for review in reviews_collection.find({"restaurant_id": restaurant_id}):
        reviews.append(serialize_review(review))

    return {
        "restaurant_id": restaurant_id,
        "reviews": reviews
    }


@router.put("/{review_id}")
async def update_review(review_id: str, payload: ReviewUpdate):
    if not ObjectId.is_valid(review_id):
        raise HTTPException(status_code=400, detail="Invalid review id")

    existing_review = await reviews_collection.find_one({"_id": ObjectId(review_id)})
    if not existing_review:
        raise HTTPException(status_code=404, detail="Review not found")

    update_data = {k: v for k, v in payload.dict().items() if v is not None}

    if "rating" in update_data:
        if update_data["rating"] < 1 or update_data["rating"] > 5:
            raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    update_data["updated_at"] = datetime.utcnow()

    await reviews_collection.update_one(
        {"_id": ObjectId(review_id)},
        {"$set": update_data}
    )

    updated_review = await reviews_collection.find_one({"_id": ObjectId(review_id)})

    await update_restaurant_rating_summary(existing_review["restaurant_id"])

    return {
        "message": "Review updated successfully",
        "review": serialize_review(updated_review)
    }


@router.delete("/{review_id}")
async def delete_review(review_id: str):
    if not ObjectId.is_valid(review_id):
        raise HTTPException(status_code=400, detail="Invalid review id")

    existing_review = await reviews_collection.find_one({"_id": ObjectId(review_id)})
    if not existing_review:
        raise HTTPException(status_code=404, detail="Review not found")

    await reviews_collection.delete_one({"_id": ObjectId(review_id)})

    await update_restaurant_rating_summary(existing_review["restaurant_id"])

    return {
        "message": "Review deleted successfully"
    }
