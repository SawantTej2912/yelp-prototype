import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.user_preferences import UserPreferences
from schemas.user import (
    PreferencesResponse,
    PreferencesUpdateRequest,
    ProfileResponse,
    ProfileUpdateRequest,
)
from utils.jwt import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])

# Directory where uploaded profile pictures are saved
UPLOAD_DIR = Path(__file__).parent.parent / "uploads" / "profile_pics"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


# ─── GET /users/profile ───────────────────────────────────────────────────────

@router.get("/profile", response_model=ProfileResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    """Return the authenticated user's profile."""
    return ProfileResponse.model_validate(current_user)


# ─── PUT /users/profile ───────────────────────────────────────────────────────

@router.put("/profile", response_model=ProfileResponse)
def update_profile(
    payload: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update the authenticated user's profile fields.

    Only provided (non-None) fields are updated — unmentioned fields are
    left unchanged (partial update / PATCH semantics via PUT).
    """
    # Check email uniqueness if user wants to change it
    if payload.email and payload.email != current_user.email:
        existing = db.query(User).filter(User.email == payload.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This email is already in use",
            )

    update_data = payload.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)
    return ProfileResponse.model_validate(current_user)


# ─── POST /users/profile/picture ─────────────────────────────────────────────

@router.post("/profile/picture", response_model=ProfileResponse)
async def upload_profile_picture(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload and save a new profile picture for the authenticated user."""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image type: {file.content_type}. Allowed: JPEG, PNG, WebP, GIF",
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds the 5 MB limit",
        )

    # Delete old picture if it exists locally
    if current_user.profile_pic:
        old_path = UPLOAD_DIR / Path(current_user.profile_pic).name
        if old_path.exists():
            old_path.unlink()

    ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "jpg"
    filename = f"{current_user.id}_{uuid.uuid4().hex}.{ext}"
    save_path = UPLOAD_DIR / filename

    with open(save_path, "wb") as f:
        f.write(contents)

    current_user.profile_pic = f"/uploads/profile_pics/{filename}"
    db.commit()
    db.refresh(current_user)
    return ProfileResponse.model_validate(current_user)


# ─── GET /users/preferences ──────────────────────────────────────────────────

@router.get("/preferences", response_model=PreferencesResponse)
def get_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the user's AI assistant preferences.

    If no preferences row exists yet, a default one is created automatically.
    """
    prefs = (
        db.query(UserPreferences)
        .filter(UserPreferences.user_id == current_user.id)
        .first()
    )
    if not prefs:
        prefs = UserPreferences(user_id=current_user.id)
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    return PreferencesResponse.model_validate(prefs)


# ─── PUT /users/preferences ──────────────────────────────────────────────────

@router.put("/preferences", response_model=PreferencesResponse)
def update_preferences(
    payload: PreferencesUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create or update the user's AI assistant preferences (upsert)."""
    prefs = (
        db.query(UserPreferences)
        .filter(UserPreferences.user_id == current_user.id)
        .first()
    )
    if not prefs:
        prefs = UserPreferences(user_id=current_user.id)
        db.add(prefs)

    update_data = payload.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(prefs, field, value)

    db.commit()
    db.refresh(prefs)
    return PreferencesResponse.model_validate(prefs)
