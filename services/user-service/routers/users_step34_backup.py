from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from database import users_collection
from bson import ObjectId
from datetime import datetime

router = APIRouter()


class UserPreferences(BaseModel):
    cuisine_prefs: Optional[List[str]] = []
    price_range: Optional[str] = ""
    dietary_needs: Optional[List[str]] = []
    ambiance_prefs: Optional[List[str]] = []
    preferred_location: Optional[str] = ""
    search_radius: Optional[int] = 10
    sort_preference: Optional[str] = "rating"


class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    profile_pic: Optional[str] = None
    about_me: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    role: Optional[str] = None


def serialize_user(user):
    return {
        "id": str(user["_id"]),
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "role": user.get("role", "user"),
        "phone": user.get("phone", ""),
        "profile_pic": user.get("profile_pic", ""),
        "about_me": user.get("about_me", ""),
        "city": user.get("city", ""),
        "state": user.get("state", ""),
        "country": user.get("country", ""),
        "preferences": user.get("preferences", {
            "cuisine_prefs": [],
            "price_range": "",
            "dietary_needs": [],
            "ambiance_prefs": [],
            "preferred_location": "",
            "search_radius": 10,
            "sort_preference": "rating"
        }),
        "created_at": user.get("created_at").isoformat() if user.get("created_at") else None,
        "updated_at": user.get("updated_at").isoformat() if user.get("updated_at") else None
    }


@router.get("/")
async def get_all_users():
    users = []
    async for user in users_collection.find():
        users.append(serialize_user(user))
    return users


@router.get("/{user_id}")
async def get_user_by_id(user_id: str):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user id")

    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return serialize_user(user)


@router.put("/{user_id}")
async def update_user_profile(user_id: str, payload: UserProfileUpdate):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user id")

    existing_user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = {k: v for k, v in payload.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()

    await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )

    updated_user = await users_collection.find_one({"_id": ObjectId(user_id)})
    return {
        "message": "User profile updated successfully",
        "user": serialize_user(updated_user)
    }


@router.get("/{user_id}/preferences")
async def get_user_preferences(user_id: str):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user id")

    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "user_id": user_id,
        "preferences": user.get("preferences", {
            "cuisine_prefs": [],
            "price_range": "",
            "dietary_needs": [],
            "ambiance_prefs": [],
            "preferred_location": "",
            "search_radius": 10,
            "sort_preference": "rating"
        })
    }


@router.put("/{user_id}/preferences")
async def update_user_preferences(user_id: str, payload: UserPreferences):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user id")

    existing_user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")

    await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$set": {
                "preferences": payload.dict(),
                "updated_at": datetime.utcnow()
            }
        }
    )

    updated_user = await users_collection.find_one({"_id": ObjectId(user_id)})

    return {
        "message": "User preferences updated successfully",
        "user": serialize_user(updated_user)
    }
