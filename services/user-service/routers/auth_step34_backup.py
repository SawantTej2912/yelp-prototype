from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from database import users_collection, sessions_collection
from utils.password import hash_password, verify_password
import uuid

router = APIRouter()

SESSION_DURATION_HOURS = 24

DEFAULT_PREFERENCES = {
    "cuisine_prefs": [],
    "price_range": "",
    "dietary_needs": [],
    "ambiance_prefs": [],
    "preferred_location": "",
    "search_radius": 10,
    "sort_preference": "rating"
}


class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "user"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LogoutRequest(BaseModel):
    token: str


@router.post("/signup")
async def signup(payload: SignupRequest):
    existing_user = await users_collection.find_one({"email": payload.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_doc = {
        "name": payload.name,
        "email": payload.email,
        "password_hash": hash_password(payload.password),
        "role": payload.role,
        "phone": "",
        "profile_pic": "",
        "about_me": "",
        "city": "",
        "state": "",
        "country": "",
        "preferences": DEFAULT_PREFERENCES,
        "created_at": datetime.utcnow(),
        "updated_at": None
    }

    result = await users_collection.insert_one(user_doc)

    return {
        "message": "User created successfully",
        "user_id": str(result.inserted_id)
    }


@router.post("/login")
async def login(payload: LoginRequest):
    user = await users_collection.find_one({"email": payload.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    expires_at = datetime.utcnow() + timedelta(hours=SESSION_DURATION_HOURS)
    session_token = str(uuid.uuid4())

    session_doc = {
        "user_id": str(user["_id"]),
        "token": session_token,
        "created_at": datetime.utcnow(),
        "expires_at": expires_at
    }

    await sessions_collection.insert_one(session_doc)

    return {
        "message": "Login successful",
        "token": session_token,
        "user": {
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "role": user.get("role", "user"),
            "preferences": user.get("preferences", DEFAULT_PREFERENCES)
        },
        "expires_at": expires_at.isoformat()
    }


@router.post("/logout")
async def logout(payload: LogoutRequest):
    session = await sessions_collection.find_one({"token": payload.token})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    await sessions_collection.delete_one({"token": payload.token})

    return {
        "message": "Logout successful"
    }


@router.get("/session/{token}")
async def get_session(token: str):
    session = await sessions_collection.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "user_id": session["user_id"],
        "token": session["token"],
        "created_at": session["created_at"].isoformat() if session.get("created_at") else None,
        "expires_at": session["expires_at"].isoformat() if session.get("expires_at") else None
    }
