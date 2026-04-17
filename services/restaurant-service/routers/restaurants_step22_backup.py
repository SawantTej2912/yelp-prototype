from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from bson import ObjectId
from database import restaurants_collection, favorites_collection

router = APIRouter()


class RestaurantCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    cuisine_type: Optional[str] = ""
    address: Optional[str] = ""
    city: Optional[str] = ""
    state: Optional[str] = ""
    zip_code: Optional[str] = ""
    contact_info: Optional[str] = ""
    hours: Optional[str] = ""
    pricing_tier: Optional[str] = ""
    amenities: Optional[List[str]] = []
    owner_id: Optional[str] = ""
    added_by: Optional[str] = ""


class RestaurantUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    cuisine_type: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    contact_info: Optional[str] = None
    hours: Optional[str] = None
    pricing_tier: Optional[str] = None
    amenities: Optional[List[str]] = None
    owner_id: Optional[str] = None
    added_by: Optional[str] = None


class FavoriteRequest(BaseModel):
    user_id: str
    restaurant_id: str


def serialize_restaurant(restaurant):
    return {
        "id": str(restaurant["_id"]),
        "name": restaurant.get("name", ""),
        "description": restaurant.get("description", ""),
        "cuisine_type": restaurant.get("cuisine_type", ""),
        "address": restaurant.get("address", ""),
        "city": restaurant.get("city", ""),
        "state": restaurant.get("state", ""),
        "zip_code": restaurant.get("zip_code", ""),
        "contact_info": restaurant.get("contact_info", ""),
        "hours": restaurant.get("hours", ""),
        "pricing_tier": restaurant.get("pricing_tier", ""),
        "amenities": restaurant.get("amenities", []),
        "owner_id": restaurant.get("owner_id", ""),
        "added_by": restaurant.get("added_by", ""),
        "avg_rating": restaurant.get("avg_rating", 0),
        "review_count": restaurant.get("review_count", 0),
        "view_count": restaurant.get("view_count", 0),
        "photos": restaurant.get("photos", []),
        "activity_logs": restaurant.get("activity_logs", []),
        "created_at": restaurant.get("created_at").isoformat() if restaurant.get("created_at") else None,
        "updated_at": restaurant.get("updated_at").isoformat() if restaurant.get("updated_at") else None
    }


@router.post("/")
async def create_restaurant(payload: RestaurantCreate):
    restaurant_doc = {
        "name": payload.name,
        "description": payload.description,
        "cuisine_type": payload.cuisine_type,
        "address": payload.address,
        "city": payload.city,
        "state": payload.state,
        "zip_code": payload.zip_code,
        "contact_info": payload.contact_info,
        "hours": payload.hours,
        "pricing_tier": payload.pricing_tier,
        "amenities": payload.amenities,
        "owner_id": payload.owner_id,
        "added_by": payload.added_by,
        "avg_rating": 0,
        "review_count": 0,
        "view_count": 0,
        "photos": [],
        "activity_logs": [],
        "created_at": datetime.utcnow(),
        "updated_at": None
    }

    result = await restaurants_collection.insert_one(restaurant_doc)
    created_restaurant = await restaurants_collection.find_one({"_id": result.inserted_id})

    return {
        "message": "Restaurant created successfully",
        "restaurant": serialize_restaurant(created_restaurant)
    }


@router.get("/")
async def get_all_restaurants(
    name: Optional[str] = Query(None),
    cuisine_type: Optional[str] = Query(None),
    city: Optional[str] = Query(None)
):
    query = {}

    if name:
        query["name"] = {"$regex": name, "$options": "i"}
    if cuisine_type:
        query["cuisine_type"] = {"$regex": cuisine_type, "$options": "i"}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}

    restaurants = []
    async for restaurant in restaurants_collection.find(query):
        restaurants.append(serialize_restaurant(restaurant))
    return restaurants


@router.get("/{restaurant_id}")
async def get_restaurant_by_id(restaurant_id: str):
    if not ObjectId.is_valid(restaurant_id):
        raise HTTPException(status_code=400, detail="Invalid restaurant id")

    restaurant = await restaurants_collection.find_one({"_id": ObjectId(restaurant_id)})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    return serialize_restaurant(restaurant)


@router.put("/{restaurant_id}")
async def update_restaurant(restaurant_id: str, payload: RestaurantUpdate):
    if not ObjectId.is_valid(restaurant_id):
        raise HTTPException(status_code=400, detail="Invalid restaurant id")

    existing_restaurant = await restaurants_collection.find_one({"_id": ObjectId(restaurant_id)})
    if not existing_restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    update_data = {k: v for k, v in payload.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()

    await restaurants_collection.update_one(
        {"_id": ObjectId(restaurant_id)},
        {"$set": update_data}
    )

    updated_restaurant = await restaurants_collection.find_one({"_id": ObjectId(restaurant_id)})

    return {
        "message": "Restaurant updated successfully",
        "restaurant": serialize_restaurant(updated_restaurant)
    }


@router.post("/favorites")
async def add_favorite(payload: FavoriteRequest):
    if not ObjectId.is_valid(payload.restaurant_id):
        raise HTTPException(status_code=400, detail="Invalid restaurant id")

    restaurant = await restaurants_collection.find_one({"_id": ObjectId(payload.restaurant_id)})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    existing_favorite = await favorites_collection.find_one({
        "user_id": payload.user_id,
        "restaurant_id": payload.restaurant_id
    })

    if existing_favorite:
        raise HTTPException(status_code=400, detail="Restaurant already favorited")

    favorite_doc = {
        "user_id": payload.user_id,
        "restaurant_id": payload.restaurant_id,
        "created_at": datetime.utcnow()
    }

    await favorites_collection.insert_one(favorite_doc)

    return {
        "message": "Restaurant added to favorites"
    }


@router.delete("/favorites")
async def remove_favorite(payload: FavoriteRequest):
    favorite = await favorites_collection.find_one({
        "user_id": payload.user_id,
        "restaurant_id": payload.restaurant_id
    })

    if not favorite:
        raise HTTPException(status_code=404, detail="Favorite not found")

    await favorites_collection.delete_one({
        "user_id": payload.user_id,
        "restaurant_id": payload.restaurant_id
    })

    return {
        "message": "Restaurant removed from favorites"
    }


@router.get("/favorites/{user_id}")
async def get_user_favorites(user_id: str):
    favorite_restaurant_ids = []

    async for favorite in favorites_collection.find({"user_id": user_id}):
        favorite_restaurant_ids.append(favorite["restaurant_id"])

    restaurants = []
    for restaurant_id in favorite_restaurant_ids:
        if ObjectId.is_valid(restaurant_id):
            restaurant = await restaurants_collection.find_one({"_id": ObjectId(restaurant_id)})
            if restaurant:
                restaurants.append(serialize_restaurant(restaurant))

    return {
        "user_id": user_id,
        "favorites": restaurants
    }
