from pydantic import BaseModel, field_validator
from typing import List, Optional
from datetime import datetime
from decimal import Decimal


# ─── Photo sub-schema ─────────────────────────────────────────────────────────

class RestaurantPhotoResponse(BaseModel):
    id: int
    photo_url: str
    uploaded_by: Optional[int] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ─── Create / Update ─────────────────────────────────────────────────────────

class RestaurantCreateRequest(BaseModel):
    name: str
    cuisine_type: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    description: Optional[str] = None
    contact_info: Optional[str] = None
    hours: Optional[str] = None
    pricing_tier: Optional[str] = None
    amenities: Optional[List[str]] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Restaurant name cannot be empty")
        return v.strip()

    @field_validator("pricing_tier")
    @classmethod
    def valid_tier(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("$", "$$", "$$$", "$$$$"):
            raise ValueError("pricing_tier must be one of: $, $$, $$$, $$$$")
        return v


class RestaurantUpdateRequest(BaseModel):
    name: Optional[str] = None
    cuisine_type: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    description: Optional[str] = None
    contact_info: Optional[str] = None
    hours: Optional[str] = None
    pricing_tier: Optional[str] = None
    amenities: Optional[List[str]] = None


# ─── Response ────────────────────────────────────────────────────────────────

class RestaurantResponse(BaseModel):
    id: int
    name: str
    cuisine_type: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    description: Optional[str] = None
    contact_info: Optional[str] = None
    hours: Optional[str] = None
    pricing_tier: Optional[str] = None
    amenities: Optional[List[str]] = None
    added_by: Optional[int] = None
    owner_id: Optional[int] = None
    avg_rating: Optional[float] = None
    review_count: Optional[int] = None
    created_at: Optional[datetime] = None
    photos: List[RestaurantPhotoResponse] = []

    model_config = {"from_attributes": True}


class RestaurantListResponse(BaseModel):
    """Slimmed-down card view for search results."""
    id: int
    name: str
    cuisine_type: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pricing_tier: Optional[str] = None
    avg_rating: Optional[float] = None
    review_count: Optional[int] = None
    cover_photo: Optional[str] = None   # first photo URL or None

    model_config = {"from_attributes": True}
