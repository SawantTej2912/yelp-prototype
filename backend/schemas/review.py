from pydantic import BaseModel, field_validator
from typing import List, Optional
from datetime import datetime


# ─── Sub-schemas ─────────────────────────────────────────────────────────────

class ReviewPhotoResponse(BaseModel):
    id: int
    photo_url: str

    model_config = {"from_attributes": True}


class ReviewerInfo(BaseModel):
    """Slim user info embedded within a review response."""
    id: int
    name: str
    profile_pic: Optional[str] = None

    model_config = {"from_attributes": True}


# ─── Request schemas ──────────────────────────────────────────────────────────

class ReviewCreateRequest(BaseModel):
    """
    Create a new review.
    - rating: 1–5 stars (required)
    - comment: text body (optional)
    """
    rating: int
    comment: Optional[str] = None

    @field_validator("rating")
    @classmethod
    def valid_rating(cls, v: int) -> int:
        if v < 1 or v > 5:
            raise ValueError("Rating must be between 1 and 5")
        return v


class ReviewUpdateRequest(BaseModel):
    """
    Update an existing review. Both fields are optional — only provided
    fields are updated.
    """
    rating: Optional[int] = None
    comment: Optional[str] = None

    @field_validator("rating")
    @classmethod
    def valid_rating(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and (v < 1 or v > 5):
            raise ValueError("Rating must be between 1 and 5")
        return v


# ─── Response schemas ─────────────────────────────────────────────────────────

class ReviewResponse(BaseModel):
    id: int
    user_id: int
    restaurant_id: int
    rating: int
    comment: Optional[str] = None
    review_date: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    photos: List[ReviewPhotoResponse] = []
    user: Optional[ReviewerInfo] = None

    model_config = {"from_attributes": True}


# ─── Favorites schemas ────────────────────────────────────────────────────────

class FavoriteRestaurantResponse(BaseModel):
    """A favorite entry with embedded slim restaurant info."""
    restaurant_id: int
    created_at: Optional[datetime] = None
    restaurant_name: Optional[str] = None
    restaurant_cuisine: Optional[str] = None
    restaurant_city: Optional[str] = None
    restaurant_rating: Optional[float] = None
    restaurant_cover: Optional[str] = None

    model_config = {"from_attributes": True}
