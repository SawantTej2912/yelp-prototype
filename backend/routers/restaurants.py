import os
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import get_db
from models.restaurant import Restaurant, RestaurantPhoto
from models.user import User
from schemas.restaurant import (
    RestaurantCreateRequest,
    RestaurantListResponse,
    RestaurantResponse,
    RestaurantUpdateRequest,
)
from utils.jwt import get_current_user

router = APIRouter(prefix="/restaurants", tags=["Restaurants"])

UPLOAD_DIR = Path(__file__).parent.parent / "uploads" / "restaurant_photos"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


# ─── Helper ──────────────────────────────────────────────────────────────────

def _to_list_response(r: Restaurant) -> RestaurantListResponse:
    cover = r.photos[0].photo_url if r.photos else None
    return RestaurantListResponse(
        id=r.id,
        name=r.name,
        cuisine_type=r.cuisine_type,
        city=r.city,
        state=r.state,
        pricing_tier=r.pricing_tier,
        avg_rating=float(r.avg_rating) if r.avg_rating is not None else None,
        review_count=r.review_count,
        cover_photo=cover,
    )


# ─── GET /restaurants — Search & Filter ──────────────────────────────────────

@router.get("", response_model=List[RestaurantListResponse])
def search_restaurants(
    q: Optional[str] = Query(None, description="Search by name, cuisine, or keywords"),
    city: Optional[str] = Query(None, description="Filter by city or zip"),
    cuisine: Optional[str] = Query(None, description="Filter by cuisine type"),
    pricing_tier: Optional[str] = Query(None, description="Filter by pricing tier ($, $$, $$$, $$$$)"),
    sort: Optional[str] = Query("rating", description="Sort: rating | review_count | newest"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Search and filter restaurants. All params are optional.

    - `q` — full-text keyword search across name, cuisine_type, description, amenities
    - `city` — matches city name or zip code
    - `cuisine` — partial match on cuisine_type
    - `pricing_tier` — exact match on $, $$, $$$, $$$$
    - `sort` — rating (default), review_count, newest
    """
    query = db.query(Restaurant)

    # Full-text keyword search across multiple columns
    if q:
        term = f"%{q}%"
        query = query.filter(
            or_(
                Restaurant.name.ilike(term),
                Restaurant.cuisine_type.ilike(term),
                Restaurant.description.ilike(term),
                Restaurant.city.ilike(term),
            )
        )

    # City / zip filter
    if city:
        term = f"%{city}%"
        query = query.filter(
            or_(Restaurant.city.ilike(term), Restaurant.zip.ilike(term))
        )

    # Cuisine filter
    if cuisine:
        query = query.filter(Restaurant.cuisine_type.ilike(f"%{cuisine}%"))

    # Pricing tier filter
    if pricing_tier:
        query = query.filter(Restaurant.pricing_tier == pricing_tier)

    # Sorting
    if sort == "review_count":
        query = query.order_by(Restaurant.review_count.desc())
    elif sort == "newest":
        query = query.order_by(Restaurant.created_at.desc())
    else:  # default: rating
        query = query.order_by(Restaurant.avg_rating.desc())

    restaurants = query.offset(offset).limit(limit).all()
    return [_to_list_response(r) for r in restaurants]


# ─── GET /restaurants/{id} — Details ─────────────────────────────────────────

@router.get("/{restaurant_id}", response_model=RestaurantResponse)
def get_restaurant(restaurant_id: int, db: Session = Depends(get_db)):
    """Get the full details of a single restaurant including all photos."""
    r = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    result = RestaurantResponse.model_validate(r)
    result.avg_rating = float(r.avg_rating) if r.avg_rating is not None else None
    return result


# ─── POST /restaurants — Create ───────────────────────────────────────────────

@router.post("", response_model=RestaurantResponse, status_code=status.HTTP_201_CREATED)
def create_restaurant(
    payload: RestaurantCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new restaurant listing. The logged-in user becomes `added_by`."""
    restaurant = Restaurant(
        name=payload.name,
        cuisine_type=payload.cuisine_type,
        address=payload.address,
        city=payload.city,
        state=payload.state,
        zip=payload.zip,
        description=payload.description,
        contact_info=payload.contact_info,
        hours=payload.hours,
        pricing_tier=payload.pricing_tier,
        amenities=payload.amenities,
        added_by=current_user.id,
    )
    db.add(restaurant)
    db.commit()
    db.refresh(restaurant)
    result = RestaurantResponse.model_validate(restaurant)
    result.avg_rating = float(restaurant.avg_rating) if restaurant.avg_rating is not None else None
    return result


# ─── PUT /restaurants/{id} — Update ──────────────────────────────────────────

@router.put("/{restaurant_id}", response_model=RestaurantResponse)
def update_restaurant(
    restaurant_id: int,
    payload: RestaurantUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a restaurant. Only the creator or owner can edit."""
    r = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    if r.added_by != current_user.id and r.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You don't have permission to edit this restaurant")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(r, field, value)

    db.commit()
    db.refresh(r)
    result = RestaurantResponse.model_validate(r)
    result.avg_rating = float(r.avg_rating) if r.avg_rating is not None else None
    return result


# ─── POST /restaurants/{id}/photos — Upload Photo ────────────────────────────

@router.post("/{restaurant_id}/photos", response_model=RestaurantResponse, status_code=status.HTTP_201_CREATED)
async def upload_restaurant_photo(
    restaurant_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a photo for a restaurant."""
    r = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, and WebP images are allowed")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds 10 MB limit")

    ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "jpg"
    filename = f"{restaurant_id}_{uuid.uuid4().hex}.{ext}"
    save_path = UPLOAD_DIR / filename

    with open(save_path, "wb") as f:
        f.write(contents)

    photo = RestaurantPhoto(
        restaurant_id=restaurant_id,
        photo_url=f"/uploads/restaurant_photos/{filename}",
        uploaded_by=current_user.id,
    )
    db.add(photo)
    db.commit()
    db.refresh(r)

    result = RestaurantResponse.model_validate(r)
    result.avg_rating = float(r.avg_rating) if r.avg_rating is not None else None
    return result
