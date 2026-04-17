from pydantic import BaseModel, EmailStr, field_validator
from typing import List, Optional
from datetime import datetime


# ─── Profile Schemas ─────────────────────────────────────────────────────────

class ProfileUpdateRequest(BaseModel):
    """Fields the user can update on their profile."""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    about_me: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    languages: Optional[str] = None
    gender: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip() if v else v


class ProfileResponse(BaseModel):
    id: int
    name: str
    email: str
    role: Optional[str] = None
    profile_pic: Optional[str] = None
    phone: Optional[str] = None
    about_me: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    languages: Optional[str] = None
    gender: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ─── Preferences Schemas ─────────────────────────────────────────────────────

class PreferencesUpdateRequest(BaseModel):
    cuisine_prefs: Optional[List[str]] = None
    price_range: Optional[str] = None
    dietary_needs: Optional[List[str]] = None
    ambiance_prefs: Optional[List[str]] = None
    preferred_location: Optional[str] = None
    search_radius: Optional[int] = None
    sort_preference: Optional[str] = None

    @field_validator("price_range")
    @classmethod
    def valid_price(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("$", "$$", "$$$", "$$$$"):
            raise ValueError("price_range must be one of: $, $$, $$$, $$$$")
        return v

    @field_validator("sort_preference")
    @classmethod
    def valid_sort(cls, v: Optional[str]) -> Optional[str]:
        allowed = {"rating", "distance", "popularity", "price"}
        if v is not None and v not in allowed:
            raise ValueError(f"sort_preference must be one of: {', '.join(allowed)}")
        return v


class PreferencesResponse(BaseModel):
    id: int
    user_id: int
    cuisine_prefs: Optional[List[str]] = None
    price_range: Optional[str] = None
    dietary_needs: Optional[List[str]] = None
    ambiance_prefs: Optional[List[str]] = None
    preferred_location: Optional[str] = None
    search_radius: Optional[int] = None
    sort_preference: Optional[str] = None

    model_config = {"from_attributes": True}
