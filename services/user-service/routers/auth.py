from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from database import users_collection, sessions_collection
from utils.password import hash_password, verify_password
from bson import ObjectId
import uuid

router = APIRouter()

SESSION_DURATION_HOURS = 24


class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "user"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


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
        "created_at": datetime.utcnow()
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
            "role": user.get("role", "user")
        },
        "expires_at": expires_at.isoformat()
    }
